import { useState } from 'react';
import { useLocalStorage } from '../lib/useLocalStorage';
import { API_KEY_STORAGE } from './PhotoMealCard';

export default function ApiKeySettings() {
  const [apiKey, setApiKey] = useLocalStorage(API_KEY_STORAGE, '');
  const [draft, setDraft] = useState('');

  if (apiKey) {
    return (
      <section className="card form">
        <div className="card-head">
          <h2>📷 사진 분석 (Claude)</h2>
          <span className="badge">연결됨</span>
        </div>
        <p className="muted small">
          키: <code>{apiKey.slice(0, 10)}…{apiKey.slice(-4)}</code> · 사진 1장 분석에 약 3~5센트가 듭니다.
        </p>
        <button type="button" className="danger" onClick={() => confirm('이 기기에서 API 키를 지울까요?') && setApiKey('')}>
          키 삭제
        </button>
      </section>
    );
  }

  return (
    <form
      className="card form"
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.trim()) setApiKey(draft.trim());
        setDraft('');
      }}
    >
      <h2>📷 사진 분석 (Claude)</h2>
      <p className="muted small">음식 사진으로 영양 성분을 자동 기록하려면 Claude API 키가 필요합니다.</p>
      <ol className="muted small steps">
        <li>
          <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noreferrer">Claude Console</a>에 로그인해
          API 키를 만듭니다 (claude.ai 구독과 별도로 결제됩니다).
        </li>
        <li>Console의 Limits에서 월 사용 한도를 낮게 걸어 두면 안전합니다.</li>
        <li>
          <code>sk-ant-…</code> 키를 아래에 붙여넣습니다.
        </li>
      </ol>
      <input
        type="password"
        autoComplete="off"
        placeholder="sk-ant-로 시작하는 키"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <button type="submit" disabled={!draft.trim()}>저장</button>
      <p className="muted small">
        키는 이 기기의 브라우저에만 저장되고 Anthropic으로만 전송됩니다 (Gist로 동기화되지 않음). 다른 사람과 같이 쓰는
        기기에는 저장하지 마세요.
      </p>
    </form>
  );
}
