import type { BodyLog, FoodPreset, Goals, MealEntry, RoutinePreset, WorkoutLog } from '../types';

/** 동기화/백업 단위가 되는 전체 데이터 */
export interface Snapshot {
  workouts: WorkoutLog[];
  meals: MealEntry[];
  bodyLogs: BodyLog[];
  goals: Goals;
  foodPresets: FoodPreset[];
  routines: RoutinePreset[];
}

/** 변경 감지용 해시 (FNV-1a) */
export function hashSnapshot(s: Snapshot): string {
  const str = JSON.stringify(s);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16) + ':' + str.length;
}

function unionById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const ids = new Set(local.map((x) => x.id));
  return [...local, ...remote.filter((x) => !ids.has(x.id))];
}

/**
 * 두 기기에서 동시에 바뀐 경우의 병합.
 * - 같은 id는 이 기기(local) 우선, 나머지는 합침 → 데이터가 사라지지 않음
 * - (단점) 다른 기기에서 삭제한 항목이 다시 살아날 수 있음
 */
export function mergeSnapshots(local: Snapshot, remote: Snapshot): Snapshot {
  // 운동: 같은 날짜는 하나의 기록으로 합침
  const byDate = new Map<string, WorkoutLog>();
  for (const w of [...local.workouts, ...remote.workouts]) {
    const cur = byDate.get(w.date);
    if (!cur) byDate.set(w.date, { ...w, exercises: [...w.exercises] });
    else cur.exercises = unionById(cur.exercises, w.exercises);
  }

  // 신체: 날짜당 하나 (local 우선)
  const bodyByDate = new Map<string, BodyLog>();
  for (const b of [...local.bodyLogs, ...remote.bodyLogs]) if (!bodyByDate.has(b.date)) bodyByDate.set(b.date, b);

  const byName = <T extends { id: string; name: string }>(l: T[], r: T[]) => {
    const names = new Set(l.map((x) => x.name));
    return [...l, ...r.filter((x) => !names.has(x.name))];
  };

  return {
    workouts: [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)),
    meals: unionById(local.meals, remote.meals),
    bodyLogs: [...bodyByDate.values()].sort((a, b) => b.date.localeCompare(a.date)),
    goals: local.goals,
    foodPresets: byName(local.foodPresets, remote.foodPresets),
    routines: byName(local.routines, remote.routines),
  };
}
