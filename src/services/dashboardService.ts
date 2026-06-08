import { getDatabase } from "./db";
import type {
  AccountSummary,
  ActivitySummary,
  CreditCardOverviewItem,
  DashboardData,
  DashboardRecentTransaction,
  MonthlyTransactionSummary,
  PointSummary
} from "../types/dashboard";
import type { Activity } from "../types/activity";
import type { PointProgram } from "../types/points";
import { convertAmount, getBaseCurrency } from "./currencyService";

export async function getAccountSummary(): Promise<AccountSummary> {
  const db = await getDatabase();
  const baseCurrency = await getBaseCurrency();
  const accounts = await db.select<
    Array<{
      type: string;
      balance: number;
      currency: string;
    }>
  >(
    `SELECT
      type,
      balance,
      currency
    FROM accounts
    WHERE is_active = 1`
  );

  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const account of accounts) {
    const convertedBalance = await convertAmount(
      Number(account.balance ?? 0),
      account.currency,
      baseCurrency
    );

    if (account.type === "credit_card") {
      if (convertedBalance > 0) {
        totalLiabilities += convertedBalance;
      } else if (convertedBalance < 0) {
        totalAssets += Math.abs(convertedBalance);
      }
    } else {
      if (convertedBalance > 0) {
        totalAssets += convertedBalance;
      } else if (convertedBalance < 0) {
        totalLiabilities += Math.abs(convertedBalance);
      }
    }
  }

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    activeAccountCount: accounts.length,
    baseCurrency,
    liabilityNote: "信用卡账户余额按欠款处理，计入负债。"
  };
}

export async function getMonthlyTransactionSummary(
  month: string
): Promise<MonthlyTransactionSummary> {
  const db = await getDatabase();
  const baseCurrency = await getBaseCurrency();
  const transactions = await db.select<
    Array<{
      type: string;
      amount: number;
      currency: string;
    }>
  >(
    `SELECT
      type,
      amount,
      currency
    FROM transactions
    WHERE substr(date, 1, 7) = $1`,
    [month]
  );

  let monthlyIncome = 0;
  let monthlyExpense = 0;

  for (const transaction of transactions) {
    if (transaction.type === "income") {
      const convertedAmount = await convertAmount(
        Number(transaction.amount ?? 0),
        transaction.currency,
        baseCurrency
      );
      monthlyIncome += convertedAmount;
    } else if (transaction.type === "expense") {
      const convertedAmount = await convertAmount(
        Number(transaction.amount ?? 0),
        transaction.currency,
        baseCurrency
      );
      monthlyExpense += convertedAmount;
    }
  }

  return {
    monthlyIncome,
    monthlyExpense,
    monthlyNet: monthlyIncome - monthlyExpense,
    transactionCount: transactions.length,
    baseCurrency
  };
}

export async function getPointSummary(): Promise<PointSummary> {
  const db = await getDatabase();
  const today = getToday();
  const ninetyDaysLater = getDateAfterDays(90);

  const summaryRows = await db.select<
    Array<{
      totalPointPrograms: number;
      totalPointEstimatedValue: number | null;
    }>
  >(
    `SELECT
      COUNT(*) AS totalPointPrograms,
      COALESCE(SUM(balance * COALESCE(value_per_point, 0)), 0) AS totalPointEstimatedValue
    FROM point_programs
    WHERE is_active = 1`
  );

  const expiringPointPrograms = await db.select<PointProgram[]>(
    `SELECT
      id,
      name,
      type,
      balance,
      tier,
      expire_date,
      value_per_point,
      institution,
      account_number,
      login_url,
      is_active,
      note,
      created_at,
      updated_at
    FROM point_programs
    WHERE is_active = 1
      AND expire_date IS NOT NULL
      AND expire_date != ''
      AND expire_date >= $1
      AND expire_date <= $2
    ORDER BY expire_date ASC, id DESC`,
    [today, ninetyDaysLater]
  );

  const summary = summaryRows[0];

  return {
    totalPointPrograms: Number(summary?.totalPointPrograms ?? 0),
    totalPointEstimatedValue: Number(summary?.totalPointEstimatedValue ?? 0),
    expiringPointPrograms
  };
}

