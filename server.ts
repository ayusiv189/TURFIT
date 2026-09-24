import express from "express";
import path from "path";
import { startServerNotificationTrigger } from "./serverNotificationTrigger";
import { startServerChatCleanupCron, cleanupExpiredConversations } from "./serverChatCleaner";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Manual or webhook cleanup endpoint for 24h expired direct conversations
  app.post("/api/chat/cleanup-expired", async (req, res) => {
    try {
      const result = await cleanupExpiredConversations();
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "Failed to cleanup conversations" });
    }
  });

  app.get("/api/chat/cleanup-expired", async (req, res) => {
    try {
      const result = await cleanupExpiredConversations();
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "Failed to cleanup conversations" });
    }
  });

  // Vite middleware for dev / static serving for prod
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    // Start the server-side notifications trigger after port binding is successful
    try {
      startServerNotificationTrigger();
    } catch (e) {
      console.error("Failed to start background notification trigger:", e);
    }
    // Start automated 24-hour expired chat cleanup cron
    try {
      startServerChatCleanupCron();
    } catch (e) {
      console.error("Failed to start background chat cleanup cron:", e);
    }
  });
}

startServer();
