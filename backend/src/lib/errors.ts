export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errors = {
  unauthorized: (message = "Authentication required") => new AppError(401, "UNAUTHORIZED", message),
  forbidden: (message = "You do not have access to this resource") => new AppError(403, "FORBIDDEN", message),
  notFound: (message = "Resource not found") => new AppError(404, "NOT_FOUND", message),
  badRequest: (message: string) => new AppError(400, "BAD_REQUEST", message),
  conflict: (message: string) => new AppError(409, "CONFLICT", message),
};
