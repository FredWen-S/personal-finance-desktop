export type TableExportName =
  | "accounts"
  | "transactions"
  | "point_programs"
  | "point_transactions"
  | "activities"
  | "subscriptions"
  | "subscription_payments"
  | "budgets";

export interface DatabaseStats {
  accountCount: number;
  transactionCount: number;
  pointProgramCount: number;
  pointTransactionCount: number;
  activityCount: number;
  subscriptionCount: number;
  subscriptionPaymentCount: number;
  budgetCount: number;
  activeAccountCount: number;
  activePointProgramCount: number;
  databasePath?: string;
  lastExportedAt?: string;
}

export interface AppDataInfo {
  databaseName: string;
  appDataDir: string;
  appLocalDataDir: string;
  appConfigDir: string;
  detectedDatabasePath?: string;
  note: string;
}

export interface ExportResult {
  filePath: string;
  exportedAt: string;
  tableName?: TableExportName;
}

export interface BackupPayload {
  appName: string;
  exportedAt: string;
  version: string;
  tables: {
    accounts: Record<string, unknown>[];
    transactions: Record<string, unknown>[];
    point_programs: Record<string, unknown>[];
    point_transactions: Record<string, unknown>[];
    activities: Record<string, unknown>[];
    subscriptions: Record<string, unknown>[];
    subscription_payments: Record<string, unknown>[];
    budgets: Record<string, unknown>[];
  };
}
