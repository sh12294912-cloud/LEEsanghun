import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLocalStorage } from '../lib/useLocalStorage';
import { uid } from '../lib/id';
import type { Snapshot } from '../sync/snapshot';
import type { BodyLog, FoodPreset, Goals, MealEntry, RoutinePreset, WorkoutLog } from '../types';

const DEFAULT_GOALS: Goals = {
  kcal: 2200,
  protein: 140,
  carbs: 250,
  fat: 60,
  weeklyWorkouts: 4,
};

interface AppStore {
  workouts: WorkoutLog[];
  meals: MealEntry[];
  bodyLogs: BodyLog[];
  goals: Goals;
  foodPresets: FoodPreset[];
  routines: RoutinePreset[];

  addWorkout: (w: Omit<WorkoutLog, 'id'>) => void;
  updateWorkout: (w: WorkoutLog) => void;
  deleteWorkout: (id: string) => void;

  addMeal: (m: Omit<MealEntry, 'id'>) => void;
  deleteMeal: (id: string) => void;

  addBodyLog: (b: Omit<BodyLog, 'id'>) => void;
  deleteBodyLog: (id: string) => void;

  setGoals: (g: Goals) => void;

  addFoodPreset: (f: Omit<FoodPreset, 'id'>) => void;
  deleteFoodPreset: (id: string) => void;
  addRoutine: (r: Omit<RoutinePreset, 'id'>) => void;
  deleteRoutine: (id: string) => void;

  snapshot: Snapshot;
  /** 전체 데이터 교체 (동기화/불러오기). 실제 적용된 정규화 데이터를 반환 */
  applySnapshot: (s: Partial<Snapshot>) => Snapshot;
  exportData: () => string;
  importData: (json: string) => void;
  resetAll: () => void;
}

const Ctx = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [workouts, setWorkouts] = useLocalStorage<WorkoutLog[]>('fit.workouts', []);
  const [meals, setMeals] = useLocalStorage<MealEntry[]>('fit.meals', []);
  const [bodyLogs, setBodyLogs] = useLocalStorage<BodyLog[]>('fit.body', []);
  const [goals, setGoals] = useLocalStorage<Goals>('fit.goals', DEFAULT_GOALS);
  const [foodPresets, setFoodPresets] = useLocalStorage<FoodPreset[]>('fit.foodPresets', []);
  const [routines, setRoutines] = useLocalStorage<RoutinePreset[]>('fit.routines', []);

  const snapshot: Snapshot = useMemo(
    () => ({ workouts, meals, bodyLogs, goals, foodPresets, routines }),
    [workouts, meals, bodyLogs, goals, foodPresets, routines],
  );

  function applySnapshot(d: Partial<Snapshot>): Snapshot {
    const next: Snapshot = {
      workouts: Array.isArray(d.workouts) ? d.workouts : workouts,
      meals: Array.isArray(d.meals) ? d.meals : meals,
      bodyLogs: Array.isArray(d.bodyLogs) ? d.bodyLogs : bodyLogs,
      goals: d.goals ? { ...DEFAULT_GOALS, ...d.goals } : goals,
      foodPresets: Array.isArray(d.foodPresets) ? d.foodPresets : foodPresets,
      routines: Array.isArray(d.routines) ? d.routines : routines,
    };
    setWorkouts(next.workouts);
    setMeals(next.meals);
    setBodyLogs(next.bodyLogs);
    setGoals(next.goals);
    setFoodPresets(next.foodPresets);
    setRoutines(next.routines);
    return next;
  }

  const store: AppStore = {
    workouts,
    meals,
    bodyLogs,
    goals,
    foodPresets,
    routines,

    addWorkout: (w) => setWorkouts((prev) => [{ ...w, id: uid() }, ...prev]),
    updateWorkout: (w) => setWorkouts((prev) => prev.map((x) => (x.id === w.id ? w : x))),
    deleteWorkout: (id) => setWorkouts((prev) => prev.filter((x) => x.id !== id)),

    addMeal: (m) => setMeals((prev) => [{ ...m, id: uid() }, ...prev]),
    deleteMeal: (id) => setMeals((prev) => prev.filter((x) => x.id !== id)),

    addBodyLog: (b) =>
      setBodyLogs((prev) =>
        [{ ...b, id: uid() }, ...prev.filter((x) => x.date !== b.date)].sort((a, c) =>
          c.date.localeCompare(a.date),
        ),
      ),
    deleteBodyLog: (id) => setBodyLogs((prev) => prev.filter((x) => x.id !== id)),

    setGoals,

    addFoodPreset: (f) =>
      setFoodPresets((prev) => [{ ...f, id: uid() }, ...prev.filter((x) => x.name !== f.name)]),
    deleteFoodPreset: (id) => setFoodPresets((prev) => prev.filter((x) => x.id !== id)),
    addRoutine: (r) =>
      setRoutines((prev) => [{ ...r, id: uid() }, ...prev.filter((x) => x.name !== r.name)]),
    deleteRoutine: (id) => setRoutines((prev) => prev.filter((x) => x.id !== id)),

    snapshot,
    applySnapshot,
    exportData: () => JSON.stringify({ version: 2, ...snapshot }, null, 2),
    importData: (json) => {
      applySnapshot(JSON.parse(json));
    },
    resetAll: () => {
      setWorkouts([]);
      setMeals([]);
      setBodyLogs([]);
      setGoals(DEFAULT_GOALS);
      setFoodPresets([]);
      setRoutines([]);
    },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): AppStore {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside AppStoreProvider');
  return s;
}
