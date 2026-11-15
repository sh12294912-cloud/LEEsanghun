import { useState } from 'react';
import { useStore } from '../store/AppStore';
import { exerciseHistory, exerciseNames } from '../lib/strength';
import { formatKoreanDate } from '../lib/date';
import LineChart from './LineChart';

type Metric = 'weight' | 'volume';

export default function ExerciseProgress() {
  const { workouts } = useStore();
  const names = exerciseNames(workouts).filter((n) => exerciseHistory(workouts, n).some((d) => d.maxWeight > 0));
  const [name, setName] = useState(names[0] ?? '');
  const [metric, setMetric] = useState<Metric>('weight');

  if (names.length === 0) {
    return (
      <section className="card">
        <p className="muted">무게를 넣어 운동을 기록하면 종목별 그래프가 나타납니다.</p>
      </section>
    );
  }

  const current = names.includes(name) ? name : names[0];
  const hist = exerciseHistory(workouts, current);
  const first = hist[0];
  const last = hist[hist.length - 1];
  const pr = hist.reduce((a, d) => (d.best1RM > a.best1RM ? d : a), hist[0]);

  const series =
    metric === 'weight'
      ? [
          { label: '최고 중량', color: 'var(--accent)', points: hist.map((d) => ({ date: d.date, value: d.maxWeight })) },
          { label: '추정 1RM', color: 'var(--accent-2)', points: hist.map((d) => ({ date: d.date, value: d.best1RM })) },
        ]
      : [{ label: '볼륨', color: 'var(--accent)', points: hist.map((d) => ({ date: d.date, value: d.volume })) }];

  return (
    <section className="card form">
      <select value={current} onChange={(e) => setName(e.target.value)}>
        {names.map((n) => <option key={n}>{n}</option>)}
      </select>
      <div className="segmented">
        <button type="button" className={metric === 'weight' ? 'active' : ''} onClick={() => setMetric('weight')}>중량</button>
        <button type="button" className={metric === 'volume' ? 'active' : ''} onClick={() => setMetric('volume')}>볼륨</button>
      </div>

      {hist.length >= 2 ? (
        <LineChart series={series} unit="kg" />
      ) : (
        <p className="muted small">기록이 2회 이상 쌓이면 그래프가 그려집니다.</p>
      )}

      <div className="stats">
        <div><b>{pr.best1RM}</b><span>kg 최고 추정 1RM</span></div>
        <div><b>{hist.length}</b><span>회 기록</span></div>
        {hist.length >= 2 && (
          <div>
            <b>{last.maxWeight - first.maxWeight >= 0 ? '+' : ''}{last.maxWeight - first.maxWeight}</b>
            <span>kg 첫 기록 대비</span>
          </div>
        )}
      </div>
      <p className="muted small">최고 기록: {formatKoreanDate(pr.date)} · 추정 1RM은 Epley 공식 기준</p>
    </section>
  );
}
