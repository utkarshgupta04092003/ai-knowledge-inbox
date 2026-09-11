import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  const errorLog = {
    level: "error",
    event: "unhandled_error",
    message: err.message,
    stack: env.NODE_ENV === "development" ? err.stack : undefined,
  };
  process.stderr.write(`${JSON.stringify(errorLog)}\n`);

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected internal server error occurred.",
    },
  });
}
