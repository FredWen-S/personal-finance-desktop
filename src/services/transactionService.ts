import { getDatabase } from "./db";
import type { Transaction, TransactionInput } from "../types/transaction";

export async function listTransactions(): Promise<Transaction[]> {
  const db = await getDatabase();

  return db.select<Transaction[]>(
    `SELECT
      t.id,
      t.type,
      t.account_id,
      t.target_account_id,
      t.date,
      t.amount,
      t.currency,
      t.category,
      t.merchant,
      t.description,
      t.is_reimbursable,
      t.created_at,
      t.updated_at,
      account.name AS account_name,
      target_account.name AS target_account_name
    FROM transactions t
    LEFT JOIN accounts account ON account.id = t.account_id
    LEFT JOIN accounts target_account ON target_account.id = t.target_account_id
    ORDER BY t.date DESC, t.id DESC`
  );
}

export async function getTransaction(id: number): Promise<Transaction | null> {
  const db = await getDatabase();
  const rows = await db.select<Transaction[]>(
    `SELECT
      t.id,
      t.type,
      t.account_id,
      t.target_account_id,
      t.date,
      t.amount,
      t.currency,
      t.category,
      t.merchant,
      t.description,
      t.is_reimbursable,
      t.created_at,
      t.updated_at,
      account.name AS account_name,
      target_account.name AS target_account_name
    FROM transactions t
    LEFT JOIN accounts account ON account.id = t.account_id
    LEFT JOIN accounts target_account ON target_account.id = t.target_account_id
    WHERE t.id = $1
    LIMIT 1`,
    [id]
  );

  return rows[0] ?? null;
}

export async function createTransaction(
  input: TransactionInput
): Promise<void> {
  validateTransactionInput(input);

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute("BEGIN");

  try {
    await applyBalanceImpact(input);

    await db.execute(
      `INSERT INTO transactions (
        type,
        account_id,
        target_account_id,
        date,
        amount,
        currency,
        category,
        merchant,
        description,
        is_reimbursable,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        input.type,
        input.account_id,
        input.target_account_id ?? null,
        input.date,
        input.amount,
        input.currency,
        input.category,
        input.merchant ?? null,
        input.description ?? null,
        input.is_reimbursable,
        now,
        now
      ]
    );

    await db.execute("COMMIT");
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}

export async function updateTransaction(
  id: number,
  input: TransactionInput
): Promise<void> {
  validateTransactionInput(input);

  const db = await getDatabase();
  const oldTransaction = await getTransaction(id);

  if (!oldTransaction) {
    throw new Error("Transaction not found.");
  }

  const now = new Date().toISOString();

  await db.execute("BEGIN");

  try {
    await revertBalanceImpact(oldTransaction);
    await applyBalanceImpact(input);

    await db.execute(
      `UPDATE transactions
      SET
        type = $1,
        account_id = $2,
        target_account_id = $3,
        date = $4,
        amount = $5,
        currency = $6,
        category = $7,
        merchant = $8,
        description = $9,
        is_reimbursable = $10,
        updated_at = $11
      WHERE id = $12`,
      [
        input.type,
        input.account_id,
        input.target_account_id ?? null,
        input.date,
        input.amount,
        input.currency,
        input.category,
        input.merchant ?? null,
        input.description ?? null,
        input.is_reimbursable,
        now,
        id
      ]
    );

    await db.execute("COMMIT");
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = await getDatabase();
  const oldTransaction = await getTransaction(id);

  if (!oldTransaction) {
    throw new Error("Transaction not found.");
  }

  await db.execute("BEGIN");

  try {
    await revertBalanceImpact(oldTransaction);
    await db.execute("DELETE FROM transactions WHERE id = $1", [id]);
    await db.execute("COMMIT");
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}

async function applyBalanceImpact(input: TransactionInput): Promise<void> {
  switch (input.type) {
    case "expense":
      await changeAccountBalance(input.account_id, -input.amount);
      break;
    case "income":
    case "adjustment":
      await changeAccountBalance(input.account_id, input.amount);
      break;
    case "transfer":
      await changeAccountBalance(input.account_id, -input.amount);
      await changeAccountBalance(input.target_account_id as number, input.amount);
      break;
    default:
      assertNever(input.type);
  }
}

async function revertBalanceImpact(transaction: Transaction): Promise<void> {
  switch (transaction.type) {
    case "expense":
      await changeAccountBalance(transaction.account_id, transaction.amount);
      break;
    case "income":
    case "adjustment":
      await changeAccountBalance(transaction.account_id, -transaction.amount);
      break;
    case "transfer":
      await changeAccountBalance(transaction.account_id, transaction.amount);
      await changeAccountBalance(
        transaction.target_account_id as number,
        -transaction.amount
      );
      break;
    default:
      assertNever(transaction.type);
  }
}

async function changeAccountBalance(
  accountId: number,
  delta: number
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const result = await db.execute(
    `UPDATE accounts
    SET balance = balance + $1,
      updated_at = $2
    WHERE id = $3`,
    [delta, now, accountId]
  );

  if (result.rowsAffected !== 1) {
    throw new Error(`Account ${accountId} not found.`);
  }
}

function validateTransactionInput(input: TransactionInput): void {
  if (!["expense", "income", "adjustment", "transfer"].includes(input.type)) {
    throw new Error("Invalid transaction type.");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }

  if (!input.account_id) {
    throw new Error("Account is required.");
  }

  if (!input.date) {
    throw new Error("Date is required.");
  }

  if (!input.category) {
    throw new Error("Category is required.");
  }

  if (input.type === "transfer") {
    if (!input.target_account_id) {
      throw new Error("Target account is required for transfer.");
    }

    if (input.account_id === input.target_account_id) {
      throw new Error("Transfer accounts cannot be the same.");
    }
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported transaction type: ${value}`);
}
