import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import fs from "fs";

import sequelize from "./config/database";
import router from "./routes";
import { startDriverReminders } from "./services/reminderService";
import { initWebPush } from "./services/webPushService";
import { SystemConfig } from "./models/SystemConfig";
import { GlobalConfig, GLOBAL_CONFIG_DEFAULTS } from "./models/GlobalConfig";
import { NotificationConfig, DEFAULT_NOTIFICATION_CONFIG } from "./models/NotificationConfig";
import { TripEntry } from "./models/TripEntry";

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Managed separately; disable to avoid breaking SPA
    crossOriginEmbedderPolicy: false,
  })
);

// Restrict CORS to the configured allowed origin
const allowedOrigin = process.env.CORS_ORIGIN;
app.use(cors(allowedOrigin ? { origin: allowedOrigin } : {}));

// Body Parser
app.use(express.json());

/*
Ensure uploads directory exists
*/
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/*
Serve uploaded files
*/
app.use("/uploads", express.static(uploadDir));

/*
API Routes
*/
app.use("/api", router);

/*
Health endpoint
*/
app.get("/health", (req, res) => {
  res.json({
    status: "running",
    service: "TMS Backend API",
    timestamp: new Date().toISOString(),
  });
});

/*
Frontend (React/Vite build)
*/
let frontendPath = path.join(__dirname, "../frontend");

if (!fs.existsSync(frontendPath)) {
  frontendPath = path.join(__dirname, "../../frontend/dist");
}

app.use(express.static(frontendPath));

/*
SPA fallback
*/
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

/*
Server startup
*/
// Seeds defaults into empty tables on a fresh DB. Safe on existing data — uses findOrCreate/upsert.
const seedDefaults = async () => {
  const ensureRow = async (
    model: any,
    where: Record<string, unknown>,
    defaults: Record<string, unknown>
  ) => {
    const existing = await model.findOne({ where });
    if (!existing) {
      await model.create({ ...defaults, ...where });
    }
  };

  // 1. system_configs — one row per day of week (0=Sun … 6=Sat)
  const dayDefaults = [
    { day_of_week: 0, start_time: '08:00:00', end_time: '16:00:00', is_active: false }, // Sunday
    { day_of_week: 1, start_time: '08:00:00', end_time: '16:00:00', is_active: true  }, // Monday
    { day_of_week: 2, start_time: '08:00:00', end_time: '16:00:00', is_active: true  }, // Tuesday
    { day_of_week: 3, start_time: '08:00:00', end_time: '16:00:00', is_active: true  }, // Wednesday
    { day_of_week: 4, start_time: '08:00:00', end_time: '16:00:00', is_active: true  }, // Thursday
    { day_of_week: 5, start_time: '08:00:00', end_time: '16:00:00', is_active: true  }, // Friday
    { day_of_week: 6, start_time: '08:00:00', end_time: '16:00:00', is_active: false }, // Saturday
  ];
  for (const day of dayDefaults) {
    await ensureRow(SystemConfig, { day_of_week: day.day_of_week }, day);
  }

  // 2. global_configs — key/value feature flags
  for (const [key, value] of Object.entries(GLOBAL_CONFIG_DEFAULTS)) {
    await ensureRow(GlobalConfig, { key }, { key, value });
  }

  // 3. notification_configs — default notification rules
  for (const rule of DEFAULT_NOTIFICATION_CONFIG) {
    await ensureRow(
      NotificationConfig,
      { event_type: rule.event_type, target_role: rule.target_role },
      rule
    );
  }

  console.log("Default settings seeded (skipped existing rows).");
};

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully.");

    // Sync all models to ensure tables exist
    await sequelize.sync({ alter: false });
    console.log("All models synchronized.");

    await seedDefaults();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      initWebPush();
      startDriverReminders();
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

startServer();