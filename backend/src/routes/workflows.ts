import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import {
  createWorkflow,
  listWorkflows,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
  duplicateWorkflow,
} from "../services/workflows";
import {
  executeWorkflow,
  executeSingleNode,
  getExecution,
  listExecutions,
  rerunWorkflowFromFailed,
  resolveReviewAndResume,
} from "../services/execution";

const router = Router();

router.use(authenticate);

function paramId(p: string | string[] | undefined): string {
  return (Array.isArray(p) ? p[0] : p) ?? "";
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
});

// POST /api/workflows — create
router.post(
  "/",
  validate(createSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflow = await createWorkflow(req.user!.userId, req.body);
      res.status(201).json(workflow);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/workflows — list
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workflows = await listWorkflows(req.user!.userId);
    res.json(workflows);
  } catch (err) {
    next(err);
  }
});

// GET /api/workflows/:id — detail
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workflow = await getWorkflow(paramId(req.params.id), req.user!.userId);
    res.json(workflow);
  } catch (err) {
    next(err);
  }
});

// PUT /api/workflows/:id — update
router.put(
  "/:id",
  validate(updateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflow = await updateWorkflow(
        paramId(req.params.id),
        req.user!.userId,
        req.body,
      );
      res.json(workflow);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/workflows/:id — delete
router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteWorkflow(paramId(req.params.id), req.user!.userId);
      res.json({ message: "Workflow deleted" });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/workflows/:id/duplicate — duplicate
router.post(
  "/:id/duplicate",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflow = await duplicateWorkflow(paramId(req.params.id), req.user!.userId);
      res.status(201).json(workflow);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/workflows/:id/execute — run workflow
router.post(
  "/:id/execute",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const execution = await executeWorkflow(paramId(req.params.id), req.user!.userId);
      res.status(201).json(execution);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/workflows/:id/execute-node — run only one node (Test Node); does not affect other nodes
router.post(
  "/:id/execute-node",
  validate(z.object({ nodeId: z.string().min(1), priorExecutionId: z.string().optional() })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await executeSingleNode(
        paramId(req.params.id),
        req.body.nodeId,
        req.user!.userId,
        req.body.priorExecutionId,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/workflows/:id/rerun — re-queue from first failed node (body: { executionId })
router.post(
  "/:id/rerun",
  validate(z.object({ executionId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const execution = await rerunWorkflowFromFailed(
        paramId(req.params.id),
        req.body.executionId,
        req.user!.userId,
      );
      res.status(201).json(execution);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/workflows/:id/executions — execution history
router.get(
  "/:id/executions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const executions = await listExecutions(
        paramId(req.params.id),
        req.user!.userId,
      );
      res.json(executions);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/workflows/:id/executions/:execId — single execution detail
router.get(
  "/:id/executions/:execId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const execution = await getExecution(
        paramId(req.params.execId),
        req.user!.userId,
      );
      res.json(execution);
    } catch (err) {
      next(err);
    }
  },
);

const resolveReviewSchema = z.object({
  action: z.enum(["approve", "edit"]),
  approvedEdl: z.record(z.string(), z.unknown()).optional(),
});

// POST /api/workflows/:id/executions/:execId/steps/:stepId/resolve-review
router.post(
  "/:id/executions/:execId/steps/:stepId/resolve-review",
  validate(resolveReviewSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflowId = paramId(req.params.id);
      const executionId = paramId(req.params.execId);
      const stepId = paramId(req.params.stepId);
      const execution = await resolveReviewAndResume(
        workflowId,
        executionId,
        stepId,
        req.user!.userId,
        { action: req.body.action, approvedEdl: req.body.approvedEdl },
      );
      res.json(execution);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
