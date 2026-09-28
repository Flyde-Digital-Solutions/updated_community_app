import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { Environment } from '../config/environment';
import { Routes } from './routes';

export class ApiError extends Error {
  readonly status?: number;
  readonly offline: boolean;

  constructor(message: string, status?: number, offline = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.offline = offline;
  }
}

let session: { token: string | null; buildingId: string | null } = {
  token: null,
  buildingId: null,
};
let unauthorizedHandler: (() => void) | null = null;

export const setApiSession = (token: string | null, buildingId: string | null) => {
  session = { token, buildingId };
};

export const getApiSession = () => ({ ...session });

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

const client = axios.create({
  baseURL: Environment.apiBaseUrl.replace(/\/+$/, ''),
  timeout: Environment.requestTimeoutMs,
  headers: { Accept: 'application/json' },
});

const multipartRequestLabel = (config: AxiosRequestConfig | undefined) => {
  const method = config?.method?.toUpperCase();
  if (method === 'POST' && config?.url === Routes.community.printerRequests)
    return 'Printer POST';
  if (
    (method === 'POST' && config?.url === Routes.community.events) ||
    (method === 'PUT' && String(config?.url || '').startsWith(`${Routes.community.events}/`))
  ) return `Event ${method}`;
  return '';
};

const logMultipartRequest = (
  config: AxiosRequestConfig | undefined,
  status: number | undefined,
  contentType: unknown,
  body?: unknown,
) => {
  const label = multipartRequestLabel(config);
  if (
    typeof __DEV__ === 'undefined' || !__DEV__ ||
    !label
  ) return;
  const url = client.getUri(config);
  const errorText = typeof body === 'string'
    ? body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    : body && typeof body === 'object'
      ? String((body as Record<string, unknown>).error || (body as Record<string, unknown>).message || '')
      : '';
  console.info(
    `[${label}] ${url} | HTTP ${status ?? 'network error'} | content-type: ${String(contentType || 'unavailable')}` +
    (errorText ? ` | response: ${errorText.slice(0, 200)}` : ''),
  );
};

client.interceptors.request.use(config => {
  if (session.token) config.headers.Authorization = `Bearer ${session.token}`;
  const requestPath = String(config.url || '');
  const usesBuildingScope = requestPath.startsWith('/api/community/') || requestPath.startsWith('/api/extended-hours/');
  // The ticket-list endpoint returns tickets for every building assigned to the
  // authenticated community user when the building header is omitted. Keep
  // mutations and ticket-detail requests scoped to the selected building, but
  // let the list mirror the documented curl/response used by the Tickets screen.
  const isAllBuildingsTicketList =
    String(config.method || 'get').toLowerCase() === 'get' &&
    requestPath === Routes.community.tickets;
  if (
    session.buildingId &&
    usesBuildingScope &&
    !isAllBuildingsTicketList &&
    !config.headers['X-Ofis-Building-Ids']
  ) {
    config.headers['X-Ofis-Building-Ids'] = session.buildingId;
  }
  return config;
});

client.interceptors.response.use(
  response => {
    logMultipartRequest(response.config, response.status, response.headers['content-type']);
    return response;
  },
  error => {
    const axiosError = error as AxiosError;
    logMultipartRequest(
      axiosError.config,
      axiosError.response?.status,
      axiosError.response?.headers['content-type'],
      axiosError.response?.data,
    );
    if (axiosError.response?.status === 401) unauthorizedHandler?.();
    return Promise.reject(error);
  },
);

const toApiError = (error: unknown): ApiError => {
  const axiosError = error as AxiosError<{ message?: string; error?: string } | string>;
  const status = axiosError.response?.status;
  const body = axiosError.response?.data;
  const bodyMessage = typeof body === 'string' ? body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : body?.message || body?.error;
  const offline = !axiosError.response;
  const message = bodyMessage || axiosError.message || 'Unable to reach the service.';
  return new ApiError(message.replace(/\bbackend\b/gi, 'service'), status, offline);
};

const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
  try {
    const response = await client.request<T>(config);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const apiClient = {
  get: <T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'GET', url, params }),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => request<T>({ ...config, method: 'POST', url, data }),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => request<T>({ ...config, method: 'PATCH', url, data }),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => request<T>({ ...config, method: 'PUT', url, data }),
  delete: <T>(url: string, config?: AxiosRequestConfig) => request<T>({ ...config, method: 'DELETE', url }),
};
