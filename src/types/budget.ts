export type BudgetStatus = "normal" | "warning" | "exceeded";

export interface Budget {
  id?: number;
  month: string;
  category: string;
  amount: number;
  base_currency: string;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type BudgetInput = Omit<
  Budget,
  "id" | "created_at" | "updated_at"
>;

export interface BudgetUsage {
  budget_id: number;
  month: string;
  category: string;
  budget_amount: number;
  actual_amount: number;
  remaining_amount: number;
  usage_percent: number;
  base_currency: string;
  status: BudgetStatus;
}

export interface UnbudgetedSpending {
  month: string;
  category: string;
  actual_amount: number;
  base_currency: string;
}

export interface BudgetSummary {
  month: string;
  totalBudget: number;
  actualSpending: number;
  remainingBudget: number;
  usagePercent: number;
  exceededCategoryCount: number;
  unbudgetedSpending: number;
  baseCurrency: string;
  hasCurrencyMismatch: boolean;
  budgetUsages: BudgetUsage[];
  unbudgetedCategories: UnbudgetedSpending[];
}
