import { useState } from 'react';
import { useStore } from '../store/AppStore';
import type { Goals } from '../types';
import SyncSettings from '../components/SyncSettings';
import { useSync } from '../sync/SyncProvider';

export default function Settings() {
  const { goals, setGoals, exportData, importData, resetAll } = useStore();
  const [g, setG] = useState<Goals>(goals);
  const [saved, setSaved] = useState(false);
  const sync = useSync();

  const num = (key: keyof Goals, label: string) => (
    <label>
      {label}
      <input
        inputMode="decimal"
        value={g[key] ?? ''}
        onChange={(e) => setG({ ...g, [key]: e.target.value === '' ? undefined : Number(e.target.value) })}
      />
    </label>
  );

  function download() {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((txt) => {
      try {
        importData(txt);
        alert('불러오기 완료');
      } catch {
        alert('파일 형식이 올바르지 않습니다.');
      }
    });
  }

  return (
    <div className="page">
      <h1>설정</h1>

      <form
        className="card form"
        onSubmit={(e) => {
          e.preventDefault();
          setGoals(g);
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        }}
      >
        <h2>하루 목표</h2>
        <div className="row">
          {num('kcal', 'kcal')}
          {num('protein', '단백질(g)')}
        </div>
        <div className="row">
          {num('carbs', '탄수화물(g)')}
          {num('fat', '지방(g)')}
        </div>
        <div className="row">
          {num('targetWeight', '목표 체중(kg)')}
          {num('weeklyWorkouts', '주간 운동 횟수')}
        </div>
        <button type="submit">{saved ? '저장됨 ✓' : '저장'}</button>
      </form>

      <SyncSettings />

      <section className="card form">
        <h2>데이터</h2>
        <p className="muted small">
          {sync.connected
            ? 'Gist와 동기화 중입니다. 백업 파일은 추가 보관용으로 쓰세요.'
            : '데이터는 이 기기의 브라우저에만 저장됩니다. 동기화를 연결하거나 주기적으로 백업하세요.'}
        </p>
        <button type="button" onClick={download}>백업 파일 내보내기</button>
        <label className="file-btn">
          백업 파일 불러오기
          <input type="file" accept="application/json" onChange={upload} hidden />
        </label>
        <button
          type="button"
          className="danger"
          onClick={() =>
            confirm(
              sync.connected
                ? '모든 기록을 삭제할까요?\n동기화가 켜져 있어 Gist와 다른 기기의 기록도 함께 지워집니다.'
                : '모든 기록을 삭제할까요?',
            ) && resetAll()
          }
        >
          전체 초기화
        </button>
      </section>
    </div>
  );
}
