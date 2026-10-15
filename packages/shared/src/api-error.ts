/** Error body returned by the API for every non-2xx response. */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  /** Field-level validation errors, present for 400 responses. */
  details?: ApiFieldError[];
}

export interface ApiFieldError {
  path: string;
  message: string;
}
