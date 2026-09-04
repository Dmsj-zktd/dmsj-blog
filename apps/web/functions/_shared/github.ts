import type { Env } from "./env";
import type { SessionUser } from "./auth";

export interface RepoFile {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

export class GitHubError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

function base64EncodeUtf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 0x8000) {
    chunks.push(
      String.fromCharCode(...bytes.subarray(i, i + 0x8000)),
    );
  }
  return btoa(chunks.join(""));
}

export class GitHubClient {
  constructor(
    private readonly env: Env,
    private readonly token: string,
    private readonly login: string,
  ) {}

  private owner() {
    return this.env.REPO_OWNER ?? "";
  }

  private repo() {
    return this.env.REPO_NAME ?? "";
  }

  private branch() {
    return this.env.REPO_BRANCH ?? "main";
  }

  private async request(
    url: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "dmsj-blog-admin",
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new GitHubError(
        `GitHub API ${response.status}: ${text.slice(0, 300)}`,
        response.status,
      );
    }
    return response;
  }

  async getAuthenticatedUser(): Promise<SessionUser> {
    const response = await this.request("https://api.github.com/user");
    const user = (await response.json()) as {
      id: number;
      login: string;
      name: string | null;
      avatar_url: string | null;
    };
    return {
      id: user.id,
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
    };
  }

  async getTree(): Promise<RepoFile[]> {
    const url = `https://api.github.com/repos/${this.owner()}/${this.repo()}/git/trees/${this.branch()}?recursive=1`;
    const response = await this.request(url);
    const tree = (await response.json()) as { tree: RepoFile[] };
    return tree.tree.filter((f) => f.type === "blob" && f.path.startsWith("content/"));
  }

  async getRawFile(path: string): Promise<string> {
    const response = await this.request(
      `https://api.github.com/repos/${this.owner()}/${this.repo()}/contents/${path}`,
      {
        headers: { Accept: "application/vnd.github.raw" },
      },
    );
    return response.text();
  }

  async putFile(
    path: string,
    content: string,
    message: string,
    sha?: string,
  ): Promise<void> {
    await this.request(
      `https://api.github.com/repos/${this.owner()}/${this.repo()}/contents/${path}`,
      {
        method: "PUT",
        body: JSON.stringify({
          message,
          content: base64EncodeUtf8(content),
          branch: this.branch(),
          ...(sha ? { sha } : {}),
          committer: {
            name: this.login,
            email: `${this.login}@users.noreply.github.com`,
          },
        }),
      },
    );
  }

  async deleteFile(path: string, sha: string, message: string): Promise<void> {
    await this.request(
      `https://api.github.com/repos/${this.owner()}/${this.repo()}/contents/${path}`,
      {
        method: "DELETE",
        body: JSON.stringify({
          message,
          sha,
          branch: this.branch(),
          committer: {
            name: this.login,
            email: `${this.login}@users.noreply.github.com`,
          },
        }),
      },
    );
  }
}

export function buildGitHubClient(env: Env, token: string, login: string) {
  return new GitHubClient(env, token, login);
}
