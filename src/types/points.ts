export type PointProgramType =
  | "airline"
  | "hotel"
  | "credit_card"
  | "cashback"
  | "membership"
  | "coupon"
  | "other";

export type PointTransactionType =
  | "earn"
  | "redeem"
  | "expire"
  | "adjustment"
  | "transfer";

export interface PointProgram {
  id?: number;
  name: string;
  type: PointProgramType;
  balance: number;
  tier?: string | null;
  expire_date?: string | null;
  value_per_point?: number | null;
  institution?: string | null;
  account_number?: string | null;
  login_url?: string | null;
  is_active: number;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type PointProgramInput = Omit<
  PointProgram,
  "id" | "created_at" | "updated_at"
>;

export interface PointTransaction {
  id?: number;
  program_id: number;
  date: string;
  type: PointTransactionType;
  points: number;
  description?: string | null;
  related_cash_value?: number | null;
  expire_date?: string | null;
  created_at?: string;
  updated_at?: string;
  program_name?: string;
}

export type PointTransactionInput = Omit<
  PointTransaction,
  "id" | "created_at" | "updated_at" | "program_name"
>;
