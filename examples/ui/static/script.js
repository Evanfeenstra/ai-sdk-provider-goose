// SSE connection and chat functionality
const GOOSE_URL = "http://localhost:5678";
let eventSource = null;
let sessionId = getSessionId();
let sessionToken = null;
let isConnected = false;
let isFirstMessage = true;

// DOM elements
const messagesContainer = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const sessionIdElement = document.getElementById("session-id");
const newSessionButton = document.getElementById("new-session-btn");

// Track if we're currently processing
let isProcessing = false;

// Get session ID - either from URL parameter, injected session name, or generate new one
function getSessionId() {
  // Check if session name was injected by server (for /session/:name routes)
  if (window.GOOSE_SESSION_NAME) {
    return window.GOOSE_SESSION_NAME;
  }

  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const sessionParam = urlParams.get("session") || urlParams.get("name");
  if (sessionParam) {
    return sessionParam;
  }

  // Generate new session ID using CLI format
  return generateSessionId();
}

// Generate a session ID using timestamp format (yyyymmdd_hhmmss) like CLI
function generateSessionId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}_${hour}${minute}${second}`;
}

// Format timestamp
function formatTimestamp(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Create message element
function createMessageElement(content, role, timestamp) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${role}`;

  // Create content div
  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  contentDiv.innerHTML = formatMessageContent(content);
  messageDiv.appendChild(contentDiv);

  // Add timestamp
  const timestampDiv = document.createElement("div");
  timestampDiv.className = "timestamp";
  timestampDiv.textContent = formatTimestamp(new Date(timestamp || Date.now()));
  messageDiv.appendChild(timestampDiv);

  return messageDiv;
}

// Format message content (handle markdown-like formatting)
function formatMessageContent(content) {
  // Handle undefined or null content
  if (!content) {
    return "";
  }

  // Escape HTML
  let formatted = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Handle code blocks
  formatted = formatted.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    (match, lang, code) => {
      return `<pre><code class="language-${
        lang || "plaintext"
      }">${code.trim()}</code></pre>`;
    }
  );

  // Handle inline code
  formatted = formatted.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Handle line breaks
  formatted = formatted.replace(/\n/g, "<br>");

  return formatted;
}

