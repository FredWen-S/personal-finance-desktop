export interface Account {
  id?: number;
  name: string;
  type: string;
  currency: string;
  balance: number;
  institution?: string;
  note?: string;
  credit_limit?: number;
  statement_day?: number | null;
  due_day?: number | null;
  card_network?: string | null;
  last_four?: string | null;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export type AccountInput = Omit<Account, "id" | "created_at" | "updated_at">;
