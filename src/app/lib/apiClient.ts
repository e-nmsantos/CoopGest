export class ApiError extends Error {
  status: number;
  code?: string;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    this.code = code;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | unknown[] | null;
};

function isJsonBody(body: RequestOptions["body"]): body is Record<string, unknown> | unknown[] {
  return Boolean(body) && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof URLSearchParams);
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function apiMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const body = payload as { error?: { message?: string }; message?: string };
    return body.error?.message || body.message || fallback;
  }
  return fallback;
}

export async function apiRequest<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const response = await apiResponse(url, options);
  const payload = await parseResponse(response);
  return payload as T;
}

export async function apiResponse(url: string, options: RequestOptions = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const { body, ...requestOptions } = options;
  const init: RequestInit = { ...requestOptions, headers };

  if (isJsonBody(body)) {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(body);
  } else if (body !== undefined && body !== null) {
    init.body = body as BodyInit;
  }

  const response = await fetch(url, init);

  if (!response.ok) {
    const payload = await parseResponse(response);
    const code = payload && typeof payload === "object"
      ? (payload as { error?: { code?: string } }).error?.code
      : undefined;
    const message = apiMessage(
      payload,
      response.status === 429
        ? "Demasiadas tentativas. Aguarde um momento."
        : response.status >= 500
          ? "Servidor indisponivel. Verifique se o backend esta a correr."
          : "Pedido invalido."
    );
    throw new ApiError(message, response.status, payload, code);
  }

  return response;
}

export function apiGet<T>(url: string, options: RequestOptions = {}) {
  return apiRequest<T>(url, { ...options, method: "GET" });
}

export function apiPost<T>(url: string, body?: RequestOptions["body"], options: RequestOptions = {}) {
  return apiRequest<T>(url, { ...options, method: "POST", body });
}

export function apiPatch<T>(url: string, body?: RequestOptions["body"], options: RequestOptions = {}) {
  return apiRequest<T>(url, { ...options, method: "PATCH", body });
}

export function apiPut<T>(url: string, body?: RequestOptions["body"], options: RequestOptions = {}) {
  return apiRequest<T>(url, { ...options, method: "PUT", body });
}

export function apiDelete<T>(url: string, options: RequestOptions = {}) {
  return apiRequest<T>(url, { ...options, method: "DELETE" });
}
