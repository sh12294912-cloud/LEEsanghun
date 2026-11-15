import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../store/AppStore';
import { hashSnapshot, mergeSnapshots, type Snapshot } from './snapshot';
import { createGist, findDataGist, GistError, readGist, writeGist, type RemotePayload } from './gistApi';

/** 이 기기에 저장되는 동기화 설정 */
interface SyncConfig {
  token?: string;
  gistId?: string;
  /** 마지막으로 맞춘 원격 데이터의 updatedAt */
  remoteStamp?: string;
  /** 마지막으로 맞춘 시점의 로컬 데이터 해시 */
  localHash?: string;
  lastSyncAt?: number;
}

type Status = 'off' | 'idle' | 'syncing' | 'ok' | 'error';

interface SyncApi {
  connected: boolean;
  gistId?: string;
  status: Status;
  error?: string;
  lastSyncAt?: number;
  dirty: boolean;
  connect: (token: string) => Promise<boolean>;
  disconnect: () => void;
  syncNow: () => Promise<void>;
}

const KEY = 'fit.sync';
const DEBOUNCE_MS = 2000;

function loadConfig(): SyncConfig {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

const hasRecords = (s: Snapshot) =>
  s.workouts.length + s.meals.length + s.bodyLogs.length + s.foodPresets.length + s.routines.length > 0;

const Ctx = createContext<SyncApi | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { snapshot, applySnapshot } = useStore();
  const [cfg, setCfgState] = useState<SyncConfig>(loadConfig);
  const [status, setStatus] = useState<Status>(cfg.token ? 'idle' : 'off');
  const [error, setError] = useState<string>();

  // 비동기 작업에서 항상 최신 값을 보도록 ref 사용
  const cfgRef = useRef(cfg);
  const snapRef = useRef(snapshot);
  snapRef.current = snapshot;
  const inFlight = useRef(false);
  const again = useRef(false);

  const saveCfg = useCallback((next: SyncConfig) => {
    cfgRef.current = next;
    setCfgState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch { /* ignore */ }
  }, []);

  const currentHash = hashSnapshot(snapshot);
  const dirty = !!cfg.token && currentHash !== cfg.localHash;

  /** 실제 동기화. 실패 시 throw */
  const runSync = useCallback(async () => {
    const c = cfgRef.current;
    if (!c.token) return;
    const token = c.token;
    const local = snapRef.current;
    const localDirty = hashSnapshot(local) !== c.localHash;
    const firstSync = !c.remoteStamp;

    let gistId = c.gistId ?? (await findDataGist(token)) ?? undefined;
    let remote: RemotePayload | null = null;
    if (gistId) {
      try {
        remote = await readGist(token, gistId);
      } catch (e) {
        if (e instanceof GistError && e.status === 404) gistId = undefined; // Gist가 삭제됨 → 새로 만듦
        else throw e;
      }
    }

    const push = async (data: Snapshot) => {
      const payload: RemotePayload = { app: 'my-fit', version: 2, updatedAt: new Date().toISOString(), data };
      if (gistId) await writeGist(token, gistId, payload);
      else gistId = await createGist(token, payload);
      return payload.updatedAt;
    };

    let next: SyncConfig;
    if (!remote) {
      // 원격에 데이터 없음 → 이 기기 데이터 업로드
      const stamp = await push(local);
      next = { ...c, gistId, remoteStamp: stamp, localHash: hashSnapshot(local) };
    } else {
      const remoteChanged = remote.updatedAt !== c.remoteStamp;
      if (!remoteChanged && !localDirty) {
        next = { ...c, gistId };
      } else if (!remoteChanged) {
        // 이 기기만 변경 → 업로드
        const stamp = await push(local);
        next = { ...c, gistId, remoteStamp: stamp, localHash: hashSnapshot(local) };
      } else if (!localDirty || (firstSync && !hasRecords(local))) {
        // 원격만 변경(또는 빈 새 기기) → 다운로드
        const applied = applySnapshot(remote.data);
        next = { ...c, gistId, remoteStamp: remote.updatedAt, localHash: hashSnapshot(applied) };
      } else {
        // 양쪽 다 변경 → 합친 뒤 업로드
        const merged = mergeSnapshots(local, remote.data);
        if (firstSync && remote.data.goals) merged.goals = remote.data.goals;
        const applied = applySnapshot(merged);
        const stamp = await push(applied);
        next = { ...c, gistId, remoteStamp: stamp, localHash: hashSnapshot(applied) };
      }
    }
    // 동기화 중 토큰이 해제됐으면 저장하지 않음
    if (cfgRef.current.token === token) saveCfg({ ...next, lastSyncAt: Date.now() });
  }, [applySnapshot, saveCfg]);

  const syncNow = useCallback(async () => {
    if (!cfgRef.current.token) return;
    if (inFlight.current) {
      again.current = true;
      return;
    }
    inFlight.current = true;
    setStatus('syncing');
    try {
      do {
        again.current = false;
        await runSync();
      } while (again.current);
      setError(undefined);
      setStatus('ok');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    } finally {
      inFlight.current = false;
    }
  }, [runSync]);

  const connect = useCallback(
    async (token: string) => {
      saveCfg({ token: token.trim() });
      await syncNow();
      if (!cfgRef.current.gistId) {
        // 연결 실패 → 토큰 저장하지 않음
        saveCfg({});
        setStatus('error');
        return false;
      }
      return true;
    },
    [saveCfg, syncNow],
  );

  const disconnect = useCallback(() => {
    saveCfg({});
    setError(undefined);
    setStatus('off');
  }, [saveCfg]);

  // 앱 시작 시 + 화면으로 돌아올 때 동기화, 화면을 떠날 때 변경분 업로드
  useEffect(() => {
    if (cfgRef.current.token) syncNow();
    const onVis = () => {
      if (!cfgRef.current.token) return;
      if (document.visibilityState === 'visible') syncNow();
      else if (hashSnapshot(snapRef.current) !== cfgRef.current.localHash) syncNow();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [syncNow]);

  // 데이터가 바뀌면 잠시 후 자동 업로드
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(syncNow, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [currentHash, dirty, syncNow]);

  const api: SyncApi = {
    connected: !!cfg.token && !!cfg.gistId,
    gistId: cfg.gistId,
    status,
    error,
    lastSyncAt: cfg.lastSyncAt,
    dirty,
    connect,
    disconnect,
    syncNow,
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useSync(): SyncApi {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSync must be used inside SyncProvider');
  return s;
}