export async function getActivitySummary(): Promise<ActivitySummary> {
  const db = await getDatabase();
  const today = getToday();
  const thirtyDaysLater = getDateAfterDays(30);

  const summaryRows = await db.select<
    Array<{
      totalActivities: number;
      eligibleActivities: number;
      joinedActivities: number;
      estimatedNetValue: number | null;
    }>
  >(
    `SELECT
      COUNT(*) AS totalActivities,
      SUM(CASE WHEN status = 'eligible' THEN 1 ELSE 0 END) AS eligibleActivities,
      SUM(CASE WHEN status = 'joined' THEN 1 ELSE 0 END) AS joinedActivities,
      COALESCE(SUM(
        CASE
          WHEN status NOT IN ('skipped', 'expired')
          THEN estimated_value - estimated_cost
          ELSE 0
        END
      ), 0) AS estimatedNetValue
    FROM activities`
  );

  const upcomingActivities = await db.select<Activity[]>(
    `SELECT
      id,
      title,
      platform,
      category,
      start_date,
      end_date,
      status,
      requirement,
      estimated_cost,
      estimated_value,
      actual_cost,
      actual_value,
      url,
      priority,
      tags,
      note,
      created_at,
      updated_at
    FROM activities
    WHERE end_date IS NOT NULL
      AND end_date != ''
      AND end_date >= $1
      AND end_date <= $2
      AND status NOT IN ('completed', 'skipped', 'expired')
    ORDER BY end_date ASC, priority DESC, id DESC`,
    [today, thirtyDaysLater]
  );

  const summary = summaryRows[0];

  return {
    totalActivities: Number(summary?.totalActivities ?? 0),
    eligibleActivities: Number(summary?.eligibleActivities ?? 0),
    joinedActivities: Number(summary?.joinedActivities ?? 0),
    upcomingActivities,
    estimatedNetValue: Number(summary?.estimatedNetValue ?? 0)
  };
}

export async function getRecentTransactions(
  limit: number
): Promise<DashboardRecentTransaction[]> {
  const db = await getDatabase();

  return db.select<DashboardRecentTransaction[]>(
    `SELECT
      transaction_row.id,
      transaction_row.type,
      transaction_row.account_id,
      transaction_row.target_account_id,
      transaction_row.date,
      transaction_row.amount,
      transaction_row.currency,
      transaction_row.category,
      transaction_row.merchant,
      transaction_row.description,
      account.name AS account_name,
      target_account.name AS target_account_name
    FROM transactions transaction_row
    LEFT JOIN accounts account ON account.id = transaction_row.account_id
    LEFT JOIN accounts target_account ON target_account.id = transaction_row.target_account_id
    ORDER BY transaction_row.date DESC, transaction_row.id DESC
    LIMIT $1`,
    [limit]
  );
}

export async function getCreditCardOverview(): Promise<CreditCardOverviewItem[]> {
  const db = await getDatabase();
  const rows = await db.select<
    Array<{
      id?: number;
      name: string;
      currency: string;
      balance: number;
      credit_limit?: number | null;
      statement_day?: number | null;
      due_day?: number | null;
    }>
  >(
    `SELECT
      id,
      name,
      currency,
      balance,
      credit_limit,
      statement_day,
      due_day
    FROM accounts
    WHERE is_active = 1
      AND type = 'credit_card'
    ORDER BY name ASC, id DESC`
  );

  return rows.map((row) => {
    const balance = Number(row.balance ?? 0);
    const creditLimit = Number(row.credit_limit ?? 0);
    const currentDebt = balance > 0 ? balance : 0;

    return {
      id: row.id,
      name: row.name,
      currency: row.currency,
      current_debt: currentDebt,
      credit_limit: creditLimit,
      available_credit: creditLimit - currentDebt,
      statement_day: row.statement_day ?? null,
      due_day: row.due_day ?? null
    };
  });
}

export async function getDashboardData(): Promise<DashboardData> {
  const month = getCurrentMonth();
  const [
    accountSummary,
    monthlyTransactionSummary,
    pointSummary,
    activitySummary,
    recentTransactions,
    creditCardOverview
  ] = await Promise.all([
    getAccountSummary(),
    getMonthlyTransactionSummary(month),
    getPointSummary(),
    getActivitySummary(),
    getRecentTransactions(10),
    getCreditCardOverview()
  ]);

  return {
    month,
    accountSummary,
    monthlyTransactionSummary,
    pointSummary,
    activitySummary,
    recentTransactions,
    creditCardOverview
  };
}

function getCurrentMonth(): string {
  return formatLocalDate(new Date()).slice(0, 7);
}

function getToday(): string {
  return formatLocalDate(new Date());
}

function getDateAfterDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
