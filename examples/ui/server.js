import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { streamText } from "ai";
import { goose, exportSession } from "../../dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = path.join(__dirname, "static");
const PORT = process.env.PORT || 5678;

// MIME types for static files
const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

// In-memory session store
const sessions = new Map();

// Send SSE event
function sendSSE(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// Parse JSON body from request
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

// Serve static files
function serveStatic(req, res) {
  // Parse URL to handle query parameters
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  let filePath = path.join(
    STATIC_DIR,
    pathname === "/" ? "index.html" : pathname
  );

  // Prevent directory traversal
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404);
        res.end("Not Found");
      } else {
        res.writeHead(500);
        res.end("Internal Server Error");
      }
      return;
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

// Handle GET /session/:id - export session history
function handleGetSession(req, res, sessionId) {
  try {
    const messages = exportSession(sessionId);
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ messages }));
  } catch (error) {
    // Session doesn't exist yet, return empty messages
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ messages: [] }));
  }
}

// Handle POST /session - create a new session
async function handleCreateSession(req, res) {
  try {
    const body = await parseBody(req);
    const sessionId = body.sessionId || randomUUID();
    const token = randomUUID();

    sessions.set(sessionId, {
      token,
      createdAt: Date.now(),
      resume: false,
    });

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ sessionId, token }));
  } catch (error) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  }
}

// Handle POST /stream/:sessionId - stream goose response
async function handleStream(req, res, sessionId) {
  // Parse token from query string
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  // Validate session
  const session = sessions.get(sessionId);
  if (!session || session.token !== token) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid session or token" }));
    return;
  }

  try {
    const body = await parseBody(req);
    const { prompt, system, resume, provider, model, apiKey, maxTurns } = body;

    if (!prompt) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "prompt is required" }));
      return;
    }

    // Set up SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    // Build goose settings - provider/model/apiKey can be passed in request
    // or configured via environment variables
    const shouldResume = resume ?? session.resume;
    console.log(`[Stream] sessionId=${sessionId}, resume=${shouldResume}, body.resume=${resume}, session.resume=${session.resume}`);
    
    const settings = {
      sessionName: sessionId,
      resume: shouldResume,
      // Provider settings (optional - goose uses its own config if not set)
      provider: provider || process.env.GOOSE_PROVIDER,
      model: model || process.env.GOOSE_MODEL,
      apiKey: apiKey,
      maxTurns: maxTurns ? Number(maxTurns) : undefined,
    };

    // Stream from goose
    const result = streamText({
      model: goose("goose", settings),
      prompt,
      system,
    });

    // Mark session as resumable after first message
    session.resume = true;

    // Stream full AI SDK stream parts
    for await (const part of result.fullStream) {
      // console.log("part", JSON.stringify(part, null, 2));
      sendSSE(res, "message", part);
    }

    // Send finish event
    sendSSE(res, "message", { type: "finish", finishReason: "stop" });
    res.end();
  } catch (error) {
    console.error("Stream error:", error);
    sendSSE(res, "message", { type: "error", error: error.message });
    res.end();
  }
}

// Main request handler
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  // API routes
  if (pathname === "/session" && req.method === "POST") {
    return handleCreateSession(req, res);
  }

  // GET /session/:id - export session history
  const sessionMatch = pathname.match(/^\/session\/([^/]+)$/);
  if (sessionMatch && req.method === "GET") {
    return handleGetSession(req, res, sessionMatch[1]);
  }

  const streamMatch = pathname.match(/^\/stream\/([^/]+)$/);
  if (streamMatch && req.method === "POST") {
    return handleStream(req, res, streamMatch[1]);
  }

  // Static files
  if (req.method === "GET") {
    return serveStatic(req, res);
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Serving static files from ${STATIC_DIR}`);
});
