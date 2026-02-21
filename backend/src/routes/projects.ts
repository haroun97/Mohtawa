import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import { getProject, getEdl, updateEdl, renderDraft } from "../services/projects";
import { getExportPreview } from "../lib/exportPreviewStore";
import { AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

function paramId(p: string | string[] | undefined): string {
  return (Array.isArray(p) ? p[0] : p) ?? "";
}

/** GET /api/projects/:projectId/export-preview — live progress + preview image during sync export */
router.get(
  "/:projectId/export-preview",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = paramId(req.params.projectId);
      await getProject(projectId, req.user!.userId);
      const entry = getExportPreview(projectId);
      const progress = entry?.progress ?? 0;
      const previewImageUrl =
        entry?.previewBase64 != null
          ? `data:image/jpeg;base64,${entry.previewBase64}`
          : undefined;
      res.json({ progress, previewImageUrl });
    } catch (e) {
      next(e);
    }
  },
);

/** GET /api/projects/:projectId — project detail (for polling after render-draft) */
router.get("/:projectId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = paramId(req.params.projectId);
    const project = await getProject(projectId, req.user!.userId);
    res.json({
      id: project.id,
      draftVideoUrl: project.draftVideoUrl,
      edlUrl: project.edlUrl,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  } catch (e) {
    next(e);
  }
});

/** GET /api/projects/:projectId/edl — get EDL JSON */
router.get("/:projectId/edl", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = paramId(req.params.projectId);
    const edl = await getEdl(projectId, req.user!.userId);
    res.json(edl);
  } catch (e) {
    next(e);
  }
});

/** POST /api/projects/:projectId/edl/update — validate and store EDL */
router.post(
  "/:projectId/edl/update",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = paramId(req.params.projectId);
      const body = req.body;
      if (!body || typeof body !== "object") {
        throw new AppError(400, "Request body must be EDL JSON object");
      }
      const { edlUrl } = await updateEdl(projectId, req.user!.userId, body);
      res.json({ edlUrl });
    } catch (e) {
      next(e);
    }
  },
);

/** POST /api/projects/:projectId/render-draft — enqueue or run draft re-render */
router.post(
  "/:projectId/render-draft",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = paramId(req.params.projectId);
      const result = await renderDraft(projectId, req.user!.userId);
      if (result.status === "queued" || result.status === "processing") {
        res.status(202).json({
          status: result.status,
          jobId: result.jobId,
          message: "Draft render queued. Poll GET /api/projects/:projectId for draftVideoUrl.",
        });
      } else {
        res.json({
          status: result.status,
          draftVideoUrl: result.draftVideoUrl,
        });
      }
    } catch (e) {
      next(e);
    }
  },
);

export default router;
