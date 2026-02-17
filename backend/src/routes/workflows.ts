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
  getExecution,
  listExecutions,
} from "../services/execution";

const router = Router();

router.use(authenticate);

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
    const workflow = await getWorkflow(req.params.id, req.user!.userId);
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
        req.params.id,
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
      await deleteWorkflow(req.params.id, req.user!.userId);
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
      const workflow = await duplicateWorkflow(req.params.id, req.user!.userId);
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
      const execution = await executeWorkflow(req.params.id, req.user!.userId);
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
        req.params.id,
        req.user!.userId,
      );
      res.json(executions);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/executions/:execId — single execution detail
router.get(
  "/:id/executions/:execId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const execution = await getExecution(
        req.params.execId,
        req.user!.userId,
      );
      res.json(execution);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
