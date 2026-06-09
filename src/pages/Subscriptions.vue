<template>
  <section v-loading="loading" class="subscriptions-page">
    <div class="page-toolbar">
      <div>
        <h1 class="page-title">Subscriptions</h1>
        <p class="page-description">Recurring services, memberships, plans, insurance, and trials.</p>
      </div>
      <div class="toolbar-actions">
        <el-tag effect="plain">Base: {{ baseCurrency }}</el-tag>
        <el-button type="primary" @click="openCreateDialog">New Subscription</el-button>
      </div>
    </div>

    <el-alert
      v-if="loadError"
      :title="loadError"
      type="error"
      show-icon
      :closable="false"
    />

    <div class="stats-grid">
      <el-card v-for="card in statCards" :key="card.label" shadow="never">
        <el-statistic
          :title="card.label"
          :value="card.value"
          :precision="card.precision"
        />
      </el-card>
    </div>

    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="section-header">
          <span>Upcoming Charges</span>
          <el-tag effect="plain">Next 30 days</el-tag>
        </div>
      </template>

      <el-empty v-if="upcomingSubscriptions.length === 0" description="No upcoming charges" />
      <el-table v-else :data="upcomingSubscriptions" stripe>
        <el-table-column prop="name" label="Name" min-width="170" show-overflow-tooltip />
        <el-table-column prop="provider" label="Provider" min-width="140">
          <template #default="{ row }: { row: Subscription }">
            {{ row.provider || "-" }}
          </template>
        </el-table-column>
        <el-table-column label="Amount" width="130" align="right">
          <template #default="{ row }: { row: Subscription }">
            {{ formatMoney(row.amount) }} {{ row.currency }}
          </template>
        </el-table-column>
        <el-table-column prop="next_billing_date" label="Next date" width="125" />
        <el-table-column prop="billing_cycle" label="Cycle" width="115" />
        <el-table-column label="Status" width="110">
          <template #default="{ row }: { row: Subscription }">
            <el-tag :type="statusTagType(row.status)" effect="plain">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Account" min-width="140">
          <template #default="{ row }: { row: Subscription }">
            {{ row.account_name || "-" }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="section-header">
          <span>Subscription List</span>
          <el-tag effect="plain">{{ subscriptions.length }} items</el-tag>
        </div>
      </template>

      <el-empty v-if="subscriptions.length === 0" description="No subscriptions yet" />
      <el-table v-else :data="subscriptions" stripe>
        <el-table-column prop="name" label="Name" min-width="160" fixed="left" show-overflow-tooltip />
        <el-table-column prop="provider" label="Provider" min-width="130">
          <template #default="{ row }: { row: Subscription }">
            {{ row.provider || "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="category" label="Category" width="120" />
        <el-table-column label="Amount" width="120" align="right">
          <template #default="{ row }: { row: Subscription }">
            {{ formatMoney(row.amount) }}
          </template>
        </el-table-column>
        <el-table-column prop="currency" label="Currency" width="90" />
        <el-table-column prop="billing_cycle" label="Cycle" width="110" />
        <el-table-column label="Account" min-width="140">
          <template #default="{ row }: { row: Subscription }">
            {{ row.account_name || "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="next_billing_date" label="Next billing" width="125">
          <template #default="{ row }: { row: Subscription }">
            {{ row.next_billing_date || "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="trial_end_date" label="Trial ends" width="125">
          <template #default="{ row }: { row: Subscription }">
            {{ row.trial_end_date || "-" }}
          </template>
        </el-table-column>
        <el-table-column label="Auto renew" width="105">
          <template #default="{ row }: { row: Subscription }">
            <el-tag :type="row.auto_renew === 1 ? 'success' : 'info'" effect="plain">
              {{ row.auto_renew === 1 ? "Yes" : "No" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Status" width="110">
          <template #default="{ row }: { row: Subscription }">
            <el-tag :type="statusTagType(row.status)" effect="plain">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="290" fixed="right">
          <template #default="{ row }: { row: Subscription }">
            <el-button link type="primary" @click="openEditDialog(row)">Edit</el-button>
            <el-button link type="success" @click="openPaymentDialog(row)">Mark paid</el-button>
            <el-button link type="warning" @click="changeStatus(row, 'paused')">Pause</el-button>
            <el-button link type="info" @click="changeStatus(row, 'canceled')">Cancel</el-button>
            <el-button link type="danger" @click="handleDelete(row)">Delete</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="editingSubscriptionId === null ? 'New Subscription' : 'Edit Subscription'"
      width="720px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="132px"
        status-icon
      >
        <div class="form-grid">
          <el-form-item label="Name" prop="name">
            <el-input v-model.trim="form.name" />
          </el-form-item>
          <el-form-item label="Provider" prop="provider">
            <el-input v-model.trim="form.provider" />
          </el-form-item>
          <el-form-item label="Category" prop="category">
            <el-select v-model="form.category" class="full-width">
              <el-option v-for="item in categoryOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="Account" prop="account_id">
            <el-select v-model="form.account_id" clearable class="full-width">
              <el-option
                v-for="account in activeAccounts"
                :key="account.id"
                :label="account.name"
                :value="account.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="Amount" prop="amount">
            <el-input-number v-model="form.amount" class="full-width" :min="0" :precision="2" />
          </el-form-item>
          <el-form-item label="Currency" prop="currency">
            <el-select v-model="form.currency" class="full-width">
              <el-option v-for="currency in currencyOptions" :key="currency" :label="currency" :value="currency" />
            </el-select>
          </el-form-item>
          <el-form-item label="Billing cycle" prop="billing_cycle">
            <el-select v-model="form.billing_cycle" class="full-width">
              <el-option v-for="item in billingCycleOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="Status" prop="status">
            <el-select v-model="form.status" class="full-width">
              <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="Start date" prop="start_date">
            <el-date-picker v-model="form.start_date" type="date" value-format="YYYY-MM-DD" class="full-width" />
          </el-form-item>
          <el-form-item label="Next billing" prop="next_billing_date">
            <el-date-picker v-model="form.next_billing_date" type="date" value-format="YYYY-MM-DD" class="full-width" />
          </el-form-item>
          <el-form-item label="Trial end" prop="trial_end_date">
            <el-date-picker v-model="form.trial_end_date" type="date" value-format="YYYY-MM-DD" class="full-width" />
          </el-form-item>
          <el-form-item label="Reminder days" prop="reminder_days">
            <el-input-number v-model="form.reminder_days" class="full-width" :min="0" :precision="0" />
          </el-form-item>
        </div>

        <el-form-item label="Auto renew" prop="auto_renew">
          <el-switch v-model="form.auto_renew" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="URL" prop="url">
          <el-input v-model.trim="form.url" />
        </el-form-item>
        <el-form-item label="Note" prop="note">
          <el-input v-model.trim="form.note" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">Save</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="paymentDialogVisible" title="Mark Subscription Paid" width="480px">
      <el-form label-width="96px">
        <el-form-item label="Paid date" required>
          <el-date-picker
            v-model="paymentForm.paidDate"
            type="date"
            value-format="YYYY-MM-DD"
            class="full-width"
          />
        </el-form-item>
        <el-form-item label="Note">
          <el-input v-model.trim="paymentForm.note" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paymentDialogVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="paying" @click="handleMarkPaid">Confirm</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessage, ElMessageBox } from "element-plus";
import { listAccounts } from "../services/accountService";
import { convertAmount, getBaseCurrency } from "../services/currencyService";
import {
  createSubscription,
  deleteSubscription,
  listSubscriptions,
  listUpcomingSubscriptions,
  markSubscriptionPaid,
  setSubscriptionStatus,
  updateSubscription
} from "../services/subscriptionService";
import type { Account } from "../types/account";
import type {
  BillingCycle,
  Subscription,
  SubscriptionCategory,
  SubscriptionInput,
  SubscriptionStatus
} from "../types/subscription";

const categoryOptions: SubscriptionCategory[] = [
  "software",
  "streaming",
  "telecom",
  "insurance",
  "cloud",
  "membership",
  "education",
  "finance",
  "other"
];
const billingCycleOptions: BillingCycle[] = [
  "monthly",
  "yearly",
  "weekly",
  "quarterly",
  "custom"
];
const statusOptions: SubscriptionStatus[] = [
  "active",
  "paused",
  "canceled",
  "trial",
  "expired"
];
const currencyOptions = ["USD", "CNY", "JPY", "EUR", "GBP", "HKD"];

const subscriptions = ref<Subscription[]>([]);
const upcomingSubscriptions = ref<Subscription[]>([]);
const accounts = ref<Account[]>([]);
const baseCurrency = ref("CNY");
const loading = ref(false);
const submitting = ref(false);
const paying = ref(false);
const loadError = ref("");
const dialogVisible = ref(false);
const paymentDialogVisible = ref(false);
const editingSubscriptionId = ref<number | null>(null);
const payingSubscriptionId = ref<number | null>(null);
const formRef = ref<FormInstance>();
const monthlySubscriptionCost = ref(0);

const form = reactive<SubscriptionInput>({
  name: "",
  provider: "",
  category: "software",
  account_id: null,
  amount: 0,
  currency: "USD",
  billing_cycle: "monthly",
  start_date: "",
  next_billing_date: "",
  trial_end_date: "",
  status: "active",
  auto_renew: 1,
  reminder_days: 7,
  url: "",
  note: ""
});

const paymentForm = reactive({
  paidDate: getToday(),
  note: ""
});

const activeAccounts = computed(() =>
  accounts.value.filter((account) => account.is_active === 1 && account.id)
);

const activeCount = computed(
  () => subscriptions.value.filter((item) => item.status === "active").length
);

const expiringTrialsCount = computed(() => {
  const today = getToday();
  const end = getDateAfterDays(30);

  return subscriptions.value.filter(
    (item) =>
      item.status === "trial" &&
      Boolean(item.trial_end_date) &&
      String(item.trial_end_date) >= today &&
      String(item.trial_end_date) <= end
  ).length;
});

const statCards = computed(() => [
  { label: "Active subscriptions", value: activeCount.value, precision: 0 },
  {
    label: `Estimated monthly cost (${baseCurrency.value})`,
    value: monthlySubscriptionCost.value,
    precision: 2
  },
  {
    label: "Charges in 30 days",
    value: upcomingSubscriptions.value.length,
    precision: 0
  },
  { label: "Trials ending soon", value: expiringTrialsCount.value, precision: 0 }
]);

const formRules: FormRules<SubscriptionInput> = {
  name: [{ required: true, message: "Name is required.", trigger: "blur" }],
  category: [{ required: true, message: "Category is required.", trigger: "change" }],
  billing_cycle: [{ required: true, message: "Billing cycle is required.", trigger: "change" }],
  status: [{ required: true, message: "Status is required.", trigger: "change" }],
  currency: [{ required: true, message: "Currency is required.", trigger: "change" }],
  amount: [
    {
      validator: (_rule, value, callback) => {
        if (!Number.isFinite(Number(value)) || Number(value) < 0) {
          callback(new Error("Amount must be greater than or equal to 0."));
          return;
        }
        callback();
      },
      trigger: "change"
    }
  ],
  reminder_days: [
    {
      validator: (_rule, value, callback) => {
        if (!Number.isFinite(Number(value)) || Number(value) < 0) {
          callback(new Error("Reminder days must be greater than or equal to 0."));
          return;
        }
        callback();
      },
      trigger: "change"
    }
  ],
  next_billing_date: [
    {
      validator: (_rule, value, callback) => {
        if (form.start_date && value && String(value) < form.start_date) {
          callback(new Error("Next billing date cannot be earlier than start date."));
          return;
        }
        callback();
      },
      trigger: "change"
    }
  ]
};

onMounted(() => {
  void loadPageData();
});

async function loadPageData(): Promise<void> {
  loading.value = true;

  try {
    loadError.value = "";
    const [subscriptionRows, upcomingRows, accountRows, nextBaseCurrency] =
      await Promise.all([
        listSubscriptions(),
        listUpcomingSubscriptions(30),
        listAccounts(),
        getBaseCurrency()
      ]);

    subscriptions.value = subscriptionRows;
    upcomingSubscriptions.value = upcomingRows;
    accounts.value = accountRows;
    baseCurrency.value = nextBaseCurrency;
    monthlySubscriptionCost.value = await calculateMonthlyCost(subscriptionRows);
  } catch (error) {
    const message = getErrorMessage(error);
    loadError.value = message;
    ElMessage.error(message);
  } finally {
    loading.value = false;
  }
}

function openCreateDialog(): void {
  editingSubscriptionId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function openEditDialog(subscription: Subscription): void {
  if (!subscription.id) {
    ElMessage.error("Subscription ID is missing.");
    return;
  }

  editingSubscriptionId.value = subscription.id;
  Object.assign(form, {
    name: subscription.name,
    provider: subscription.provider ?? "",
    category: subscription.category,
    account_id: subscription.account_id ?? null,
    amount: Number(subscription.amount),
    currency: subscription.currency,
    billing_cycle: subscription.billing_cycle,
    start_date: subscription.start_date ?? "",
    next_billing_date: subscription.next_billing_date ?? "",
    trial_end_date: subscription.trial_end_date ?? "",
    status: subscription.status,
    auto_renew: subscription.auto_renew,
    reminder_days: Number(subscription.reminder_days),
    url: subscription.url ?? "",
    note: subscription.note ?? ""
  });
  dialogVisible.value = true;
}

async function handleSubmit(): Promise<void> {
  if (!formRef.value) {
    return;
  }

  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) {
    return;
  }

  submitting.value = true;

  try {
    const input = normalizeFormInput();

    if (editingSubscriptionId.value === null) {
      await createSubscription(input);
      ElMessage.success("Subscription created.");
    } else {
      await updateSubscription(editingSubscriptionId.value, input);
      ElMessage.success("Subscription updated.");
    }

    dialogVisible.value = false;
    await loadPageData();
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    submitting.value = false;
  }
}

function openPaymentDialog(subscription: Subscription): void {
  if (!subscription.id) {
    ElMessage.error("Subscription ID is missing.");
    return;
  }

  payingSubscriptionId.value = subscription.id;
  paymentForm.paidDate = getToday();
  paymentForm.note = "";
  paymentDialogVisible.value = true;
}

async function handleMarkPaid(): Promise<void> {
  if (!payingSubscriptionId.value) {
    return;
  }

  paying.value = true;

  try {
    await markSubscriptionPaid(
      payingSubscriptionId.value,
      paymentForm.paidDate,
      paymentForm.note
    );
    paymentDialogVisible.value = false;
    ElMessage.success("Payment recorded.");
    await loadPageData();
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    paying.value = false;
  }
}

async function changeStatus(
  subscription: Subscription,
  status: SubscriptionStatus
): Promise<void> {
  if (!subscription.id) {
    ElMessage.error("Subscription ID is missing.");
    return;
  }

  try {
    await setSubscriptionStatus(subscription.id, status);
    ElMessage.success(`Subscription ${status}.`);
    await loadPageData();
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  }
}

async function handleDelete(subscription: Subscription): Promise<void> {
  if (!subscription.id) {
    ElMessage.error("Subscription ID is missing.");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `Delete subscription "${subscription.name}"? Subscriptions with payments can only be canceled.`,
      "Delete Subscription",
      {
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
        type: "warning",
        confirmButtonClass: "el-button--danger"
      }
    );
    await deleteSubscription(subscription.id);
    ElMessage.success("Subscription deleted.");
    await loadPageData();
  } catch (error) {
    if (error === "cancel" || error === "close") {
      return;
    }
    ElMessage.error(getErrorMessage(error));
  }
}

async function calculateMonthlyCost(rows: Subscription[]): Promise<number> {
  let total = 0;

  for (const subscription of rows) {
    if (!["active", "trial"].includes(subscription.status)) {
      continue;
    }

    const monthlyAmount = getMonthlyEquivalent(
      Number(subscription.amount),
      subscription.billing_cycle
    );
    total += await convertAmount(
      monthlyAmount,
      subscription.currency,
      baseCurrency.value
    );
  }

  return total;
}

function getMonthlyEquivalent(amount: number, cycle: BillingCycle): number {
  const multipliers: Record<BillingCycle, number> = {
    weekly: 52 / 12,
    monthly: 1,
    quarterly: 1 / 3,
    yearly: 1 / 12,
    custom: 1
  };

  return amount * multipliers[cycle];
}

function resetForm(): void {
  Object.assign(form, {
    name: "",
    provider: "",
    category: "software",
    account_id: null,
    amount: 0,
    currency: baseCurrency.value || "USD",
    billing_cycle: "monthly",
    start_date: "",
    next_billing_date: "",
    trial_end_date: "",
    status: "active",
    auto_renew: 1,
    reminder_days: 7,
    url: "",
    note: ""
  });
  formRef.value?.clearValidate();
}

function normalizeFormInput(): SubscriptionInput {
  return {
    name: form.name.trim(),
    provider: form.provider?.trim() || null,
    category: form.category,
    account_id: form.account_id ? Number(form.account_id) : null,
    amount: Number(form.amount),
    currency: form.currency,
    billing_cycle: form.billing_cycle,
    start_date: form.start_date || null,
    next_billing_date: form.next_billing_date || null,
    trial_end_date: form.trial_end_date || null,
    status: form.status,
    auto_renew: form.auto_renew ? 1 : 0,
    reminder_days: Number(form.reminder_days),
    url: form.url?.trim() || null,
    note: form.note?.trim() || null
  };
}

function statusTagType(
  status: SubscriptionStatus
): "success" | "warning" | "info" | "primary" | "danger" {
  const types: Record<
    SubscriptionStatus,
    "success" | "warning" | "info" | "primary" | "danger"
  > = {
    active: "success",
    trial: "primary",
    paused: "warning",
    canceled: "info",
    expired: "danger"
  };

  return types[status];
}

function formatMoney(value: number): string {
  return Number(value || 0).toFixed(2);
}

function getToday(): string {
  return formatLocalDate(new Date());
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
</script>

<style scoped>
.subscriptions-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-toolbar,
.section-header,
.toolbar-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-toolbar {
  align-items: flex-start;
  padding: 24px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.section-card {
  border-radius: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

.full-width {
  width: 100%;
}

:deep(.el-card__body) {
  overflow-x: auto;
}

@media (max-width: 1100px) {
  .stats-grid,
  .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .page-toolbar,
  .toolbar-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .stats-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
