// ===== 공통 데이터 타입 =====

export type ID = string;

/** 운동 세트 */
export interface WorkoutSet {
  reps: number;
  weight: number; // kg
}

/** 운동 종목 하나 (예: 벤치프레스) */
export interface Exercise {
  id: ID;
  name: string;
  category: ExerciseCategory;
  sets: WorkoutSet[];
}

export type ExerciseCategory = '가슴' | '등' | '하체' | '어깨' | '팔' | '복근' | '유산소' | '기타';

/** 하루 운동 기록 */
export interface WorkoutLog {
  id: ID;
  date: string; // YYYY-MM-DD
  exercises: Exercise[];
  durationMin?: number;
  memo?: string;
}

export type MealType = '아침' | '점심' | '저녁' | '간식';

/** 식단 기록 (음식 1개 단위) */
export interface MealEntry {
  id: ID;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  name: string;
  kcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
}

/** 신체 기록 */
export interface BodyLog {
  id: ID;
  date: string; // YYYY-MM-DD
  weight: number; // kg
  bodyFat?: number; // %
  muscle?: number; // kg (골격근량)
}

/** 목표 / 사용자 설정 */
export interface Goals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  targetWeight?: number;
  weeklyWorkouts: number;
}

/** 자주 먹는 음식 (즐겨찾기) */
export interface FoodPreset {
  id: ID;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** 운동 루틴 (즐겨찾기) */
export interface RoutinePreset {
  id: ID;
  name: string;
  exercises: Omit<Exercise, 'id'>[];
}
