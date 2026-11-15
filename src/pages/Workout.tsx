import { useState } from 'react';
import { useStore } from '../store/AppStore';
import { formatKoreanDate, today } from '../lib/date';
import { uid } from '../lib/id';
import { exerciseNames } from '../lib/strength';
import ExerciseProgress from '../components/ExerciseProgress';
import type { Exercise, ExerciseCategory } from '../types';

const CATEGORIES: ExerciseCategory[] = ['가슴', '등', '하체', '어깨', '팔', '복근', '유산소', '기타'];

export default function Workout() {
  const { workouts, routines, addWorkout, updateWorkout, deleteWorkout, addRoutine, deleteRoutine } = useStore();
  const [view, setView] = useState<'log' | 'progress'>('log');
  const [date, setDate] = useState(today());
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('가슴');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [setCount, setSetCount] = useState('3');
  const [editRoutines, setEditRoutines] = useState(false);

  const log = workouts.find((w) => w.date === date);
  const knownNames = exerciseNames(workouts);

  function appendExercises(exs: Exercise[]) {
    if (log) updateWorkout({ ...log, exercises: [...log.exercises, ...exs] });
    else addWorkout({ date, exercises: exs });
  }

  /** 종목명을 고르면 지난번 기록(부위·무게·횟수·세트)을 채워줌 */
  function onNameChange(v: string) {
    setName(v);
    for (const w of [...workouts].sort((a, b) => b.date.localeCompare(a.date))) {
      const prev = w.exercises.find((e) => e.name === v);
      if (prev) {
        setCategory(prev.category);
        setWeight(String(prev.sets[0]?.weight ?? ''));
        setReps(String(prev.sets[0]?.reps ?? ''));
        setSetCount(String(prev.sets.length));
        return;
      }
    }
  }

  function addExercise(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const n = Math.max(1, Number(setCount) || 1);
    appendExercises([
      {
        id: uid(),
        name: name.trim(),
        category,
        sets: Array.from({ length: n }, () => ({ reps: Number(reps) || 0, weight: Number(weight) || 0 })),
      },
    ]);
    setName('');
  }

  function removeExercise(exId: string) {
    if (!log) return;
    const rest = log.exercises.filter((x) => x.id !== exId);
    if (rest.length === 0) deleteWorkout(log.id);
    else updateWorkout({ ...log, exercises: rest });
  }

  function saveAsRoutine() {
    if (!log) return;
    const rName = prompt('루틴 이름 (예: 가슴·삼두 데이)');
    if (!rName?.trim()) return;
    addRoutine({ name: rName.trim(), exercises: log.exercises.map(({ id: _id, ...rest }) => rest) });
  }

  const volume = (ex: Exercise) => ex.sets.reduce((a, s) => a + s.reps * s.weight, 0);
  const history = [...workouts]
    .filter((w) => w.date !== date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  return (
    <div className="page">
      <h1>운동</h1>
      <div className="segmented">
        <button type="button" className={view === 'log' ? 'active' : ''} onClick={() => setView('log')}>기록</button>
        <button type="button" className={view === 'progress' ? 'active' : ''} onClick={() => setView('progress')}>성장 그래프</button>
      </div>

      {view === 'progress' ? (
        <ExerciseProgress />
      ) : (
        <>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          {routines.length > 0 && (
            <section className="card">
              <div className="card-head">
                <h2>⭐ 내 루틴</h2>
                <button className="ghost" onClick={() => setEditRoutines(!editRoutines)}>
                  {editRoutines ? '완료' : '편집'}
                </button>
              </div>
              <div className="chips">
                {routines.map((r) => (
                  <button
                    key={r.id}
                    className={`chip ${editRoutines ? 'removable' : ''}`}
                    onClick={() =>
                      editRoutines
                        ? confirm(`'${r.name}' 루틴을 삭제할까요?`) && deleteRoutine(r.id)
                        : appendExercises(r.exercises.map((e) => ({ ...e, id: uid() })))
                    }
                  >
                    {r.name} <span className="muted">{editRoutines ? '✕' : `${r.exercises.length}종목`}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <form className="card form" onSubmit={addExercise}>
            <h2>종목 추가</h2>
            <input
              placeholder="종목명 (예: 벤치프레스)"
              list="exercise-names"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
            <datalist id="exercise-names">
              {knownNames.map((n) => <option key={n} value={n} />)}
            </datalist>
            <select value={category} onChange={(e) => setCategory(e.target.value as ExerciseCategory)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <div className="row">
              <label>무게(kg)<input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} /></label>
              <label>횟수<input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} /></label>
              <label>세트<input inputMode="numeric" value={setCount} onChange={(e) => setSetCount(e.target.value)} /></label>
            </div>
            <button type="submit">추가</button>
          </form>

          <section className="card">
            <h2>{formatKoreanDate(date)}</h2>
            {!log && <p className="muted">기록이 없습니다.</p>}
            <ul className="list">
              {log?.exercises.map((ex) => (
                <li key={ex.id}>
                  <div>
                    <b>{ex.name}</b> <span className="tag">{ex.category}</span>
                    <div className="muted small">
                      {ex.sets.map((s) => `${s.weight}kg×${s.reps}`).join(' · ')} · 볼륨 {volume(ex)}kg
                    </div>
                  </div>
                  <button className="ghost" onClick={() => removeExercise(ex.id)}>삭제</button>
                </li>
              ))}
            </ul>
            {log && (
              <button type="button" className="secondary" onClick={saveAsRoutine}>⭐ 이 운동을 루틴으로 저장</button>
            )}
          </section>

          {history.length > 0 && (
            <section className="card">
              <h2>최근 기록</h2>
              <ul className="list">
                {history.map((w) => (
                  <li key={w.id} onClick={() => setDate(w.date)} className="clickable">
                    <span>{formatKoreanDate(w.date)}</span>
                    <span className="muted small">{w.exercises.map((e) => e.name).join(', ')}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
