import { useState } from 'react';
import { useSync } from '../sync/SyncProvider';

const TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=gist&description=My%20Fit%20sync';

export function formatAgo(ts?: number): string {
  if (!ts) return '아직 없음';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return '방금 전';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return new Date(ts).toLocaleString('ko-KR');
}

export default function SyncSettings() {
  const sync = useSync();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);

  async function onConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setBusy(true);
    const ok = await sync.connect(token);
    setBusy(false);
    if (ok) setToken('');
  }

  if (!sync.connected) {
    return (
      <form className="card form" onSubmit={onConnect}>
        <h2>☁️ GitHub Gist 동기화</h2>
        <p className="muted small">
          여러 기기에서 같은 기록을 쓰려면 GitHub 토큰을 연결하세요. 데이터는 내 계정의 <b>비공개(secret) Gist</b>에
          저장됩니다.
        </p>
        <ol className="muted small steps">
          <li>
            <a href={TOKEN_URL} target="_blank" rel="noreferrer">토큰 만들기 페이지</a>를 엽니다 (gist 권한이 미리 체크됨).
          </li>
          <li>만료 기간을 고르고 <b>Generate token</b>을 누릅니다.</li>
          <li>생성된 <code>ghp_…</code> 토큰을 아래에 붙여넣습니다.</li>
        </ol>
        <input
          type="password"
          autoComplete="off"
          placeholder="ghp_로 시작하는 토큰"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        {sync.status === 'error' && sync.error && <p className="text-warn small">{sync.error}</p>}
        <button type="submit" disabled={busy || !token.trim()}>{busy ? '연결 중…' : '연결'}</button>
        <p className="muted small">
          다른 기기에서도 같은 토큰을 넣으면 같은 Gist를 자동으로 찾아 연결합니다. 토큰은 이 기기의 브라우저에만 저장됩니다.
        </p>
      </form>
    );
  }

  const label =
    sync.status === 'syncing' ? '동기화 중…'
    : sync.status === 'error' ? '오류'
    : sync.dirty ? '업로드 대기 중'
    : '최신 상태';

  return (
    <section className="card form">
      <div className="card-head">
        <h2>☁️ GitHub Gist 동기화</h2>
        <span className={`badge ${sync.status === 'error' ? 'err' : ''}`}>{label}</span>
      </div>
      <p className="muted small">
        마지막 동기화: {formatAgo(sync.lastSyncAt)} ·{' '}
        <a href={`https://gist.github.com/${sync.gistId}`} target="_blank" rel="noreferrer">Gist 보기</a>
      </p>
      {sync.status === 'error' && sync.error && <p className="text-warn small">{sync.error}</p>}
      <p className="muted small">
        앱을 열 때, 다시 돌아올 때, 기록을 바꾼 뒤 자동으로 동기화됩니다. 두 기기에서 동시에 바뀌면 기록을 합칩니다.
      </p>
      <button type="button" onClick={() => sync.syncNow()} disabled={sync.status === 'syncing'}>
        지금 동기화
      </button>
      <button
        type="button"
        className="danger"
        onClick={() => confirm('이 기기에서 동기화 연결을 해제할까요? (Gist와 기록은 지워지지 않습니다)') && sync.disconnect()}
      >
        연결 해제
      </button>
    </section>
  );
}
