import type { WorkoutLog } from '../types';

/** Epley 공식으로 추정 1RM */
export const estimate1RM = (weight: number, reps: number) =>
  reps <= 1 ? weight : Math.round(weight * (1 + reps / 30) * 10) / 10;

export interface ExerciseDay {
  date: string;
  maxWeight: number;
  best1RM: number;
  volume: number;
}

/** 특정 종목의 날짜별 기록 요약 (날짜 오름차순) */
export function exerciseHistory(workouts: WorkoutLog[], name: string): ExerciseDay[] {
  const byDate = new Map<string, ExerciseDay>();
  for (const w of workouts) {
    for (const ex of w.exercises) {
      if (ex.name !== name) continue;
      const d = byDate.get(w.date) ?? { date: w.date, maxWeight: 0, best1RM: 0, volume: 0 };
      for (const s of ex.sets) {
        d.maxWeight = Math.max(d.maxWeight, s.weight);
        d.best1RM = Math.max(d.best1RM, estimate1RM(s.weight, s.reps));
        d.volume += s.weight * s.reps;
      }
      byDate.set(w.date, d);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** 기록된 종목 이름 (최근에 한 순서) */
export function exerciseNames(workouts: WorkoutLog[]): string[] {
  const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
  return [...new Set(sorted.flatMap((w) => w.exercises.map((e) => e.name)))];
}
