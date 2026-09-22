import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { Environment } from '../config/environment';

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

client.interceptors.request.use(config => {
  if (session.token) config.headers.Authorization = `Bearer ${session.token}`;
  const requestPath = String(config.url || '');
  const usesBuildingScope = requestPath.startsWith('/api/community/') || requestPath.startsWith('/api/extended-hours/');
  if (
    session.buildingId &&
    usesBuildingScope &&
    !config.headers['X-Ofis-Building-Ids']
  ) {
    config.headers['X-Ofis-Building-Ids'] = session.buildingId;
  }
  return config;
});

client.interceptors.response.use(
  response => response,
  error => {
    if ((error as AxiosError).response?.status === 401) unauthorizedHandler?.();
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
  patch: <T>(url: string, data?: unknown) => request<T>({ method: 'PATCH', url, data }),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => request<T>({ ...config, method: 'PUT', url, data }),
  delete: <T>(url: string) => request<T>({ method: 'DELETE', url }),
};
