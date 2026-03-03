import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import {
  listIdeaDocs,
  createIdeaDoc,
  getIdeaDoc,
  updateIdeaDoc,
  deleteIdeaDoc,
  restoreIdeaDoc,
} from "../services/ideaDocs";

const router = Router();
router.use(authenticate);

function paramId(p: string | string[] | undefined): string {
  return (Array.isArray(p) ? p[0] : p) ?? "";
}

const createSchema = z.object({
  title: z.string().max(500).optional(),
});

const updateSchema = z.object({
  title: z.string().max(500).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
});

// GET /api/idea-docs — list (exclude soft-deleted unless ?trash=1)
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trash = req.query.trash === "1";
    const list = await listIdeaDocs(req.user!.userId, { trash });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// POST /api/idea-docs — create
router.post(
  "/",
  validate(createSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await createIdeaDoc(req.user!.userId, req.body.title);
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/idea-docs/:id — get one (full doc)
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await getIdeaDoc(paramId(req.params.id), req.user!.userId);
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// PUT /api/idea-docs/:id — update
router.put(
  "/:id",
  validate(updateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await updateIdeaDoc(
        paramId(req.params.id),
        req.user!.userId,
        req.body,
      );
      res.json(doc);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/idea-docs/:id — soft delete (or ?permanent=1)
router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const permanent = req.query.permanent === "1";
      const result = await deleteIdeaDoc(
        paramId(req.params.id),
        req.user!.userId,
        permanent,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/idea-docs/:id/restore — restore from Trash
router.post(
  "/:id/restore",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await restoreIdeaDoc(
        paramId(req.params.id),
        req.user!.userId,
      );
      res.json(doc);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
