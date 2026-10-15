import { type ApiErrorBody } from '@kanban/shared';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/** Any failed API call. `status === 0` means the server could not be reached at all. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: ApiErrorBody,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: init.body ? { 'Content-Type': 'application/json', ...init.headers } : init.headers,
    });
  } catch {
    throw new ApiError(0, 'Нет соединения с сервером');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as ApiErrorBody | undefined;
    throw new ApiError(
      response.status,
      body?.message ?? `Ошибка сервера (${response.status})`,
      body,
    );
  }

  return (response.status === 204 ? undefined : await response.json()) as T;
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Что-то пошло не так';
