import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { zodFieldErrorsClient } from "./form-utils";

export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "EMAIL_NOT_VERIFIED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL";

export type FieldErrors = Record<string, string[]>;

export class AppError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
    public fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, fieldErrors?: FieldErrors) =>
  new AppError(400, "VALIDATION", message, fieldErrors);
export const unauthenticated = (message = "Please log in to continue.") =>
  new AppError(401, "UNAUTHENTICATED", message);
export const notVerified = () =>
  new AppError(403, "EMAIL_NOT_VERIFIED", "Verify your college email to do this.");
export const forbidden = (message = "You don't have permission to do that.") =>
  new AppError(403, "FORBIDDEN", message);
export const notFound = (message = "Not found.") => new AppError(404, "NOT_FOUND", message);
export const conflict = (message: string) => new AppError(409, "CONFLICT", message);
export const rateLimited = (retryAfterSec: number) =>
  new AppError(429, "RATE_LIMITED", `Too many attempts. Try again in ${formatWait(retryAfterSec)}.`);

function formatWait(sec: number) {
  return sec < 60 ? `${sec} seconds` : `${Math.ceil(sec / 60)} minutes`;
}

export type ApiErrorBody = { error: { code: ErrorCode; message: string; fieldErrors?: FieldErrors } };

/** Maps any thrown error to a safe JSON response. Unknown errors are logged, never exposed. */
export function toErrorResponse(err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Please fix the highlighted fields.", fieldErrors: zodFieldErrorsClient(err) } },
      { status: 400 },
    );
  }
  const prismaCode = (err as { code?: string } | null)?.code;
  if (prismaCode === "P2002") {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "That already exists." } },
      { status: 409 },
    );
  }
  if (prismaCode === "P2025") {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not found." } }, { status: 404 });
  }
  const requestId = crypto.randomUUID();
  console.error(`[api] unhandled error requestId=${requestId}`, err);
  return NextResponse.json(
    { error: { code: "INTERNAL", message: `Something went wrong on our side. Please try again. (ref ${requestId.slice(0, 8)})` } },
    { status: 500 },
  );
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

export function withErrorHandling<C>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/** Parses a JSON body, turning malformed JSON into a 400 instead of a 500. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
}
