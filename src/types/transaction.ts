export type TransactionType = "expense" | "income" | "adjustment" | "transfer";

export interface Transaction {
  id?: number;
  type: TransactionType;
  account_id: number;
  target_account_id?: number | null;
  date: string;
  amount: number;
  currency: string;
  category: string;
  merchant?: string | null;
  description?: string | null;
  is_reimbursable: number;
  created_at?: string;
  updated_at?: string;
  account_name?: string;
  target_account_name?: string | null;
}

export type TransactionInput = Omit<
  Transaction,
  "id" | "created_at" | "updated_at" | "account_name" | "target_account_name"
>;
