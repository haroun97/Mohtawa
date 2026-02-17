import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { registerUser, loginUser, getCurrentUser } from "../services/auth";

const router = Router();

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

router.post(
  "/register",
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name } = req.body;
      const result = await registerUser(email, password, name);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/login",
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await loginUser(email, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/me",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await getCurrentUser(req.user!.userId);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
