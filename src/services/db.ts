import Database from "@tauri-apps/plugin-sql";

const DATABASE_URL = "sqlite:finance.db";

let databasePromise: Promise<Database> | null = null;

export function getDatabase(): Promise<Database> {
  if (!databasePromise) {
    databasePromise = Database.load(DATABASE_URL);
  }

  return databasePromise;
}

export async function testDatabaseConnection(): Promise<string> {
  const db = await getDatabase();
  const result = await db.select<Array<{ ok: number }>>("SELECT 1 AS ok");

  if (!Array.isArray(result) || result[0]?.ok !== 1) {
    throw new Error("SQLite validation query returned an unexpected result.");
  }

  await db.select("SELECT id, name, type, currency, balance FROM accounts LIMIT 1");

  return "SQLite connected";
}
