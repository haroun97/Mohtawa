import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error(`[Error] ${err.message}`);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  if (err.name === "ZodError") {
    res.status(400).json({
      error: "Validation failed",
      details: (err as any).errors,
    });
    return;
  }

  // In production, don't leak internal error details
  const isProduction = process.env.NODE_ENV === "production";

  res.status(500).json({
    error: isProduction
      ? "Internal server error"
      : err.message || "Internal server error",
  });
}
