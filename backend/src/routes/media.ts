import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth";
import { uploadToS3, VIDEO_PREFIX } from "../lib/storage";
import { AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB for phone video
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "video/mp4",
      "video/quicktime", // .mov
      "video/x-m4v",
      "video/webm",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, "Only video files (MP4, MOV, WebM) are allowed"));
    }
  },
});

/**
 * POST /api/media/upload
 * Multipart field: file (video).
 * Returns { key, url } for use in clips (e.g. Auto Edit node).
 * Stored under video-assets/{userId}/uploads/...
 */
router.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        throw new AppError(400, "No file uploaded. Use multipart field 'file'.");
      }
      const userId = req.user!.userId;
      const ext = (file.originalname.split(".").pop() || "mp4").toLowerCase().replace(/^mov$/, "mp4");
      const safeExt = ext === "mp4" || ext === "webm" ? ext : "mp4";
      const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const key = `${userId}/uploads/${unique}_clip.${safeExt}`;
      const result = await uploadToS3(key, file.buffer, file.mimetype, VIDEO_PREFIX);
      res.status(201).json({ key: result.key, url: result.url });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
