import { getDatabase } from "./db";
import { convertAmount, getBaseCurrency } from "./currencyService";
import type {
  Budget,
  BudgetInput,
  BudgetStatus,
  BudgetSummary,
  BudgetUsage,
  UnbudgetedSpending
} from "../types/budget";

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export async function listBudgets(month: string): Promise<Budget[]> {
  validateMonth(month);

  const db = await getDatabase();

  return db.select<Budget[]>(
    `SELECT
      id,
      month,
      category,
      amount,
      base_currency,
      note,
      created_at,
      updated_at
    FROM budgets
    WHERE month = $1
    ORDER BY category ASC, id DESC`,
    [month]
  );
}

export async function getBudget(id: number): Promise<Budget | null> {
  const db = await getDatabase();
  const rows = await db.select<Budget[]>(
    `SELECT
      id,
      month,
      category,
      amount,
      base_currency,
      note,
      created_at,
      updated_at
    FROM budgets
    WHERE id = $1
    LIMIT 1`,
    [id]
  );

  return rows[0] ?? null;
}

export async function createBudget(input: BudgetInput): Promise<void> {
  validateBudgetInput(input);

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO budgets (
      month,
      category,
      amount,
      base_currency,
      note,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.month,
      input.category,
      Number(input.amount),
      normalizeCurrency(input.base_currency),
      normalizeOptionalText(input.note),
      now,
      now
    ]
  );
}

export async function updateBudget(
  id: number,
  input: BudgetInput
): Promise<void> {
  validateBudgetInput(input);

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE budgets
    SET
      month = $1,
      category = $2,
      amount = $3,
      base_currency = $4,
      note = $5,
      updated_at = $6
    WHERE id = $7`,
    [
      input.month,
      input.category,
      Number(input.amount),
      normalizeCurrency(input.base_currency),
      normalizeOptionalText(input.note),
      now,
      id
    ]
  );
}

export async function deleteBudget(id: number): Promise<void> {
  const db = await getDatabase();

  await db.execute("DELETE FROM budgets WHERE id = $1", [id]);
}

export async function getBudgetUsage(month: string): Promise<BudgetUsage[]> {
  validateMonth(month);

  const baseCurrency = await getBaseCurrency();
  const [budgets, actualByCategory] = await Promise.all([
    listBudgets(month),
    getExpenseTotalsByCategory(month, baseCurrency)
  ]);

  return budgets.map((budget) => {
    const budgetAmount = Number(budget.amount ?? 0);
    const actualAmount = actualByCategory.get(budget.category) ?? 0;
    const usagePercent =
      budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : actualAmount > 0 ? 100 : 0;

    return {
      budget_id: Number(budget.id ?? 0),
      month: budget.month,
      category: budget.category,
      budget_amount: budgetAmount,
      actual_amount: actualAmount,
      remaining_amount: budgetAmount - actualAmount,
      usage_percent: usagePercent,
      base_currency: budget.base_currency,
      status: getBudgetStatus(usagePercent)
    };
  });
}

export async function getBudgetSummary(month: string): Promise<BudgetSummary> {
  validateMonth(month);

  const baseCurrency = await getBaseCurrency();
  const [budgets, budgetUsages, actualByCategory] = await Promise.all([
    listBudgets(month),
    getBudgetUsage(month),
    getExpenseTotalsByCategory(month, baseCurrency)
  ]);
  const budgetCategories = new Set(budgets.map((budget) => budget.category));
  const unbudgetedCategories: UnbudgetedSpending[] = [];

  for (const [category, actualAmount] of actualByCategory.entries()) {
    if (!budgetCategories.has(category)) {
      unbudgetedCategories.push({
        month,
        category,
        actual_amount: actualAmount,
        base_currency: baseCurrency
      });
    }
  }

  unbudgetedCategories.sort(
    (left, right) => right.actual_amount - left.actual_amount
  );

  const totalBudget = budgetUsages.reduce(
    (total, usage) => total + usage.budget_amount,
    0
  );
  const actualSpending = budgetUsages.reduce(
    (total, usage) => total + usage.actual_amount,
    0
  );
  const unbudgetedSpending = unbudgetedCategories.reduce(
    (total, item) => total + item.actual_amount,
    0
  );
  const usagePercent =
    totalBudget > 0 ? (actualSpending / totalBudget) * 100 : actualSpending > 0 ? 100 : 0;

  return {
    month,
    totalBudget,
    actualSpending,
    remainingBudget: totalBudget - actualSpending,
    usagePercent,
    exceededCategoryCount: budgetUsages.filter(
      (usage) => usage.status === "exceeded"
    ).length,
    unbudgetedSpending,
    baseCurrency,
    hasCurrencyMismatch: budgets.some(
      (budget) => budget.base_currency !== baseCurrency
    ),
    budgetUsages,
    unbudgetedCategories
  };
}

export async function getExpenseTotalsByCategory(
  month: string,
  baseCurrency: string
): Promise<Map<string, number>> {
  validateMonth(month);

  const db = await getDatabase();
  const rows = await db.select<
    Array<{ category: string; amount: number; currency: string }>
  >(
    `SELECT
      category,
      amount,
      currency
    FROM transactions
    WHERE type = 'expense'
      AND substr(date, 1, 7) = $1
    ORDER BY category ASC, id ASC`,
    [month]
  );
  const totals = new Map<string, number>();

  for (const row of rows) {
    const convertedAmount = await convertAmount(
      Number(row.amount ?? 0),
      row.currency,
      baseCurrency
    );
    totals.set(row.category, (totals.get(row.category) ?? 0) + convertedAmount);
  }

  return totals;
}

function validateBudgetInput(input: BudgetInput): void {
  validateMonth(input.month);

  if (!input.category?.trim()) {
    throw new Error("Budget category is required.");
  }

  if (!Number.isFinite(Number(input.amount)) || Number(input.amount) < 0) {
    throw new Error("Budget amount must be greater than or equal to 0.");
  }

  if (!input.base_currency?.trim()) {
    throw new Error("Base currency is required.");
  }
}

function validateMonth(month: string): void {
  if (!MONTH_PATTERN.test(month)) {
    throw new Error("Month must use YYYY-MM format.");
  }
}

function getBudgetStatus(usagePercent: number): BudgetStatus {
  if (usagePercent >= 100) {
    return "exceeded";
  }

  if (usagePercent >= 80) {
    return "warning";
  }

  return "normal";
}

function normalizeCurrency(currency: string): string {
  return String(currency || "").trim().toUpperCase();
}

function normalizeOptionalText(value: unknown): string | null {
  const text = String(value ?? "").trim();

  return text || null;
}
