export type ActivityStatus =
  | "watching"
  | "eligible"
  | "joined"
  | "completed"
  | "skipped"
  | "expired";

export type ActivityCategory =
  | "credit_card"
  | "hotel"
  | "airline"
  | "shopping"
  | "student_discount"
  | "campus"
  | "telecom"
  | "subscription"
  | "membership_match"
  | "cashback"
  | "points_purchase"
  | "other";

export type ActivityPriority = "low" | "medium" | "high";

export interface Activity {
  id?: number;
  title: string;
  platform?: string | null;
  category: ActivityCategory;
  start_date?: string | null;
  end_date?: string | null;
  status: ActivityStatus;
  requirement?: string | null;
  estimated_cost: number;
  estimated_value: number;
  actual_cost?: number | null;
  actual_value?: number | null;
  url?: string | null;
  priority?: ActivityPriority | null;
  tags?: string | null;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ActivityInput = Omit<Activity, "id" | "created_at" | "updated_at">;
