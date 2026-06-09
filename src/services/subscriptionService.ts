import { getDatabase } from "./db";
import { createTransactionInOpenTransaction } from "./transactionService";
import type {
  BillingCycle,
  Subscription,
  SubscriptionInput,
  SubscriptionPayment,
  SubscriptionStatus
} from "../types/subscription";

const BILLING_CYCLES: BillingCycle[] = [
  "monthly",
  "yearly",
  "weekly",
  "quarterly",
  "custom"
];

const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "active",
  "paused",
  "canceled",
  "trial",
  "expired"
];

const SUBSCRIPTION_CATEGORIES = [
  "software",
  "streaming",
  "telecom",
  "insurance",
  "cloud",
  "membership",
  "education",
  "finance",
  "other"
] as const;

export async function listSubscriptions(): Promise<Subscription[]> {
  const db = await getDatabase();

  return db.select<Subscription[]>(
    `SELECT
      s.id,
      s.name,
      s.provider,
      s.category,
      s.account_id,
      s.amount,
      s.currency,
      s.billing_cycle,
      s.start_date,
      s.next_billing_date,
      s.trial_end_date,
      s.status,
      s.auto_renew,
      s.reminder_days,
      s.url,
      s.note,
      s.created_at,
      s.updated_at,
      account.name AS account_name
    FROM subscriptions s
    LEFT JOIN accounts account ON account.id = s.account_id
    ORDER BY
      CASE WHEN s.next_billing_date IS NULL OR s.next_billing_date = '' THEN 1 ELSE 0 END,
      s.next_billing_date ASC,
      s.updated_at DESC,
      s.id DESC`
  );
}

export async function listActiveSubscriptions(): Promise<Subscription[]> {
  const db = await getDatabase();

  return db.select<Subscription[]>(
    `SELECT
      s.id,
      s.name,
      s.provider,
      s.category,
      s.account_id,
      s.amount,
      s.currency,
      s.billing_cycle,
      s.start_date,
      s.next_billing_date,
      s.trial_end_date,
      s.status,
      s.auto_renew,
      s.reminder_days,
      s.url,
      s.note,
      s.created_at,
      s.updated_at,
      account.name AS account_name
    FROM subscriptions s
    LEFT JOIN accounts account ON account.id = s.account_id
    WHERE s.status IN ('active', 'trial')
    ORDER BY s.next_billing_date ASC, s.id DESC`
  );
}

export async function getSubscription(
  id: number
): Promise<Subscription | null> {
  const db = await getDatabase();
  const rows = await db.select<Subscription[]>(
    `SELECT
      s.id,
      s.name,
      s.provider,
      s.category,
      s.account_id,
      s.amount,
      s.currency,
      s.billing_cycle,
      s.start_date,
      s.next_billing_date,
      s.trial_end_date,
      s.status,
      s.auto_renew,
      s.reminder_days,
      s.url,
      s.note,
      s.created_at,
      s.updated_at,
      account.name AS account_name
    FROM subscriptions s
    LEFT JOIN accounts account ON account.id = s.account_id
    WHERE s.id = $1
    LIMIT 1`,
    [id]
  );

  return rows[0] ?? null;
}

export async function createSubscription(
  input: SubscriptionInput
): Promise<void> {
  validateSubscriptionInput(input);

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO subscriptions (
      name,
      provider,
      category,
      account_id,
      amount,
      currency,
      billing_cycle,
      start_date,
      next_billing_date,
      trial_end_date,
      status,
      auto_renew,
      reminder_days,
      url,
      note,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      input.name.trim(),
      normalizeOptionalText(input.provider),
      input.category,
      input.account_id ?? null,
      Number(input.amount),
      normalizeCurrency(input.currency),
      input.billing_cycle,
      normalizeOptionalText(input.start_date),
      normalizeOptionalText(input.next_billing_date),
      normalizeOptionalText(input.trial_end_date),
      input.status,
      input.auto_renew ? 1 : 0,
      Number(input.reminder_days),
      normalizeOptionalText(input.url),
      normalizeOptionalText(input.note),
      now,
      now
    ]
  );
}

