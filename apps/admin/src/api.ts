let csrfToken = "";

export function setCsrfToken(value: string | null | undefined): void {
  csrfToken = value ?? "";
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const method = init.method ?? "GET";
  const response = await fetch(url, {
    credentials: "same-origin",
    ...init,
    headers: {
      ...(method !== "GET" && method !== "HEAD" && csrfToken ? { "x-dmsj-csrf": csrfToken } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body && typeof body.error === "string"
        ? body.error
        : body?.error && typeof body.error === "object" && "message" in body.error
          ? String(body.error.message)
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
  csrfToken?: string;
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
  metadata?: {
    kind?: string;
    topic?: string | null;
    maturity?: string | null;
    sources?: unknown[];
    evidence?: {
      level?: string;
      scope?: string;
      caveats?: string[];
    } | null;
    lab?: string | null;
    related?: string[];
    verifiedAt?: string | null;
    question?: string | null;
    conclusion?: string | null;
    takeaways?: string[];
  };
  version?: number;
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
