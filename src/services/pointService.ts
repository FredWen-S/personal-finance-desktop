import { getDatabase } from "./db";
import type {
  PointProgram,
  PointProgramInput,
  PointTransaction,
  PointTransactionInput
} from "../types/points";

const PROGRAM_DELETE_BLOCKED_MESSAGE =
  "该积分账户已有流水记录，请停用账户而不是删除。";

export async function listPointPrograms(): Promise<PointProgram[]> {
  const db = await getDatabase();

  return db.select<PointProgram[]>(
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
    ORDER BY is_active DESC, updated_at DESC, id DESC`
  );
}

export async function listActivePointPrograms(): Promise<PointProgram[]> {
  const db = await getDatabase();

  return db.select<PointProgram[]>(
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
    ORDER BY name ASC`
  );
}

export async function getPointProgram(
  id: number
): Promise<PointProgram | null> {
  const db = await getDatabase();
  const rows = await db.select<PointProgram[]>(
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
    WHERE id = $1
    LIMIT 1`,
    [id]
  );

  return rows[0] ?? null;
}

export async function createPointProgram(
  input: PointProgramInput
): Promise<void> {
  validatePointProgramInput(input);

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO point_programs (
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
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      input.name,
      input.type,
      input.balance,
      input.tier ?? null,
      input.expire_date ?? null,
      input.value_per_point ?? 0,
      input.institution ?? null,
      input.account_number ?? null,
      input.login_url ?? null,
      input.is_active,
      input.note ?? null,
      now,
      now
    ]
  );
}

export async function updatePointProgram(
  id: number,
  input: PointProgramInput
): Promise<void> {
  validatePointProgramInput(input);

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE point_programs
    SET
      name = $1,
      type = $2,
      balance = $3,
      tier = $4,
      expire_date = $5,
      value_per_point = $6,
      institution = $7,
      account_number = $8,
      login_url = $9,
      is_active = $10,
      note = $11,
      updated_at = $12
    WHERE id = $13`,
    [
      input.name,
      input.type,
      input.balance,
      input.tier ?? null,
      input.expire_date ?? null,
      input.value_per_point ?? 0,
      input.institution ?? null,
      input.account_number ?? null,
      input.login_url ?? null,
      input.is_active,
      input.note ?? null,
      now,
      id
    ]
  );
}

export async function setPointProgramActive(
  id: number,
  isActive: boolean
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    "UPDATE point_programs SET is_active = $1, updated_at = $2 WHERE id = $3",
    [isActive ? 1 : 0, now, id]
  );
}

export async function deletePointProgram(id: number): Promise<void> {
  const count = await countPointTransactions(id);

  if (count > 0) {
    throw new Error(PROGRAM_DELETE_BLOCKED_MESSAGE);
  }

  const db = await getDatabase();

  await db.execute("DELETE FROM point_programs WHERE id = $1", [id]);
}

export async function countPointTransactions(
  programId: number
): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) AS count FROM point_transactions WHERE program_id = $1",
    [programId]
  );

  return Number(rows[0]?.count ?? 0);
}

export async function listPointTransactions(): Promise<PointTransaction[]> {
  const db = await getDatabase();

  return db.select<PointTransaction[]>(
    `SELECT
      transaction_row.id,
      transaction_row.program_id,
      transaction_row.date,
      transaction_row.type,
      transaction_row.points,
      transaction_row.description,
      transaction_row.related_cash_value,
      transaction_row.expire_date,
      transaction_row.created_at,
      transaction_row.updated_at,
      program.name AS program_name
    FROM point_transactions transaction_row
    LEFT JOIN point_programs program ON program.id = transaction_row.program_id
    ORDER BY transaction_row.date DESC, transaction_row.id DESC`
  );
}

export async function listPointTransactionsByProgram(
  programId: number
): Promise<PointTransaction[]> {
  const db = await getDatabase();

  return db.select<PointTransaction[]>(
    `SELECT
      transaction_row.id,
      transaction_row.program_id,
      transaction_row.date,
      transaction_row.type,
      transaction_row.points,
      transaction_row.description,
      transaction_row.related_cash_value,
      transaction_row.expire_date,
      transaction_row.created_at,
      transaction_row.updated_at,
      program.name AS program_name
    FROM point_transactions transaction_row
    LEFT JOIN point_programs program ON program.id = transaction_row.program_id
    WHERE transaction_row.program_id = $1
    ORDER BY transaction_row.date DESC, transaction_row.id DESC`,
    [programId]
  );
}

export async function getPointTransaction(
  id: number
): Promise<PointTransaction | null> {
  const db = await getDatabase();
  const rows = await db.select<PointTransaction[]>(
    `SELECT
      transaction_row.id,
      transaction_row.program_id,
      transaction_row.date,
      transaction_row.type,
      transaction_row.points,
      transaction_row.description,
      transaction_row.related_cash_value,
      transaction_row.expire_date,
      transaction_row.created_at,
      transaction_row.updated_at,
      program.name AS program_name
    FROM point_transactions transaction_row
    LEFT JOIN point_programs program ON program.id = transaction_row.program_id
    WHERE transaction_row.id = $1
    LIMIT 1`,
    [id]
  );

  return rows[0] ?? null;
}

