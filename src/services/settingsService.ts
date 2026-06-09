import { getDatabase } from "./db";
import {
  appConfigDir,
  appDataDir,
  appLocalDataDir,
  join
} from "@tauri-apps/api/path";
import { BaseDirectory, exists } from "@tauri-apps/plugin-fs";
import type {
  AppDataInfo,
  BackupPayload,
  DatabaseStats,
  TableExportName
} from "../types/settings";

const APP_NAME = "Personal Finance Manager";
const APP_VERSION = "0.2.1";
const DATABASE_NAME = "finance.db";

const TABLE_COLUMNS: Record<TableExportName, string[]> = {
  accounts: [
    "id",
    "name",
    "type",
    "currency",
    "balance",
    "institution",
    "note",
    "is_active",
    "created_at",
    "updated_at"
  ],
  transactions: [
    "id",
    "type",
    "account_id",
    "target_account_id",
    "date",
    "amount",
    "currency",
    "category",
    "merchant",
    "description",
    "is_reimbursable",
    "created_at",
    "updated_at"
  ],
  point_programs: [
    "id",
    "name",
    "type",
    "balance",
    "tier",
    "expire_date",
    "value_per_point",
    "institution",
    "account_number",
    "login_url",
    "is_active",
    "note",
    "created_at",
    "updated_at"
  ],
  point_transactions: [
    "id",
    "program_id",
    "date",
    "type",
    "points",
    "description",
    "related_cash_value",
    "expire_date",
    "created_at",
    "updated_at"
  ],
  activities: [
    "id",
    "title",
    "platform",
    "category",
    "start_date",
    "end_date",
    "status",
    "requirement",
    "estimated_cost",
    "estimated_value",
    "actual_cost",
    "actual_value",
    "url",
    "priority",
    "tags",
    "note",
    "created_at",
    "updated_at"
  ],
  subscriptions: [
    "id",
    "name",
    "provider",
    "category",
    "account_id",
    "amount",
    "currency",
    "billing_cycle",
    "start_date",
    "next_billing_date",
    "trial_end_date",
    "status",
    "auto_renew",
    "reminder_days",
    "url",
    "note",
    "created_at",
    "updated_at"
  ],
  subscription_payments: [
    "id",
    "subscription_id",
    "transaction_id",
    "paid_date",
    "amount",
    "currency",
    "note",
    "created_at"
  ],
  budgets: [
    "id",
    "month",
    "category",
    "amount",
    "base_currency",
    "note",
    "created_at",
    "updated_at"
  ]
};

const TABLE_NAMES = Object.keys(TABLE_COLUMNS) as TableExportName[];

export async function getDatabaseStats(): Promise<DatabaseStats> {
  const db = await getDatabase();
  const rows = await db.select<
    Array<{
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
    }>
  >(
    `SELECT
      (SELECT COUNT(*) FROM accounts) AS accountCount,
      (SELECT COUNT(*) FROM transactions) AS transactionCount,
      (SELECT COUNT(*) FROM point_programs) AS pointProgramCount,
      (SELECT COUNT(*) FROM point_transactions) AS pointTransactionCount,
      (SELECT COUNT(*) FROM activities) AS activityCount,
      (SELECT COUNT(*) FROM subscriptions) AS subscriptionCount,
      (SELECT COUNT(*) FROM subscription_payments) AS subscriptionPaymentCount,
      (SELECT COUNT(*) FROM budgets) AS budgetCount,
      (SELECT COUNT(*) FROM accounts WHERE is_active = 1) AS activeAccountCount,
      (SELECT COUNT(*) FROM point_programs WHERE is_active = 1) AS activePointProgramCount`
  );

  const row = rows[0];

  return {
    accountCount: Number(row?.accountCount ?? 0),
    transactionCount: Number(row?.transactionCount ?? 0),
    pointProgramCount: Number(row?.pointProgramCount ?? 0),
    pointTransactionCount: Number(row?.pointTransactionCount ?? 0),
    activityCount: Number(row?.activityCount ?? 0),
    subscriptionCount: Number(row?.subscriptionCount ?? 0),
    subscriptionPaymentCount: Number(row?.subscriptionPaymentCount ?? 0),
    budgetCount: Number(row?.budgetCount ?? 0),
    activeAccountCount: Number(row?.activeAccountCount ?? 0),
    activePointProgramCount: Number(row?.activePointProgramCount ?? 0)
  };
}

