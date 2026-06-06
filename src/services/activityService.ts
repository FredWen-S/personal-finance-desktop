import { getDatabase } from "./db";
import type {
  Activity,
  ActivityInput,
  ActivityStatus
} from "../types/activity";

export async function listActivities(): Promise<Activity[]> {
  const db = await getDatabase();

  return db.select<Activity[]>(
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
    ORDER BY
      CASE WHEN end_date IS NULL OR end_date = '' THEN 1 ELSE 0 END ASC,
      end_date ASC,
      updated_at DESC,
      id DESC`
  );
}

export async function getActivity(id: number): Promise<Activity | null> {
  const db = await getDatabase();
  const rows = await db.select<Activity[]>(
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
    WHERE id = $1
    LIMIT 1`,
    [id]
  );

  return rows[0] ?? null;
}

export async function createActivity(input: ActivityInput): Promise<void> {
  validateActivityInput(input);

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO activities (
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
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      input.title,
      input.platform ?? null,
      input.category,
      input.start_date ?? null,
      input.end_date ?? null,
      input.status,
      input.requirement ?? null,
      input.estimated_cost,
      input.estimated_value,
      input.actual_cost ?? 0,
      input.actual_value ?? 0,
      input.url ?? null,
      input.priority ?? "medium",
      input.tags ?? null,
      input.note ?? null,
      now,
      now
    ]
  );
}

export async function updateActivity(
  id: number,
  input: ActivityInput
): Promise<void> {
  validateActivityInput(input);

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE activities
    SET
      title = $1,
      platform = $2,
      category = $3,
      start_date = $4,
      end_date = $5,
      status = $6,
      requirement = $7,
      estimated_cost = $8,
      estimated_value = $9,
      actual_cost = $10,
      actual_value = $11,
      url = $12,
      priority = $13,
      tags = $14,
      note = $15,
      updated_at = $16
    WHERE id = $17`,
    [
      input.title,
      input.platform ?? null,
      input.category,
      input.start_date ?? null,
      input.end_date ?? null,
      input.status,
      input.requirement ?? null,
      input.estimated_cost,
      input.estimated_value,
      input.actual_cost ?? 0,
      input.actual_value ?? 0,
      input.url ?? null,
      input.priority ?? "medium",
      input.tags ?? null,
      input.note ?? null,
      now,
      id
    ]
  );
}

export async function deleteActivity(id: number): Promise<void> {
  const db = await getDatabase();

  await db.execute("DELETE FROM activities WHERE id = $1", [id]);
}

export async function listUpcomingActivities(
  days: number
): Promise<Activity[]> {
  const db = await getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  const end = endDate.toISOString().slice(0, 10);

  return db.select<Activity[]>(
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
    [today, end]
  );
}

export async function listActivitiesByStatus(
  status: ActivityStatus
): Promise<Activity[]> {
  const db = await getDatabase();

  return db.select<Activity[]>(
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
    WHERE status = $1
    ORDER BY
      CASE WHEN end_date IS NULL OR end_date = '' THEN 1 ELSE 0 END ASC,
      end_date ASC,
      updated_at DESC,
      id DESC`,
    [status]
  );
}

function validateActivityInput(input: ActivityInput): void {
  if (!input.title.trim()) {
    throw new Error("Activity title is required.");
  }

  if (!input.category) {
    throw new Error("Activity category is required.");
  }

  if (!input.status) {
    throw new Error("Activity status is required.");
  }

  if (!input.priority) {
    throw new Error("Activity priority is required.");
  }

  const numericFields = [
    ["estimated_cost", input.estimated_cost],
    ["estimated_value", input.estimated_value],
    ["actual_cost", input.actual_cost ?? 0],
    ["actual_value", input.actual_value ?? 0]
  ] as const;

  for (const [field, value] of numericFields) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${field} cannot be negative.`);
    }
  }

  if (
    input.start_date &&
    input.end_date &&
    input.end_date < input.start_date
  ) {
    throw new Error("End date cannot be earlier than start date.");
  }
}
