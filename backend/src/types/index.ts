export interface Workout {
  id: number;
  logged_at: string;
  date: string;
  type: string;
  duration_min: number | null;
  distance_km: number | null;
  notes: string | null;
  is_detailed: number;
}

export interface WorkoutExercise {
  id: number;
  workout_id: number;
  name: string;
  position: number;
  notes: string | null;
}

export interface ExerciseSet {
  id: number;
  exercise_id: number;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_sec: number | null;
  notes: string | null;
}

export interface Meal {
  id: number;
  logged_at: string;
  date: string;
  meal_type: string | null;
  description: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  notes: string | null;
}

export interface Shake {
  id: number;
  logged_at: string;
  date: string;
  name: string;
  brand: string | null;
  serving_g: number | null;
  calories: number | null;
  protein_g: number | null;
  notes: string | null;
}

export interface Vitamin {
  id: number;
  logged_at: string;
  date: string;
  name: string;
  dose_mg: number | null;
  quantity: number;
  notes: string | null;
}

export interface WaterLog {
  id: number;
  logged_at: string;
  date: string;
  amount_ml: number;
}

export interface PushSubscription {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}
