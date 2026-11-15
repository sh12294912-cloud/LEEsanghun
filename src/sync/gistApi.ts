import type { Snapshot } from './snapshot';

export const GIST_FILENAME = 'my-fit-data.json';
const API = 'https://api.github.com';

/** Gist에 저장되는 파일 형식 */
export interface RemotePayload {
  app: 'my-fit';
  version: 2;
  updatedAt: string; // 업로드 시각 (ISO) — 변경 감지용
  data: Snapshot;
}

export class GistError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function gh<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API + path, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new GistError('네트워크에 연결할 수 없습니다.');
  }
  if (res.status === 401) throw new GistError('토큰이 올바르지 않거나 만료되었습니다.', 401);
  if (res.status === 403) throw new GistError('권한이 없거나 요청 한도를 초과했습니다. 토큰에 gist 권한이 있는지 확인하세요.', 403);
  if (res.status === 404) throw new GistError('Gist를 찾을 수 없습니다.', 404);
  if (!res.ok) throw new GistError(`GitHub 오류 (${res.status})`, res.status);
  return res.json() as Promise<T>;
}

interface GistFile { content?: string; truncated?: boolean; raw_url?: string }
interface Gist { id: string; html_url: string; files: Record<string, GistFile> }

/** 내 Gist 중 이 앱 데이터 파일이 든 것 찾기 */
export async function findDataGist(token: string): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const list = await gh<Gist[]>(token, `/gists?per_page=100&page=${page}`);
    const hit = list.find((g) => g.files && GIST_FILENAME in g.files);
    if (hit) return hit.id;
    if (list.length < 100) break;
  }
  return null;
}

export async function readGist(token: string, id: string): Promise<RemotePayload | null> {
  const g = await gh<Gist>(token, `/gists/${id}`);
  const f = g.files[GIST_FILENAME];
  if (!f) return null;
  let text = f.content ?? '';
  if (f.truncated && f.raw_url) {
    const raw = await fetch(f.raw_url, { headers: { Authorization: `Bearer ${token}` } });
    text = await raw.text();
  }
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as RemotePayload;
  } catch {
    throw new GistError('Gist의 데이터 파일 형식이 올바르지 않습니다.');
  }
}

export async function createGist(token: string, payload: RemotePayload): Promise<string> {
  const g = await gh<Gist>(token, '/gists', {
    method: 'POST',
    body: JSON.stringify({
      description: 'My Fit 앱 데이터 (자동 동기화)',
      public: false,
      files: { [GIST_FILENAME]: { content: JSON.stringify(payload) } },
    }),
  });
  return g.id;
}

export async function writeGist(token: string, id: string, payload: RemotePayload): Promise<void> {
  await gh(token, `/gists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ files: { [GIST_FILENAME]: { content: JSON.stringify(payload) } } }),
  });
}
