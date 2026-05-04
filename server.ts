import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import admin from "firebase-admin";

// Define PORT
const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Initialize Firebase Admin (lazy setup for safety)
  if (process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }

  // --- API Routes ---
  
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  /**
   * ROBUST API V1
   * Designed for insurance providers, research institutions, and partner hospitals.
   */
  const apiV1 = express.Router();

  // Middleware to simulate API Key validation
  apiV1.use((req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      // In a real app, we'd check against a DB. For now, we allow read-only public access or mocked keys.
      if (req.method === 'GET') return next();
      return res.status(401).json({ error: "API Key required for write operations" });
    }
    next();
  });

  // GET Platform aggregate health statistics
  apiV1.get("/stats", async (req, res) => {
    res.json({
      active_patients: 1240,
      active_doctors: 85,
      total_consultations: 5600,
      ai_diagnoses_delivered: 42000,
      system_status: "Operational",
      last_updated: new Date().toISOString()
    });
  });

  // GET Anonymized trend data (Mocked)
  apiV1.get("/trends/population", async (req, res) => {
    res.json({
      region: "Global",
      data: [
        { month: "Jan", avg_heart_rate: 72, avg_daily_steps: 6400 },
        { month: "Feb", avg_heart_rate: 71, avg_daily_steps: 6800 },
        { month: "Mar", avg_heart_rate: 70, avg_daily_steps: 7200 },
        { month: "Apr", avg_heart_rate: 72, avg_daily_steps: 8100 },
      ]
    });
  });

  // POST External notification to VitalSource (Partner integration)
  apiV1.post("/external/alert", async (req, res) => {
    const { source, severity, message } = req.body;
    console.log(`[EXTERNAL ALERT] from ${source}: ${message} (${severity})`);
    res.json({ status: "received", alert_id: Math.random().toString(36).substr(2, 9) });
  });

  app.use("/api/v1", apiV1);

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
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
    console.log(`VitalSource Server running on http://localhost:${PORT}`);
  });
}

startServer();
