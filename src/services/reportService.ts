import { getDatabase } from "./db";
import type {
  AccountBalanceReportItem,
  ActivityCategoryReportItem,
  ActivityStatusReportItem,
  ExpenseCategoryItem,
  MonthlyCashFlowItem,
  PointValueReportItem,
  ReportData,
  TopMerchantItem
} from "../types/report";

export async function getMonthlyCashFlow(
  months: number
): Promise<MonthlyCashFlowItem[]> {
  const monthCount = clampInteger(months, 1, 36);
  const monthList = getRecentMonths(monthCount);
  const db = await getDatabase();

  const rows = await db.select<
    Array<{
      month: string;
      income: number | null;
      expense: number | null;
    }>
  >(
    `SELECT
      substr(date, 1, 7) AS month,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
    FROM transactions
    WHERE substr(date, 1, 7) >= $1
      AND substr(date, 1, 7) <= $2
    GROUP BY substr(date, 1, 7)
    ORDER BY month ASC`,
    [monthList[0], monthList[monthList.length - 1]]
  );

  const rowMap = new Map(rows.map((row) => [row.month, row]));

  return monthList.map((month) => {
    const row = rowMap.get(month);
    const income = Number(row?.income ?? 0);
    const expense = Number(row?.expense ?? 0);

    return {
      month,
      income,
      expense,
      net: income - expense
    };
  });
}

export async function getExpenseByCategory(
  month: string
): Promise<ExpenseCategoryItem[]> {
  const db = await getDatabase();

  return db.select<ExpenseCategoryItem[]>(
    `SELECT
      category,
      COALESCE(SUM(amount), 0) AS amount
    FROM transactions
    WHERE type = 'expense'
      AND substr(date, 1, 7) = $1
    GROUP BY category
    ORDER BY amount DESC`,
    [month]
  );
}

export async function getAccountBalanceReport(): Promise<
  AccountBalanceReportItem[]
> {
  const db = await getDatabase();

  return db.select<AccountBalanceReportItem[]>(
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
  const safeLimit = clampInteger(limit, 1, 50);

  return db.select<TopMerchantItem[]>(
    `SELECT
      merchant,
      COALESCE(SUM(amount), 0) AS amount
    FROM transactions
    WHERE type = 'expense'
      AND substr(date, 1, 7) = $1
      AND merchant IS NOT NULL
      AND trim(merchant) != ''
    GROUP BY merchant
    ORDER BY amount DESC
    LIMIT ${safeLimit}`,
    [month]
  );
}

export async function getReportData(month: string): Promise<ReportData> {
  const [
    monthlyCashFlow,
    expenseByCategory,
    accountBalances,
    pointValues,
    activityStatuses,
    activityCategories,
    topMerchants
  ] = await Promise.all([
    getMonthlyCashFlow(6),
    getExpenseByCategory(month),
    getAccountBalanceReport(),
    getPointValueReport(),
    getActivityStatusReport(),
    getActivityCategoryReport(),
    getTopMerchants(month, 10)
  ]);

  return {
    month,
    monthlyCashFlow,
    expenseByCategory,
    accountBalances,
    pointValues,
    activityStatuses,
    activityCategories,
    topMerchants
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
