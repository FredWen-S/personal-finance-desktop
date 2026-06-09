import { getDatabase } from "./db";
import type {
  AccountBalanceReportItem,
  ActivityCategoryReportItem,
  ActivityStatusReportItem,
  BudgetVsActualReportItem,
  ExpenseCategoryItem,
  MonthlyCashFlowItem,
  PointValueReportItem,
  ReportData,
  SubscriptionCategoryReportItem,
  SubscriptionCycleReportItem,
  TopMerchantItem
} from "../types/report";
import { convertAmount, getBaseCurrency } from "./currencyService";
import { getBudgetUsage } from "./budgetService";

export async function getMonthlyCashFlow(
  months: number
): Promise<MonthlyCashFlowItem[]> {
  const monthCount = clampInteger(months, 1, 36);
  const monthList = getRecentMonths(monthCount);
  const db = await getDatabase();
  const baseCurrency = await getBaseCurrency();

  const rows = await db.select<
    Array<{
      month: string;
      type: string;
      amount: number;
      currency: string;
    }>
  >(
    `SELECT
      substr(date, 1, 7) AS month,
      type,
      amount,
      currency
    FROM transactions
    WHERE substr(date, 1, 7) >= $1
      AND substr(date, 1, 7) <= $2
      AND type IN ('income', 'expense')
    ORDER BY month ASC, id ASC`,
    [monthList[0], monthList[monthList.length - 1]]
  );

  const monthlyTotals = new Map<string, { income: number; expense: number }>();

  for (const month of monthList) {
    monthlyTotals.set(month, { income: 0, expense: 0 });
  }

  for (const row of rows) {
    const totals = monthlyTotals.get(row.month);

    if (!totals) {
      continue;
    }

    const convertedAmount = await convertAmount(
      Number(row.amount ?? 0),
      row.currency,
      baseCurrency
    );

    if (row.type === "income") {
      totals.income += convertedAmount;
    } else if (row.type === "expense") {
      totals.expense += convertedAmount;
    }
  }

  return monthList.map((month) => {
    const totals = monthlyTotals.get(month) ?? { income: 0, expense: 0 };
    const income = totals.income;
    const expense = totals.expense;

    return {
      month,
      income,
      expense,
      net: income - expense,
      base_currency: baseCurrency
    };
  });
}

export async function getExpenseByCategory(
  month: string
): Promise<ExpenseCategoryItem[]> {
  const db = await getDatabase();
  const baseCurrency = await getBaseCurrency();

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

  const categoryTotals = new Map<string, number>();

  for (const row of rows) {
    const convertedAmount = await convertAmount(
      Number(row.amount ?? 0),
      row.currency,
      baseCurrency
    );
    categoryTotals.set(
      row.category,
      (categoryTotals.get(row.category) ?? 0) + convertedAmount
    );
  }

  return [...categoryTotals.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      base_currency: baseCurrency
    }))
    .sort((left, right) => right.amount - left.amount);
}

export async function getAccountBalanceReport(): Promise<
  AccountBalanceReportItem[]
> {
  const db = await getDatabase();
  const baseCurrency = await getBaseCurrency();

  const rows = await db.select<
    Array<
      Omit<
        AccountBalanceReportItem,
        | "converted_balance"
        | "asset_amount"
        | "liability_amount"
        | "balance_role"
        | "base_currency"
      >
    >
  >(
    `SELECT
      name AS account_name,
      type,
      currency,
      balance,
      institution
    FROM accounts
    WHERE is_active = 1
    ORDER BY balance DESC, id DESC`
  );

  const convertedRows: AccountBalanceReportItem[] = [];

  for (const row of rows) {
    const convertedBalance = await convertAmount(
      Number(row.balance ?? 0),
      row.currency,
      baseCurrency
    );
    const isCreditCard = row.type === "credit_card";
    const assetAmount = isCreditCard
      ? Math.max(-convertedBalance, 0)
      : Math.max(convertedBalance, 0);
    const liabilityAmount = isCreditCard
      ? Math.max(convertedBalance, 0)
      : Math.max(-convertedBalance, 0);

    convertedRows.push({
      ...row,
      converted_balance: convertedBalance,
      asset_amount: assetAmount,
      liability_amount: liabilityAmount,
      balance_role: liabilityAmount > assetAmount ? "liability" : "asset",
      base_currency: baseCurrency
    });
  }

  return convertedRows.sort(
    (left, right) =>
      right.asset_amount +
      right.liability_amount -
      (left.asset_amount + left.liability_amount)
  );
}

export async function getPointValueReport(): Promise<PointValueReportItem[]> {
  const db = await getDatabase();

  return db.select<PointValueReportItem[]>(
    `SELECT
      name,
      type,
      balance,
      value_per_point,
      balance * COALESCE(value_per_point, 0) AS estimated_value,
      tier,
      expire_date
    FROM point_programs
    WHERE is_active = 1
    ORDER BY estimated_value DESC, id DESC`
  );
}

export async function getActivityStatusReport(): Promise<
  ActivityStatusReportItem[]
