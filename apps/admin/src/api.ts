const CSRF_HEADER = { "x-dmsj-csrf": "1" };

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init.body ? CSRF_HEADER : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body && typeof body.error === "string"
        ? body.error
        : body && Array.isArray(body.error)
          ? JSON.stringify(body.error)
          : `HTTP ${response.status}`;
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function get<T>(url: string): Promise<T> {
  return request<T>(url);
}

export function post<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function put<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function del<T>(url: string): Promise<T> {
  return request<T>(url, { method: "DELETE" });
}

export interface SessionUser {
  id: number;
  login: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface MeResponse {
  user: SessionUser | null;
}

export interface OverviewResponse {
  from: string;
  to: string;
  totalViews: number;
  uniqueVisitors: number;
  daily: Array<{ day: string; views: number }>;
}

export interface BreakdownRow {
  key: string;
  views: number;
}

export interface BreakdownResponse {
  rows: BreakdownRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DraftListItem {
  id: string;
  domain: string;
  dirs: string[];
  slug: string;
  title: string;
  description: string;
  tags: string[];
  series: string | null;
  lang: string;
  updatedAt: number;
}

export interface PublishedFile {
  path: string;
  sha: string;
  size: number;
}

export interface ArticlesResponse {
  published: PublishedFile[];
  drafts: DraftListItem[];
}

export interface AuditResponse {
  rows: Array<{
    ts: number;
    actor: string;
    action: string;
    resource: string;
    resourceId: string | null;
    success: number;
    details: string | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
}
