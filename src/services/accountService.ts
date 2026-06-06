import { getDatabase } from "./db";
import type { Account, AccountInput } from "../types/account";

export async function listAccounts(): Promise<Account[]> {
  const db = await getDatabase();

  return db.select<Account[]>(
    `SELECT
      id,
      name,
      type,
      currency,
      balance,
      institution,
      note,
      is_active,
      created_at,
      updated_at
    FROM accounts
    ORDER BY is_active DESC, updated_at DESC, id DESC`
  );
}

export async function getAccount(id: number): Promise<Account | null> {
  const db = await getDatabase();
  const rows = await db.select<Account[]>(
    `SELECT
      id,
      name,
      type,
      currency,
      balance,
      institution,
      note,
      is_active,
      created_at,
      updated_at
    FROM accounts
    WHERE id = $1
    LIMIT 1`,
    [id]
  );

  return rows[0] ?? null;
}

export async function createAccount(input: AccountInput): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO accounts (
      name,
      type,
      currency,
      balance,
      institution,
      note,
      is_active,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      input.name,
      input.type,
      input.currency,
      input.balance,
      input.institution ?? null,
      input.note ?? null,
      input.is_active,
      now,
      now
    ]
  );
}

export async function updateAccount(
  id: number,
  input: AccountInput
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE accounts
    SET
      name = $1,
      type = $2,
      currency = $3,
      balance = $4,
      institution = $5,
      note = $6,
      is_active = $7,
      updated_at = $8
    WHERE id = $9`,
    [
      input.name,
      input.type,
      input.currency,
      input.balance,
      input.institution ?? null,
      input.note ?? null,
      input.is_active,
      now,
      id
    ]
  );
}

export async function deleteAccount(id: number): Promise<void> {
  const canDelete = await canDeleteAccount(id);

  if (!canDelete) {
    throw new Error("该账户已有流水记录，请停用账户而不是删除。");
  }

  const db = await getDatabase();

  await db.execute("DELETE FROM accounts WHERE id = $1", [id]);
}

export async function countAccountTransactions(accountId: number): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ count: number }>>(
    `SELECT COUNT(*) AS count
    FROM transactions
    WHERE account_id = $1
      OR target_account_id = $1`,
    [accountId]
  );

  return Number(rows[0]?.count ?? 0);
}

export async function canDeleteAccount(accountId: number): Promise<boolean> {
  const count = await countAccountTransactions(accountId);

  return count === 0;
}

export async function setAccountActive(
  id: number,
  isActive: boolean
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    "UPDATE accounts SET is_active = $1, updated_at = $2 WHERE id = $3",
    [isActive ? 1 : 0, now, id]
  );
}