export async function createPointTransaction(
  input: PointTransactionInput
): Promise<void> {
  validatePointTransactionInput(input);

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute("BEGIN");

  try {
    await applyPointBalanceImpact(input);

    await db.execute(
      `INSERT INTO point_transactions (
        program_id,
        date,
        type,
        points,
        description,
        related_cash_value,
        expire_date,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        input.program_id,
        input.date,
        input.type,
        input.points,
        input.description ?? null,
        input.related_cash_value ?? null,
        input.expire_date ?? null,
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

export async function updatePointTransaction(
  id: number,
  input: PointTransactionInput
): Promise<void> {
  validatePointTransactionInput(input);

  const db = await getDatabase();
  const oldTransaction = await getPointTransaction(id);

  if (!oldTransaction) {
    throw new Error("Point transaction not found.");
  }

  const now = new Date().toISOString();

  await db.execute("BEGIN");

  try {
    await revertPointBalanceImpact(oldTransaction);
    await applyPointBalanceImpact(input);

    await db.execute(
      `UPDATE point_transactions
      SET
        program_id = $1,
        date = $2,
        type = $3,
        points = $4,
        description = $5,
        related_cash_value = $6,
        expire_date = $7,
        updated_at = $8
      WHERE id = $9`,
      [
        input.program_id,
        input.date,
        input.type,
        input.points,
        input.description ?? null,
        input.related_cash_value ?? null,
        input.expire_date ?? null,
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

export async function deletePointTransaction(id: number): Promise<void> {
  const db = await getDatabase();
  const oldTransaction = await getPointTransaction(id);

  if (!oldTransaction) {
    throw new Error("Point transaction not found.");
  }

  await db.execute("BEGIN");

  try {
    await revertPointBalanceImpact(oldTransaction);
    await db.execute("DELETE FROM point_transactions WHERE id = $1", [id]);
    await db.execute("COMMIT");
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}

async function applyPointBalanceImpact(
  input: PointTransactionInput
): Promise<void> {
  const delta = getPointBalanceDelta(input.type, input.points);

  await changePointProgramBalance(input.program_id, delta);
}

async function revertPointBalanceImpact(
  transaction: PointTransaction
): Promise<void> {
  const delta = -getPointBalanceDelta(transaction.type, transaction.points);

  await changePointProgramBalance(transaction.program_id, delta);
}

async function changePointProgramBalance(
  programId: number,
  delta: number
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const rows = await db.select<Array<{ balance: number }>>(
    "SELECT balance FROM point_programs WHERE id = $1 LIMIT 1",
    [programId]
  );

  if (rows.length === 0) {
    throw new Error(`Point program ${programId} not found.`);
  }

  const nextBalance = Number(rows[0].balance) + delta;

  if (nextBalance < 0) {
    throw new Error("积分余额不能小于 0。");
  }

  await db.execute(
    "UPDATE point_programs SET balance = $1, updated_at = $2 WHERE id = $3",
    [nextBalance, now, programId]
  );
}

function getPointBalanceDelta(
  type: PointTransactionInput["type"],
  points: number
): number {
  if (type === "earn" || type === "adjustment" || type === "transfer") {
    return points;
  }

  if (type === "redeem" || type === "expire") {
    return -points;
  }

  return assertNever(type);
}

function validatePointProgramInput(input: PointProgramInput): void {
  if (!input.name.trim()) {
    throw new Error("Point program name is required.");
  }

  if (!input.type) {
    throw new Error("Point program type is required.");
  }

  if (!Number.isFinite(input.balance) || input.balance < 0) {
    throw new Error("Point program balance cannot be negative.");
  }

  if (
    input.value_per_point !== undefined &&
    input.value_per_point !== null &&
    (!Number.isFinite(input.value_per_point) || input.value_per_point < 0)
  ) {
    throw new Error("Value per point cannot be negative.");
  }
}

function validatePointTransactionInput(input: PointTransactionInput): void {
  if (!input.program_id) {
    throw new Error("Point program is required.");
  }

  if (!input.date) {
    throw new Error("Point transaction date is required.");
  }

  if (!["earn", "redeem", "expire", "adjustment", "transfer"].includes(input.type)) {
    throw new Error("Invalid point transaction type.");
  }

  if (!Number.isFinite(input.points) || input.points <= 0) {
    throw new Error("Points must be greater than 0.");
  }

  if (
    input.related_cash_value !== undefined &&
    input.related_cash_value !== null &&
    (!Number.isFinite(input.related_cash_value) || input.related_cash_value < 0)
  ) {
    throw new Error("Related cash value cannot be negative.");
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported point transaction type: ${value}`);
}