> {
  const db = await getDatabase();

  return db.select<ActivityStatusReportItem[]>(
    `SELECT
      status,
      COUNT(*) AS count
    FROM activities
    GROUP BY status
    ORDER BY count DESC, status ASC`
  );
}

export async function getActivityCategoryReport(): Promise<
  ActivityCategoryReportItem[]
> {
  const db = await getDatabase();

  return db.select<ActivityCategoryReportItem[]>(
    `SELECT
      category,
      COUNT(*) AS count,
      COALESCE(SUM(estimated_value - estimated_cost), 0) AS estimated_net_value
    FROM activities
    GROUP BY category
    ORDER BY estimated_net_value DESC, count DESC, category ASC`
  );
}

export async function getTopMerchants(
  month: string,
  limit: number
): Promise<TopMerchantItem[]> {
  const db = await getDatabase();
  const baseCurrency = await getBaseCurrency();
  const safeLimit = clampInteger(limit, 1, 50);

  const rows = await db.select<
    Array<{ merchant: string; amount: number; currency: string }>
  >(
    `SELECT
      merchant,
      amount,
      currency
    FROM transactions
    WHERE type = 'expense'
      AND substr(date, 1, 7) = $1
      AND merchant IS NOT NULL
      AND trim(merchant) != ''
    ORDER BY id ASC`,
    [month]
  );

  const merchantTotals = new Map<string, number>();

  for (const row of rows) {
    const convertedAmount = await convertAmount(
      Number(row.amount ?? 0),
      row.currency,
      baseCurrency
    );
    merchantTotals.set(
      row.merchant,
      (merchantTotals.get(row.merchant) ?? 0) + convertedAmount
    );
  }

  return [...merchantTotals.entries()]
    .map(([merchant, amount]) => ({
      merchant,
      amount,
      base_currency: baseCurrency
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, safeLimit);
}

export async function getSubscriptionCategoryReport(): Promise<
  SubscriptionCategoryReportItem[]
> {
  const db = await getDatabase();
  const baseCurrency = await getBaseCurrency();
  const rows = await db.select<
    Array<{ category: string; amount: number; currency: string }>
  >(
    `SELECT
      category,
      amount,
      currency
    FROM subscriptions
    WHERE status IN ('active', 'trial')
    ORDER BY category ASC, id ASC`
  );
  const totals = new Map<string, { amount: number; count: number }>();

  for (const row of rows) {
    const convertedAmount = await convertAmount(
      Number(row.amount ?? 0),
      row.currency,
      baseCurrency
    );
    const current = totals.get(row.category) ?? { amount: 0, count: 0 };
    current.amount += convertedAmount;
    current.count += 1;
    totals.set(row.category, current);
  }

  return [...totals.entries()]
    .map(([category, value]) => ({
      category,
      amount: value.amount,
      count: value.count,
      base_currency: baseCurrency
    }))
    .sort((left, right) => right.amount - left.amount);
}

export async function getSubscriptionCycleReport(): Promise<
  SubscriptionCycleReportItem[]
> {
  const db = await getDatabase();

  return db.select<SubscriptionCycleReportItem[]>(
    `SELECT
      billing_cycle,
      COUNT(*) AS count
    FROM subscriptions
    GROUP BY billing_cycle
    ORDER BY count DESC, billing_cycle ASC`
  );
}

export async function getBudgetVsActualReport(
  month: string
): Promise<BudgetVsActualReportItem[]> {
  const usageRows = await getBudgetUsage(month);

  return usageRows
    .map((usage) => ({
      category: usage.category,
      budget_amount: usage.budget_amount,
      actual_amount: usage.actual_amount,
      base_currency: usage.base_currency
    }))
    .sort((left, right) => right.budget_amount - left.budget_amount);
}

export async function getReportData(month: string): Promise<ReportData> {
  const baseCurrency = await getBaseCurrency();
  const [
    monthlyCashFlow,
    expenseByCategory,
    accountBalances,
    pointValues,
    activityStatuses,
    activityCategories,
    topMerchants,
    subscriptionCategories,
    subscriptionCycles,
    budgetVsActual
  ] = await Promise.all([
    getMonthlyCashFlow(6),
    getExpenseByCategory(month),
    getAccountBalanceReport(),
    getPointValueReport(),
    getActivityStatusReport(),
    getActivityCategoryReport(),
    getTopMerchants(month, 10),
    getSubscriptionCategoryReport(),
    getSubscriptionCycleReport(),
    getBudgetVsActualReport(month)
  ]);

  return {
    month,
    baseCurrency,
    monthlyCashFlow,
    expenseByCategory,
    accountBalances,
    pointValues,
    activityStatuses,
    activityCategories,
    topMerchants,
    subscriptionCategories,
    subscriptionCycles,
    budgetVsActual
  };
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function getRecentMonths(count: number): string[] {
  const months: string[] = [];
  const date = new Date();
  date.setDate(1);

  for (let index = count - 1; index >= 0; index -= 1) {
    const monthDate = new Date(date.getFullYear(), date.getMonth() - index, 1);
    months.push(formatMonth(monthDate));
  }

  return months;
}

function formatMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}
