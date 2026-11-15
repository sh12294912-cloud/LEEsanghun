import { useState } from 'react';
import { useStore } from '../store/AppStore';
import { formatKoreanDate, today } from '../lib/date';
import type { MealEntry, MealType } from '../types';

const MEAL_TYPES: MealType[] = ['아침', '점심', '저녁', '간식'];
const empty = { name: '', kcal: '', protein: '', carbs: '', fat: '' };

/** 시간대에 맞는 기본 끼니 */
function defaultMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return '아침';
  if (h < 15) return '점심';
  if (h < 21) return '저녁';
  return '간식';
}

export default function Diet() {
  const { meals, addMeal, deleteMeal, foodPresets, addFoodPreset, deleteFoodPreset } = useStore();
  const [date, setDate] = useState(today());
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const [f, setF] = useState(empty);
  const [editFav, setEditFav] = useState(false);

  const dayMeals = meals.filter((m) => m.date === date);
  const total = dayMeals.reduce((a, m) => a + m.kcal, 0);
  const favNames = new Set(foodPresets.map((p) => p.name));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return;
    addMeal({
      date,
      mealType,
      name: f.name.trim(),
      kcal: Number(f.kcal) || 0,
      protein: Number(f.protein) || 0,
      carbs: Number(f.carbs) || 0,
      fat: Number(f.fat) || 0,
    });
    setF(empty);
  }

  function toggleFavorite(m: MealEntry) {
    const existing = foodPresets.find((p) => p.name === m.name);
    if (existing) deleteFoodPreset(existing.id);
    else addFoodPreset({ name: m.name, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat });
  }

  const field = (key: keyof typeof empty, label: string) => (
    <label>
      {label}
      <input inputMode="decimal" value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} />
    </label>
  );

  return (
    <div className="page">
      <h1>식단 기록</h1>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

      <div className="segmented">
        {MEAL_TYPES.map((t) => (
          <button type="button" key={t} className={t === mealType ? 'active' : ''} onClick={() => setMealType(t)}>
            {t}
          </button>
        ))}
      </div>

      <section className="card">
        <div className="card-head">
          <h2>⭐ 자주 먹는 음식</h2>
          {foodPresets.length > 0 && (
            <button className="ghost" onClick={() => setEditFav(!editFav)}>{editFav ? '완료' : '편집'}</button>
          )}
        </div>
        {foodPresets.length === 0 ? (
          <p className="muted small">기록한 음식 옆의 ☆를 누르면 여기에 추가되고, 한 번 탭으로 기록할 수 있어요.</p>
        ) : (
          <div className="chips">
            {foodPresets.map((p) => (
              <button
                key={p.id}
                className={`chip ${editFav ? 'removable' : ''}`}
                onClick={() =>
                  editFav
                    ? deleteFoodPreset(p.id)
                    : addMeal({ date, mealType, name: p.name, kcal: p.kcal, protein: p.protein, carbs: p.carbs, fat: p.fat })
                }
              >
                {p.name} <span className="muted">{editFav ? '✕' : `${p.kcal}`}</span>
              </button>
            ))}
          </div>
        )}
        {!editFav && foodPresets.length > 0 && (
          <p className="muted small">탭하면 <b>{mealType}</b>에 바로 추가됩니다.</p>
        )}
      </section>

      <form className="card form" onSubmit={submit}>
        <h2>직접 입력</h2>
        <input placeholder="음식명 (예: 닭가슴살 200g)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="row">
          {field('kcal', 'kcal')}
          {field('protein', '단백질')}
          {field('carbs', '탄수')}
          {field('fat', '지방')}
        </div>
        <button type="submit">{mealType}에 추가</button>
      </form>

      <section className="card">
        <div className="card-head">
          <h2>{formatKoreanDate(date)}</h2>
          <span className="muted">{total} kcal</span>
        </div>
        {MEAL_TYPES.map((t) => {
          const items = dayMeals.filter((m) => m.mealType === t);
          if (!items.length) return null;
          return (
            <div key={t}>
              <h3>{t}</h3>
              <ul className="list">
                {items.map((m) => (
                  <li key={m.id}>
                    <div>
                      <b>{m.name}</b>
                      <div className="muted small">
                        {m.kcal}kcal · 단 {m.protein}g · 탄 {m.carbs}g · 지 {m.fat}g
                      </div>
                    </div>
                    <div className="actions">
                      <button
                        className="ghost star"
                        aria-label="즐겨찾기"
                        onClick={() => toggleFavorite(m)}
                      >
                        {favNames.has(m.name) ? '⭐' : '☆'}
                      </button>
                      <button className="ghost" onClick={() => deleteMeal(m.id)}>삭제</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {!dayMeals.length && <p className="muted">기록이 없습니다.</p>}
      </section>
    </div>
  );
}
