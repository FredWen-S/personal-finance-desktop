import { getDatabase } from "./db";
import type {
  BackupPayload,
  DatabaseStats,
  TableExportName
} from "../types/settings";

const APP_NAME = "Personal Finance Manager";
const APP_VERSION = "0.1.0";

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
    activities
  ] = await Promise.all([
    exportTableData("accounts"),
    exportTableData("transactions"),
    exportTableData("point_programs"),
    exportTableData("point_transactions"),
    exportTableData("activities")
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
      activities
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

export async function getAppDataInfo(): Promise<{
  databaseName: string;
  note: string;
  databasePath?: string;
}> {
  return {
    databaseName: "finance.db",
    note: "数据库由 Tauri SQL 插件存放在应用数据目录中。本阶段不硬编码用户本机路径。"
  };
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
