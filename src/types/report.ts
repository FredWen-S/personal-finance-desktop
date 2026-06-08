export interface MonthlyCashFlowItem {
  month: string;
  income: number;
  expense: number;
  net: number;
  base_currency: string;
}

export interface ExpenseCategoryItem {
  category: string;
  amount: number;
  base_currency: string;
}

export interface AccountBalanceReportItem {
  account_name: string;
  type: string;
  currency: string;
  balance: number;
  converted_balance: number;
  asset_amount: number;
  liability_amount: number;
  balance_role: "asset" | "liability";
  base_currency: string;
  institution?: string | null;
}

export interface PointValueReportItem {
  name: string;
  type: string;
  balance: number;
  value_per_point?: number | null;
  estimated_value: number;
  tier?: string | null;
  expire_date?: string | null;
}

export interface ActivityStatusReportItem {
  status: string;
  count: number;
}

export interface ActivityCategoryReportItem {
  category: string;
  count: number;
  estimated_net_value: number;
}

export interface TopMerchantItem {
  merchant: string;
  amount: number;
  base_currency: string;
}

export interface ReportData {
  month: string;
  baseCurrency: string;
  monthlyCashFlow: MonthlyCashFlowItem[];
  expenseByCategory: ExpenseCategoryItem[];
  accountBalances: AccountBalanceReportItem[];
  pointValues: PointValueReportItem[];
  activityStatuses: ActivityStatusReportItem[];
  activityCategories: ActivityCategoryReportItem[];
  topMerchants: TopMerchantItem[];
}
