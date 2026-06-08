import type { Activity } from "./activity";
import type { PointProgram } from "./points";
import type { TransactionType } from "./transaction";

export interface AccountSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  activeAccountCount: number;
  baseCurrency: string;
  liabilityNote: string;
}

export interface MonthlyTransactionSummary {
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNet: number;
  transactionCount: number;
  baseCurrency: string;
}

export interface PointSummary {
  totalPointPrograms: number;
  totalPointEstimatedValue: number;
  expiringPointPrograms: PointProgram[];
}

export interface ActivitySummary {
  totalActivities: number;
  eligibleActivities: number;
  joinedActivities: number;
  upcomingActivities: Activity[];
  estimatedNetValue: number;
}

export interface DashboardRecentTransaction {
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
  account_name?: string | null;
  target_account_name?: string | null;
}

export interface CreditCardOverviewItem {
  id?: number;
  name: string;
  currency: string;
  current_debt: number;
  credit_limit: number;
  available_credit: number;
  statement_day?: number | null;
  due_day?: number | null;
}

export interface DashboardData {
  month: string;
  accountSummary: AccountSummary;
  monthlyTransactionSummary: MonthlyTransactionSummary;
  pointSummary: PointSummary;
  activitySummary: ActivitySummary;
  recentTransactions: DashboardRecentTransaction[];
  creditCardOverview: CreditCardOverviewItem[];
}
