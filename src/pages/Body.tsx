import { useState } from 'react';
import { useStore } from '../store/AppStore';
import { formatKoreanDate, today } from '../lib/date';
import LineChart from '../components/LineChart';

export default function Body() {
  const { bodyLogs, addBodyLog, deleteBodyLog } = useStore();
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscle, setMuscle] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!weight) return;
    addBodyLog({
      date,
      weight: Number(weight),
      bodyFat: bodyFat ? Number(bodyFat) : undefined,
      muscle: muscle ? Number(muscle) : undefined,
    });
    setWeight('');
    setBodyFat('');
    setMuscle('');
  }

  // 체중 추이 (최근 30개)
  const recent = [...bodyLogs].slice(0, 30).reverse();
  const series = [
    { label: '체중', color: 'var(--accent)', points: recent.map((b) => ({ date: b.date, value: b.weight })) },
  ];
  const withFat = recent.filter((b) => b.bodyFat != null);

  return (
    <div className="page">
      <h1>신체 기록</h1>

      <form className="card form" onSubmit={submit}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="row">
          <label>체중(kg)<input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} /></label>
          <label>체지방(%)<input inputMode="decimal" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} /></label>
          <label>골격근(kg)<input inputMode="decimal" value={muscle} onChange={(e) => setMuscle(e.target.value)} /></label>
        </div>
        <button type="submit">저장</button>
      </form>

      {recent.length >= 2 && (
        <section className="card">
          <h2>체중 추이</h2>
          <LineChart series={series} unit="kg" />
          {withFat.length >= 2 && (
            <>
              <h3>체지방률</h3>
              <LineChart
                series={[{ label: '체지방', color: 'var(--accent-2)', points: withFat.map((b) => ({ date: b.date, value: b.bodyFat! })) }]}
                unit="%"
                height={130}
              />
            </>
          )}
        </section>
      )}

      <section className="card">
        <h2>기록</h2>
        {!bodyLogs.length && <p className="muted">기록이 없습니다.</p>}
        <ul className="list">
          {bodyLogs.map((b) => (
            <li key={b.id}>
              <div>
                <b>{b.weight}kg</b>
                <div className="muted small">
                  {formatKoreanDate(b.date)}
                  {b.bodyFat != null && ` · 체지방 ${b.bodyFat}%`}
                  {b.muscle != null && ` · 골격근 ${b.muscle}kg`}
                </div>
              </div>
              <button className="ghost" onClick={() => deleteBodyLog(b.id)}>삭제</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
