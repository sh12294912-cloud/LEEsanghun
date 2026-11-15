import { Link } from 'react-router-dom';
import { useStore } from '../store/AppStore';
import { formatKoreanDate, lastNDays, today, weekdayOf } from '../lib/date';
import ProgressBar from '../components/ProgressBar';
import { useSync } from '../sync/SyncProvider';

export default function Dashboard() {
  const { meals, workouts, bodyLogs, goals } = useStore();
  const t = today();
  const sync = useSync();

  const todayMeals = meals.filter((m) => m.date === t);
  const sum = todayMeals.reduce(
    (a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const week = lastNDays(7);
  const workoutDays = new Set(workouts.filter((w) => week.includes(w.date)).map((w) => w.date));
  const latestBody = bodyLogs[0];
  const todayWorkout = workouts.find((w) => w.date === t);

  return (
    <div className="page">
      <div className="row-between title-row">
        <h1>{formatKoreanDate(t)}</h1>
        {sync.connected && (
          <Link to="/settings" className={`sync-dot ${sync.status}`} title={sync.error ?? '동기화'}>
            {sync.status === 'syncing' ? '⟳' : sync.status === 'error' ? '⚠︎' : '☁︎'}
          </Link>
        )}
      </div>

      <section className="card">
        <div className="card-head">
          <h2>오늘의 식단</h2>
          <Link to="/diet">기록 →</Link>
        </div>
        <ProgressBar label="칼로리" value={sum.kcal} max={goals.kcal} unit="kcal" />
        <ProgressBar label="단백질" value={sum.protein} max={goals.protein} unit="g" />
        <ProgressBar label="탄수화물" value={sum.carbs} max={goals.carbs} unit="g" />
        <ProgressBar label="지방" value={sum.fat} max={goals.fat} unit="g" />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>이번 주 운동</h2>
          <Link to="/workout">기록 →</Link>
        </div>
        <div className="week-dots">
          {week.map((d) => (
            <div key={d} className={`dot ${workoutDays.has(d) ? 'on' : ''}`} title={d}>
              {weekdayOf(d)}
            </div>
          ))}
        </div>
        <p className="muted">
          {workoutDays.size} / {goals.weeklyWorkouts}회 · 오늘{' '}
          {todayWorkout ? `${todayWorkout.exercises.length}개 종목 완료 ✅` : '아직 기록 없음'}
        </p>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>신체</h2>
          <Link to="/body">기록 →</Link>
        </div>
        {latestBody ? (
          <div className="stats">
            <div><b>{latestBody.weight}</b><span>kg</span></div>
            {latestBody.bodyFat != null && <div><b>{latestBody.bodyFat}</b><span>% 체지방</span></div>}
            {goals.targetWeight != null && (
              <div><b>{(latestBody.weight - goals.targetWeight).toFixed(1)}</b><span>kg 남음</span></div>
            )}
          </div>
        ) : (
          <p className="muted">체중을 기록해 보세요.</p>
        )}
      </section>
    </div>
  );
}
