import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import {
  decideIterationReviewAndResume,
  getExecution,
  getReviewQueue,
  regenerateDraftForIteration,
} from "../services/execution";

const router = Router();
router.use(authenticate);

function paramId(p: string | string[] | undefined): string {
  return (Array.isArray(p) ? p[0] : p) ?? "";
}

/**
 * GET /api/runs/:runId/review-queue
 * List iterations for the Review node: status, draftVideoUrl, voiceoverUrl, finalVideoUrl, counts.
 */
router.get(
  "/:runId/review-queue",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const runId = paramId(req.params.runId);
      const userId = req.user!.userId;
      const queue = await getReviewQueue(runId, userId);
      res.json(queue);
    } catch (err) {
      next(err);
    }
  }
);

const decideSchema = z.object({
  decision: z.enum(["approved", "skipped"]),
  notes: z.string().max(2000).optional(),
});

/**
 * POST /api/runs/:runId/iterations/:iterationId/review/decide
 * Approve or skip one iteration's review; if approved, resume downstream nodes for that iteration only.
 */
router.post(
  "/:runId/iterations/:iterationId/review/decide",
  validate(decideSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const runId = paramId(req.params.runId);
      const iterationId = paramId(req.params.iterationId);
      const userId = req.user!.userId;
      const body = req.body as z.infer<typeof decideSchema>;
      const execution = await decideIterationReviewAndResume(runId, iterationId, userId, {
        decision: body.decision,
        notes: body.notes,
      });
      res.json(execution);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/runs/:runId/iterations/:iterationId/regenerate-draft
 * Re-run one iteration from the first node after For Each to regenerate a failed draft.
 */
router.post(
  "/:runId/iterations/:iterationId/regenerate-draft",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const runId = paramId(req.params.runId);
      const iterationId = paramId(req.params.iterationId);
      const userId = req.user!.userId;
      const execution = await regenerateDraftForIteration(runId, iterationId, userId);
      res.json(execution);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
