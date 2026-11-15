import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/AppStore';
import { useLocalStorage } from '../lib/useLocalStorage';
import { prepareImage, type PreparedImage } from '../lib/image';
import type { AnalyzedFood, FoodAnalysis } from '../ai/foodAnalysis';
import type { MealType } from '../types';

export const API_KEY_STORAGE = 'fit.anthropicKey';

interface Row extends AnalyzedFood {
  include: boolean;
}

const CONF_LABEL = { high: '정확도 높음', medium: '정확도 보통', low: '정확도 낮음' } as const;

export default function PhotoMealCard({ date, mealType }: { date: string; mealType: MealType }) {
  const { addMeal } = useStore();
  const [apiKey] = useLocalStorage(API_KEY_STORAGE, '');
  const [image, setImage] = useState<PreparedImage>();
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<FoodAnalysis>();
  const [rows, setRows] = useState<Row[]>([]);
  const [savedMsg, setSavedMsg] = useState<string>();
  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);

  async function analyze(img: PreparedImage, memo: string) {
    setBusy(true);
    setError(undefined);
    setResult(undefined);
    // Claude SDK는 사진 분석 때만 불러옴 (첫 로딩을 가볍게)
    const ai = await import('../ai/foodAnalysis').catch(() => null);
    if (!ai) {
      setError('분석 모듈을 불러오지 못했습니다. 네트워크를 확인해 주세요.');
      setBusy(false);
      return;
    }
    try {
      const r = await ai.analyzeFoodPhoto(apiKey, img, memo);
      setResult(r);
      setRows(r.items.map((it) => ({ ...it, include: true })));
      if (r.items.length === 0) setError(r.notes || '음식을 찾지 못했습니다.');
    } catch (e) {
      setError(e instanceof ai.FoodAnalysisError ? e.message : '분석 중 문제가 생겼습니다. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSavedMsg(undefined);
    setHint('');
    try {
      const img = await prepareImage(file);
      setImage(img);
      analyze(img, '');
    } catch {
      setError('사진을 읽을 수 없습니다. 다른 사진으로 시도해 주세요.');
    }
  }

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function saveAll() {
    const chosen = rows.filter((r) => r.include && r.name.trim());
    for (const r of chosen) {
      addMeal({
        date,
        mealType,
        name: r.portion ? `${r.name} (${r.portion})` : r.name,
        kcal: r.kcal,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
      });
    }
    setSavedMsg(`${mealType}에 ${chosen.length}개 기록했어요 ✓`);
    setImage(undefined);
    setResult(undefined);
    setRows([]);
  }

  const total = rows.filter((r) => r.include).reduce((a, r) => a + r.kcal, 0);

  if (!apiKey) {
    return (
      <section className="card">
        <h2>📷 사진으로 기록</h2>
        <p className="muted small">
          음식 사진을 찍으면 Claude가 영양 성분을 분석해 기록해 줍니다. 먼저{' '}
          <Link to="/settings">설정</Link>에서 Claude API 키를 등록해 주세요.
        </p>
      </section>
    );
  }

  const numField = (i: number, key: 'kcal' | 'protein' | 'carbs' | 'fat', label: string) => (
    <label>
      {label}
      <input
        inputMode="decimal"
        value={rows[i][key]}
        onChange={(e) => update(i, { [key]: Number(e.target.value) || 0 })}
      />
    </label>
  );

  return (
    <section className="card form">
      <h2>📷 사진으로 기록</h2>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={albumRef} type="file" accept="image/*" hidden onChange={onFile} />

      {!image && (
        <div className="row">
          <button type="button" onClick={() => cameraRef.current?.click()}>📷 촬영</button>
          <button type="button" className="secondary-btn" onClick={() => albumRef.current?.click()}>🖼️ 앨범</button>
        </div>
      )}
      {savedMsg && <p className="small" style={{ color: 'var(--accent)' }}>{savedMsg}</p>}

      {image && (
        <div className="photo-wrap">
          <img src={image.dataUrl} alt="음식 사진" className="photo" />
          {busy && <div className="photo-overlay"><span className="spinner" /> 분석 중… (10~30초)</div>}
        </div>
      )}

      {error && <p className="text-warn small">{error}</p>}

      {result && rows.length > 0 && (
        <>
          <div className="card-head">
            <span className="small"><b>{Math.round(total)} kcal</b> · {CONF_LABEL[result.confidence]}</span>
          </div>
          {result.notes && <p className="muted small">{result.notes}</p>}
          <ul className="list">
            {rows.map((r, i) => (
              <li key={i} className={`ai-item ${r.include ? '' : 'excluded'}`}>
                <div className="ai-item-head">
                  <input
                    type="checkbox"
                    checked={r.include}
                    onChange={(e) => update(i, { include: e.target.checked })}
                    aria-label="포함"
                  />
                  <input className="ai-name" value={r.name} onChange={(e) => update(i, { name: e.target.value })} />
                  <span className="muted small">{r.portion}</span>
                </div>
                <div className="row">
                  {numField(i, 'kcal', 'kcal')}
                  {numField(i, 'protein', '단백질')}
                  {numField(i, 'carbs', '탄수')}
                  {numField(i, 'fat', '지방')}
                </div>
              </li>
            ))}
          </ul>
          <button type="button" onClick={saveAll} disabled={!rows.some((r) => r.include)}>
            {mealType}에 기록하기
          </button>
        </>
      )}

      {image && !busy && (
        <>
          <input
            placeholder="정정 메모 (예: 밥은 반 공기만 먹었어)"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
          />
          <div className="row">
            <button type="button" className="secondary-btn" onClick={() => analyze(image, hint)}>🔄 다시 분석</button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => { setImage(undefined); setResult(undefined); setRows([]); setError(undefined); }}
            >
              취소
            </button>
          </div>
        </>
      )}
    </section>
  );
}
