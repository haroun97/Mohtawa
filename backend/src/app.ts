import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth";
import healthRoutes from "./routes/health";
import workflowRoutes from "./routes/workflows";
import settingsRoutes from "./routes/settings";
import voiceProfileRoutes from "./routes/voiceProfiles";
import storageRoutes from "./routes/storage";
import mediaRoutes from "./routes/media";
import projectRoutes from "./routes/projects";
import renderRoutes from "./routes/renders";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// Security headers
app.use(helmet());

// Allow multiple origins (comma-separated in CORS_ORIGIN) for e.g. localhost + LAN IP (iPhone)
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:8080";
const corsOrigins = corsOrigin.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));

app.use(
  cors({
    origin: corsOrigins.length > 1 ? corsOrigins : corsOrigins[0],
    credentials: true,
  }),
);

app.use(express.json({ limit: "5mb" }));

// Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window per IP
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour per IP
  message: { error: "Too many registration attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limit (allow execution polling + normal UI without 429)
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute (polling every 2s ≈ 30/min per run + headroom)
  message: { error: "Rate limit exceeded. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", apiLimiter);
app.use("/api/auth/register", registerLimiter);
app.use("/api/auth", authLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/workflows", workflowRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/voice-profiles", voiceProfileRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/renders", renderRoutes);

app.use(errorHandler);

export default app;
