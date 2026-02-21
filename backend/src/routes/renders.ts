import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import { getDraftRenderJob } from "../lib/draftRenderQueue";
import { getPresignedPlayUrl } from "../lib/storage";
import { getProject } from "../services/projects";
import { AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

function paramId(p: string | string[] | undefined): string {
  return (Array.isArray(p) ? p[0] : p) ?? "";
}

/** GET /api/renders/:jobId/status — render job status for live export preview */
router.get(
  "/:jobId/status",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobId = paramId(req.params.jobId);
      const userId = req.user!.userId;

      const job = await getDraftRenderJob(jobId);
      if (!job) {
        throw new AppError(404, "Render job not found");
      }
      if (job.data.userId !== userId) {
        throw new AppError(403, "Access denied to this render job");
      }

      const state = await job.getState();
      const status =
        state === "completed"
          ? "done"
          : state === "failed"
            ? "failed"
            : "rendering";

      const progress = job.progress as
        | { percent?: number; currentTimeSec?: number; previewKey?: string }
        | undefined;
      const percent = typeof progress?.percent === "number" ? progress.percent : 0;

      let previewImageUrl: string | undefined;
      if (progress?.previewKey) {
        try {
          previewImageUrl = await getPresignedPlayUrl(progress.previewKey, 60);
        } catch {
          // S3 not configured or key missing
        }
      }

      let outputVideoUrl: string | undefined;
      if (status === "done") {
        const project = await getProject(job.data.projectId, userId);
        const draftUrl = project.draftVideoUrl;
        if (draftUrl?.startsWith("s3://")) {
          const match = draftUrl.match(/^s3:\/\/([^/]+)\/(.+)$/);
          if (match) {
            outputVideoUrl = await getPresignedPlayUrl(match[2], 3600);
          }
        } else if (draftUrl?.startsWith("http")) {
          outputVideoUrl = draftUrl;
        }
      }

      res.json({
        status,
        progress: percent,
        etaSec: undefined,
        previewImageUrl,
        outputVideoUrl,
      });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
