import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { listApiKeys, createApiKey, deleteApiKey } from "../services/apiKeys";

const router = Router();

router.use(authenticate);

const createKeySchema = z.object({
  service: z.string().min(1),
  key: z.string().min(10, "API key must be at least 10 characters"),
  label: z.string().max(100).optional(),
});

// GET /api/settings/keys — list user's API keys (masked)
router.get(
  "/keys",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const keys = await listApiKeys(req.user!.userId);
      res.json(keys);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/settings/keys — store or update an API key
router.post(
  "/keys",
  validate(createKeySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = await createApiKey(req.user!.userId, req.body);
      res.status(201).json(key);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/settings/keys/:id — delete an API key
router.delete(
  "/keys/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteApiKey(req.params.id as string, req.user!.userId);
      res.json({ message: "API key deleted" });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