export async function exportAllData(): Promise<BackupPayload> {
  const [
    accounts,
    transactions,
    pointPrograms,
    pointTransactions,
    activities,
    subscriptions,
    subscriptionPayments,
    budgets
  ] = await Promise.all([
    exportTableData("accounts"),
    exportTableData("transactions"),
    exportTableData("point_programs"),
    exportTableData("point_transactions"),
    exportTableData("activities"),
    exportTableData("subscriptions"),
    exportTableData("subscription_payments"),
    exportTableData("budgets")
  ]);

  return {
    appName: APP_NAME,
    exportedAt: new Date().toISOString(),
    version: APP_VERSION,
    tables: {
      accounts,
      transactions,
      point_programs: pointPrograms,
      point_transactions: pointTransactions,
      activities,
      subscriptions,
      subscription_payments: subscriptionPayments,
      budgets
    }
  };
}

export async function exportTableData(
  tableName: TableExportName
): Promise<Record<string, unknown>[]> {
  assertTableName(tableName);

  const db = await getDatabase();
  const columns = TABLE_COLUMNS[tableName].join(", ");

  return db.select<Record<string, unknown>[]>(
    `SELECT ${columns} FROM ${tableName} ORDER BY id ASC`
  );
}

export function convertToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return "";
  }

  return rowsToCsv(Object.keys(rows[0]), rows);
}

export async function createBackupJson(): Promise<string> {
  const payload = await exportAllData();

  return JSON.stringify(payload, null, 2);
}

export async function createTableCsv(tableName: TableExportName): Promise<string> {
  assertTableName(tableName);

  const rows = await exportTableData(tableName);

  return rowsToCsv(TABLE_COLUMNS[tableName], rows);
}

export async function getAppDataInfo(): Promise<AppDataInfo> {
  const [nextAppDataDir, nextAppLocalDataDir, nextAppConfigDir] =
    await Promise.all([appDataDir(), appLocalDataDir(), appConfigDir()]);
  const detectedDatabasePath = await detectDatabasePath([
    { directory: nextAppDataDir, baseDir: BaseDirectory.AppData },
    { directory: nextAppLocalDataDir, baseDir: BaseDirectory.AppLocalData },
    { directory: nextAppConfigDir, baseDir: BaseDirectory.AppConfig }
  ]);

  return {
    databaseName: DATABASE_NAME,
    appDataDir: nextAppDataDir,
    appLocalDataDir: nextAppLocalDataDir,
    appConfigDir: nextAppConfigDir,
    detectedDatabasePath,
    note:
      "SQLite 数据库由 Tauri SQL 插件按 `sqlite:finance.db` 管理，实际落点可能依赖 Tauri 平台目录策略。未检测到已存在的 finance.db 时，应用会在首次连接数据库时创建。"
  };
}

async function detectDatabasePath(
  candidates: Array<{ directory: string; baseDir: BaseDirectory }>
): Promise<string | undefined> {
  for (const { directory, baseDir } of candidates) {
    const candidatePath = await join(directory, DATABASE_NAME);
    const candidateExists = await exists(DATABASE_NAME, { baseDir }).catch(
      () => false
    );

    if (candidateExists) {
      return candidatePath;
    }
  }

  return undefined;
}

function assertTableName(tableName: TableExportName): void {
  if (!TABLE_NAMES.includes(tableName)) {
    throw new Error("不支持导出该数据表。");
  }
}

function rowsToCsv(
  headers: string[],
  rows: Record<string, unknown>[]
): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvCell(row[header])).join(",")
    )
  ];

  return lines.join("\r\n");
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}
