export class ApiError extends Error {
  statusCode: number;
  errorCode: string;
  errors?: any[];

  constructor(statusCode: number, message: string, errorCode: string = 'INTERNAL_ERROR', errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}