// Add message to chat
function addMessage(content, role, timestamp) {
  // Remove welcome message if it exists
  const welcomeMessage = messagesContainer.querySelector(".welcome-message");
  if (welcomeMessage) {
    welcomeMessage.remove();
  }

  const messageElement = createMessageElement(content, role, timestamp);
  messagesContainer.appendChild(messageElement);

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Add thinking indicator
function addThinkingIndicator() {
  removeThinkingIndicator(); // Remove any existing one first

  const thinkingDiv = document.createElement("div");
  thinkingDiv.id = "thinking-indicator";
  thinkingDiv.className = "message thinking-message";
  thinkingDiv.innerHTML = `
        <div class="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
        <span class="thinking-text">goose is thinking...</span>
    `;
  messagesContainer.appendChild(thinkingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Remove thinking indicator
function removeThinkingIndicator() {
  const thinking = document.getElementById("thinking-indicator");
  if (thinking) {
    thinking.remove();
  }
}

// Update session ID in URL
function updateUrlWithSession() {
  const url = new URL(window.location.href);
  url.searchParams.set("session", sessionId);
  window.history.replaceState({}, "", url.toString());
}

// Update session display in header
function updateSessionDisplay() {
  sessionIdElement.textContent = sessionId;
}

// Start a new session
function startNewSession() {
  // Generate new session ID
  sessionId = generateSessionId();
  sessionToken = null;

  // Update URL and display
  updateUrlWithSession();
  updateSessionDisplay();

  // Clear messages
  messagesContainer.innerHTML = `
    <div class="welcome-message">
      <h2>Welcome to goose!</h2>
      <p>I'm your AI coding assistant. How can I help you today?</p>

      <div class="suggestion-pills">
        <div
          class="suggestion-pill"
          onclick="sendSuggestion('What can you do?')"
        >
          What can you do?
        </div>
        <div
          class="suggestion-pill"
          onclick="sendSuggestion('List files in my current directory')"
        >
          List files in my current directory
        </div>
        <div
          class="suggestion-pill"
          onclick="sendSuggestion('Write an asteroids game in a single HTML file')"
        >
          Write an asteroids game in a single HTML file
        </div>
      </div>
    </div>
  `;

  // Reset state
  currentStreamingMessage = null;
  isProcessing = false;
  isFirstMessage = true;
  resetSendButton();

  // Focus input
  messageInput.focus();
}

// Initialize connection (creates session but doesn't start streaming yet)
async function initializeConnection() {
  try {
    // For now, just mark as ready - session created when first message sent
    isConnected = true;
    updateSessionDisplay();
    updateUrlWithSession();
    sendButton.disabled = false;
  } catch (error) {
    console.error("Connection initialization error:", error);
    sessionIdElement.textContent = "Error";
  }
}

// Create session and get token (called before streaming)
async function createSession() {
  try {
    const response = await fetch(`${GOOSE_URL}/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer your-password", // You'll need to configure this
      },
      body: JSON.stringify({
        sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.status}`);
    }

    const data = await response.json();
    sessionToken = data.token;

    // Update URL with session ID after session is created
    updateUrlWithSession();

    return data;
  } catch (error) {
    console.error("Failed to create session:", error);
    throw error;
  }
}

// Handle messages from server (AI SDK stream format)
function handleServerMessage(data) {
  switch (data.type) {
    case "text-delta":
      handleTextDelta(data);
      break;
    case "tool-call":
      handleToolCall(data);
      break;
    case "tool-result":
      handleToolResult(data);
      break;
    case "finish":
      handleFinish(data);
      break;
    case "error":
      removeThinkingIndicator();
      resetSendButton();
      addMessage(`Error: ${data.error}`, "assistant", Date.now());
      break;
    default:
      console.log("Unknown stream part type:", data.type);
  }
}

// Track current streaming message
let currentStreamingMessage = null;

// Handle text deltas from AI SDK
function handleTextDelta(data) {
  removeThinkingIndicator();

  // Get the text content - AI SDK uses "text" property for text-delta events
  const textContent = data.text || data.textDelta || "";

  // Validate that we have text content
  if (!textContent) {
    console.warn("Received text-delta event without text content:", data);
    return;
  }

  // If this is the first chunk of a new message
  if (!currentStreamingMessage) {
    // Create a new message element
    const messageElement = createMessageElement(
      textContent,
      "assistant",
      Date.now()
    );
    messageElement.setAttribute("data-streaming", "true");
    messagesContainer.appendChild(messageElement);

    currentStreamingMessage = {
      element: messageElement,
      content: textContent,
      role: "assistant",
      timestamp: Date.now(),
    };
  } else {
    // Append to existing streaming message
    currentStreamingMessage.content += textContent;

    // Update the message content using the proper content div
    const contentDiv =
      currentStreamingMessage.element.querySelector(".message-content");
    if (contentDiv) {
      contentDiv.innerHTML = formatMessageContent(
        currentStreamingMessage.content
      );
    }
  }

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Handle tool calls from AI SDK
function handleToolCall(data) {
  removeThinkingIndicator();

  // Reset streaming message so tool doesn't interfere with message flow
  currentStreamingMessage = null;

  const toolDiv = document.createElement("div");
  toolDiv.className = "message assistant tool-message";
  toolDiv.id = `tool-${data.toolCallId}`;

  const headerDiv = document.createElement("div");
  headerDiv.className = "tool-header";
  headerDiv.innerHTML = `🔧 <strong>${data.toolName}</strong>`;

  const contentDiv = document.createElement("div");
  contentDiv.className = "tool-content";
  // AI SDK uses "input" property, not "args"
  const toolInput = data.input || data.args || {};
  contentDiv.innerHTML = `<pre><code>${JSON.stringify(
    toolInput,
    null,
    2
  )}</code></pre>`;

  toolDiv.appendChild(headerDiv);
  toolDiv.appendChild(contentDiv);

  // Add a "running" indicator
  const runningDiv = document.createElement("div");
  runningDiv.className = "tool-running";
  runningDiv.innerHTML = "⏳ Running...";
  toolDiv.appendChild(runningDiv);

  messagesContainer.appendChild(toolDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Handle tool results from AI SDK
function handleToolResult(data) {
  // Find the corresponding tool call message
  const toolMessage = document.getElementById(`tool-${data.toolCallId}`);
  if (toolMessage) {
    const runningIndicator = toolMessage.querySelector(".tool-running");
    if (runningIndicator) {
      runningIndicator.remove();
    }
  }

  // Add result message
  const resultDiv = document.createElement("div");
  resultDiv.className = "message tool-result";
  // AI SDK uses "output" property, not "result"
  const toolOutput = data.output || data.result || "";
  // Format the output - if it's already a string, use it directly, otherwise stringify
  const formattedOutput =
    typeof toolOutput === "string"
      ? toolOutput
      : JSON.stringify(toolOutput, null, 2);
  resultDiv.innerHTML = `<pre>${escapeHtml(formattedOutput)}</pre>`;
  messagesContainer.appendChild(resultDiv);

  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Reset streaming message so next assistant response creates a new message
  currentStreamingMessage = null;
}

// Handle finish from AI SDK
function handleFinish(data) {
  removeThinkingIndicator();
  resetSendButton();

  // Finalize any streaming message
  if (currentStreamingMessage) {
    currentStreamingMessage.element.removeAttribute("data-streaming");
    currentStreamingMessage = null;
  }

  // Close the SSE connection
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  console.log("Stream finished:", data.finishReason);
}

// Reset send button to normal state
function resetSendButton() {
  isProcessing = false;
  sendButton.textContent = "Send";
  sendButton.classList.remove("cancel-mode");
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Send message and start SSE stream
async function sendMessage() {
  if (isProcessing) {
    // Close the current stream
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    removeThinkingIndicator();
    resetSendButton();
    return;
  }

  const message = messageInput.value.trim();
  if (!message || !isConnected) return;

  // Add user message to chat
  addMessage(message, "user", Date.now());

  // Clear input
  messageInput.value = "";
  messageInput.style.height = "auto";

  // Add thinking indicator
  addThinkingIndicator();

  // Update button to show cancel
  isProcessing = true;
  sendButton.textContent = "Cancel";
  sendButton.classList.add("cancel-mode");

  try {
    // Create session if we don't have a token yet
    if (!sessionToken) {
      await createSession();
    }

    // Start SSE stream
    const streamUrl = `${GOOSE_URL}/stream/${sessionId}?token=${encodeURIComponent(
      sessionToken
    )}`;

    // Use fetch to POST the message and get SSE stream
    const response = await fetch(streamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: "demo-user",
        prompt: message,
        system: "You are a helpful AI assistant.",
        session: sessionId,
        resume: !isFirstMessage,
      }),
    });
    
    console.log(`[Client] Sent message with resume=${!isFirstMessage}, isFirstMessage=${isFirstMessage}`);

    if (!response.ok) {
      throw new Error(`Stream request failed: ${response.status}`);
    }

    // Read the SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          // Parse the event type (we're using 'message' for all events)
          continue;
        } else if (line.startsWith("data:")) {
          const data = line.slice(5).trim();
          if (data) {
            try {
              const parsedData = JSON.parse(data);
              handleServerMessage(parsedData);
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }
    }

    // Stream complete
    handleFinish({ finishReason: "stop" });

    // Mark that we've sent at least one message
    isFirstMessage = false;
  } catch (error) {
    console.error("Failed to send message:", error);
    removeThinkingIndicator();
    resetSendButton();
    addMessage(`Error: ${error.message}`, "assistant", Date.now());
  }
}

// Handle suggestion pill clicks
function sendSuggestion(text) {
  if (!isConnected || isProcessing) return;

  messageInput.value = text;
  sendMessage();
}

// Event listeners
sendButton.addEventListener("click", sendMessage);
newSessionButton.addEventListener("click", startNewSession);

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea
messageInput.addEventListener("input", () => {
  messageInput.style.height = "auto";
  messageInput.style.height = messageInput.scrollHeight + "px";
});

// Initialize connection
void initializeConnection();

// Read 'q' parameter from URL and set it to the message input
function getQueryParam() {
  const urlParams = new URLSearchParams(window.location.search);
  const queryParam = urlParams.get("q");
  if (queryParam) {
    messageInput.value = queryParam;
    urlParams.delete("q");

    let newUrl = window.location.pathname;
    if (urlParams.toString()) {
      newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    }
    window.history.replaceState({}, "", newUrl);
  }
}

getQueryParam();

// Focus on input
messageInput.focus();
