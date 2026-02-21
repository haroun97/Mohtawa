import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import { getPresignedPlayUrl } from "../lib/storage";
import { AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

/**
 * GET /api/storage/play?key=...
 * Returns JSON { url } with a short-lived presigned S3 URL for playback.
 * Key must be voice-output/{userId}/... so users can only access their own files.
 */
router.get(
  "/play",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawKey = req.query.key as string | undefined;
      if (!rawKey || typeof rawKey !== "string") {
        throw new AppError(400, "Query parameter key is required");
      }
      const key = decodeURIComponent(rawKey.trim());
      const userId = req.user!.userId;
      const allowedPrefix1 = `voice-output/${userId}/`;
      const allowedPrefix2 = `video-assets/${userId}/`;
      if (!key.startsWith(allowedPrefix1) && !key.startsWith(allowedPrefix2)) {
        throw new AppError(403, "Access denied to this resource");
      }
      const url = await getPresignedPlayUrl(key, 900); // 15 min
      res.json({ url });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
