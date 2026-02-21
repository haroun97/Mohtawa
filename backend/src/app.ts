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

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:8080",
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

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
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