export async function updateSubscription(
  id: number,
  input: SubscriptionInput
): Promise<void> {
  validateSubscriptionInput(input);

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE subscriptions
    SET
      name = $1,
      provider = $2,
      category = $3,
      account_id = $4,
      amount = $5,
      currency = $6,
      billing_cycle = $7,
      start_date = $8,
      next_billing_date = $9,
      trial_end_date = $10,
      status = $11,
      auto_renew = $12,
      reminder_days = $13,
      url = $14,
      note = $15,
      updated_at = $16
    WHERE id = $17`,
    [
      input.name.trim(),
      normalizeOptionalText(input.provider),
      input.category,
      input.account_id ?? null,
      Number(input.amount),
      normalizeCurrency(input.currency),
      input.billing_cycle,
      normalizeOptionalText(input.start_date),
      normalizeOptionalText(input.next_billing_date),
      normalizeOptionalText(input.trial_end_date),
      input.status,
      input.auto_renew ? 1 : 0,
      Number(input.reminder_days),
      normalizeOptionalText(input.url),
      normalizeOptionalText(input.note),
      now,
      id
    ]
  );
}

export async function deleteSubscription(id: number): Promise<void> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) AS count FROM subscription_payments WHERE subscription_id = $1",
    [id]
  );
  const paymentCount = Number(rows[0]?.count ?? 0);

  if (paymentCount > 0) {
    throw new Error("该订阅已有支付记录，请取消订阅而不是删除。");
  }

  await db.execute("DELETE FROM subscriptions WHERE id = $1", [id]);
}

export async function setSubscriptionStatus(
  id: number,
  status: SubscriptionStatus
): Promise<void> {
  if (!SUBSCRIPTION_STATUSES.includes(status)) {
    throw new Error("Invalid subscription status.");
  }

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    "UPDATE subscriptions SET status = $1, updated_at = $2 WHERE id = $3",
    [status, now, id]
  );
}

export async function listUpcomingSubscriptions(
  days: number
): Promise<Subscription[]> {
  const db = await getDatabase();
  const today = formatLocalDate(new Date());
  const endDate = getDateAfterDays(Math.max(0, Math.trunc(days)));

  return db.select<Subscription[]>(
    `SELECT
      s.id,
      s.name,
      s.provider,
      s.category,
      s.account_id,
      s.amount,
      s.currency,
      s.billing_cycle,
      s.start_date,
      s.next_billing_date,
      s.trial_end_date,
      s.status,
      s.auto_renew,
      s.reminder_days,
      s.url,
      s.note,
      s.created_at,
      s.updated_at,
      account.name AS account_name
    FROM subscriptions s
    LEFT JOIN accounts account ON account.id = s.account_id
    WHERE s.status IN ('active', 'trial')
      AND s.next_billing_date IS NOT NULL
      AND s.next_billing_date != ''
      AND s.next_billing_date >= $1
      AND s.next_billing_date <= $2
    ORDER BY s.next_billing_date ASC, s.id DESC`,
    [today, endDate]
  );
}

export async function listSubscriptionPayments(
  subscriptionId: number
): Promise<SubscriptionPayment[]> {
  const db = await getDatabase();

  return db.select<SubscriptionPayment[]>(
    `SELECT
      id,
      subscription_id,
      transaction_id,
      paid_date,
      amount,
      currency,
      note,
      created_at
    FROM subscription_payments
    WHERE subscription_id = $1
    ORDER BY paid_date DESC, id DESC`,
    [subscriptionId]
  );
}

export async function markSubscriptionPaid(
  subscriptionId: number,
  paidDate: string,
  note?: string
): Promise<void> {
  if (!paidDate) {
    throw new Error("Paid date is required.");
  }

  const subscription = await getSubscription(subscriptionId);

  if (!subscription?.id) {
    throw new Error("Subscription not found.");
  }

  const db = await getDatabase();
  const now = new Date().toISOString();
  let transactionId: number | null = null;

  await db.execute("BEGIN");

  try {
    if (subscription.account_id && Number(subscription.amount) > 0) {
      transactionId = await createTransactionInOpenTransaction(
        {
          type: "expense",
          account_id: subscription.account_id,
          target_account_id: null,
          date: paidDate,
          amount: Number(subscription.amount),
          currency: subscription.currency,
          category: subscription.category,
          merchant: subscription.provider || subscription.name,
          description: `Subscription payment: ${subscription.name}`,
          is_reimbursable: 0
        },
        now
      );
    }

    await db.execute(
      `INSERT INTO subscription_payments (
        subscription_id,
        transaction_id,
        paid_date,
        amount,
        currency,
        note,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        subscription.id,
        transactionId,
        paidDate,
        Number(subscription.amount),
        subscription.currency,
        normalizeOptionalText(note),
        now
      ]
    );

    const nextBillingDate = advanceBillingDate(
      subscription.next_billing_date || paidDate,
      subscription.billing_cycle
    );

    await db.execute(
      `UPDATE subscriptions
      SET next_billing_date = $1,
        updated_at = $2
      WHERE id = $3`,
      [nextBillingDate, now, subscription.id]
    );

    await db.execute("COMMIT");
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}

export function advanceBillingDate(
  dateText: string | null | undefined,
  billingCycle: BillingCycle
): string | null {
  if (!dateText || billingCycle === "custom") {
    return dateText ?? null;
  }

  const date = new Date(`${dateText}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateText;
  }

  if (billingCycle === "weekly") {
    date.setDate(date.getDate() + 7);
  } else if (billingCycle === "monthly") {
    date.setMonth(date.getMonth() + 1);
  } else if (billingCycle === "quarterly") {
    date.setMonth(date.getMonth() + 3);
  } else if (billingCycle === "yearly") {
    date.setFullYear(date.getFullYear() + 1);
  }

  return formatLocalDate(date);
}

function validateSubscriptionInput(input: SubscriptionInput): void {
  if (!input.name?.trim()) {
    throw new Error("Subscription name is required.");
  }

  if (!SUBSCRIPTION_CATEGORIES.includes(input.category)) {
    throw new Error("Invalid subscription category.");
  }

  if (!BILLING_CYCLES.includes(input.billing_cycle)) {
    throw new Error("Invalid billing cycle.");
  }

  if (!SUBSCRIPTION_STATUSES.includes(input.status)) {
    throw new Error("Invalid subscription status.");
  }

  if (!Number.isFinite(Number(input.amount)) || Number(input.amount) < 0) {
    throw new Error("Amount must be greater than or equal to 0.");
  }

  if (!input.currency?.trim()) {
    throw new Error("Currency is required.");
  }

  if (
    !Number.isFinite(Number(input.reminder_days)) ||
    Number(input.reminder_days) < 0
  ) {
    throw new Error("Reminder days must be greater than or equal to 0.");
  }

  if (
    input.start_date &&
    input.next_billing_date &&
    input.next_billing_date < input.start_date
  ) {
    throw new Error("Next billing date cannot be earlier than start date.");
  }
}

function normalizeOptionalText(value: unknown): string | null {
  const text = String(value ?? "").trim();

  return text || null;
}

function normalizeCurrency(currency: string): string {
  return String(currency || "").trim().toUpperCase();
}

function getDateAfterDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return formatLocalDate(date);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
