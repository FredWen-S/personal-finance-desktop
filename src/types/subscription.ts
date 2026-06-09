export type BillingCycle =
  | "monthly"
  | "yearly"
  | "weekly"
  | "quarterly"
  | "custom";

export type SubscriptionStatus =
  | "active"
  | "paused"
  | "canceled"
  | "trial"
  | "expired";

export type SubscriptionCategory =
  | "software"
  | "streaming"
  | "telecom"
  | "insurance"
  | "cloud"
  | "membership"
  | "education"
  | "finance"
  | "other";

export interface Subscription {
  id?: number;
  name: string;
  provider?: string | null;
  category: SubscriptionCategory;
  account_id?: number | null;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  start_date?: string | null;
  next_billing_date?: string | null;
  trial_end_date?: string | null;
  status: SubscriptionStatus;
  auto_renew: number;
  reminder_days: number;
  url?: string | null;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
  account_name?: string | null;
}

export type SubscriptionInput = Omit<
  Subscription,
  "id" | "created_at" | "updated_at" | "account_name"
>;

export interface SubscriptionPayment {
  id?: number;
  subscription_id: number;
  transaction_id?: number | null;
  paid_date: string;
  amount: number;
  currency: string;
  note?: string | null;
  created_at?: string;
}

export type SubscriptionPaymentInput = Omit<
  SubscriptionPayment,
  "id" | "created_at"
>;
