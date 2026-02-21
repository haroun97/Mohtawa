import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import {
  createVoiceProfile,
  listVoiceProfiles,
  getVoiceProfile,
  uploadVoiceAsset,
  trainVoiceProfile,
} from "../services/voiceProfiles";
import { AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  provider: z.enum(["elevenlabs", "azure"]),
  /** Optional for ElevenLabs (clone from samples); required for Azure. */
  providerVoiceId: z.string().max(500).optional(),
  language: z.string().max(20).optional(),
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/wave",
      "audio/x-wav",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, "Only audio files (MP3, WAV) are allowed"));
    }
  },
});

// POST /api/voice-profiles — create
router.post(
  "/",
  validate(createSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await createVoiceProfile(req.user!.userId, req.body);
      res.status(201).json(profile);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/voice-profiles — list for user
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const list = await listVoiceProfiles(req.user!.userId);
      res.json(list);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/voice-profiles/:id — get one
router.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await getVoiceProfile(
        req.params.id as string,
        req.user!.userId,
      );
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/voice-profiles/:id/assets — upload audio sample (multipart)
router.post(
  "/:id/assets",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        throw new AppError(400, "No file uploaded. Use multipart field 'file'.");
      }
      const durationSec =
        req.body.durationSec != null
          ? Number(req.body.durationSec)
          : undefined;
      const asset = await uploadVoiceAsset(
        req.params.id as string,
        req.user!.userId,
        {
          file: {
            buffer: file.buffer,
            mimetype: file.mimetype,
            originalname: file.originalname,
          },
          durationSec: Number.isFinite(durationSec) ? durationSec : undefined,
        },
      );
      res.status(201).json(asset);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/voice-profiles/:id/train — validate assets and mark ready
router.post(
  "/:id/train",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await trainVoiceProfile(
        req.params.id as string,
        req.user!.userId,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
