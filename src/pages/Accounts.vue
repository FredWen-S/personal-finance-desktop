<template>
  <section class="accounts-page">
    <div class="accounts-toolbar">
      <div>
        <h1 class="page-title">账户管理</h1>
        <p class="page-description">Manage local accounts stored in SQLite.</p>
      </div>
      <div class="toolbar-actions">
        <el-radio-group v-model="viewMode">
          <el-radio-button label="table">表格视图</el-radio-button>
          <el-radio-button label="currency">按币种分组视图</el-radio-button>
        </el-radio-group>
        <el-button type="primary" @click="openCreateDialog">新增账户</el-button>
      </div>
    </div>

    <el-table
      v-if="viewMode === 'table'"
      v-loading="loading"
      :data="accounts"
      class="accounts-table"
      border
      empty-text="暂无账户"
    >
      <el-table-column prop="name" label="账户名称" min-width="160" />
      <el-table-column label="类型" width="130">
        <template #default="{ row }: { row: Account }">
          {{ formatAccountType(row.type) }}
        </template>
      </el-table-column>
      <el-table-column prop="currency" label="币种" width="90" />
      <el-table-column label="余额" width="140" align="right">
        <template #default="{ row }: { row: Account }">
          {{ formatBalance(row.balance) }}
        </template>
      </el-table-column>
      <el-table-column prop="institution" label="机构" min-width="140" />
      <el-table-column label="信用额度" width="130" align="right">
        <template #default="{ row }: { row: Account }">
          {{ row.type === "credit_card" ? formatBalance(row.credit_limit ?? 0) : "-" }}
        </template>
      </el-table-column>
      <el-table-column label="账单日" width="90">
        <template #default="{ row }: { row: Account }">
          {{ row.type === "credit_card" ? row.statement_day || "-" : "-" }}
        </template>
      </el-table-column>
      <el-table-column label="还款日" width="90">
        <template #default="{ row }: { row: Account }">
          {{ row.type === "credit_card" ? row.due_day || "-" : "-" }}
        </template>
      </el-table-column>
      <el-table-column label="卡组织" width="120">
        <template #default="{ row }: { row: Account }">
          {{ row.type === "credit_card" ? row.card_network || "-" : "-" }}
        </template>
      </el-table-column>
      <el-table-column label="后四位" width="90">
        <template #default="{ row }: { row: Account }">
          {{ row.type === "credit_card" ? row.last_four || "-" : "-" }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }: { row: Account }">
          <el-tag :type="row.is_active === 1 ? 'success' : 'info'" effect="light">
            {{ row.is_active === 1 ? "启用" : "停用" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="note" label="备注" min-width="180" show-overflow-tooltip />
      <el-table-column label="操作" width="230" fixed="right">
        <template #default="{ row }: { row: Account }">
          <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
          <el-button link type="warning" @click="handleToggleActive(row)">
            {{ row.is_active === 1 ? "停用" : "启用" }}
          </el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-else v-loading="loading" class="currency-groups">
      <el-empty v-if="currencyGroups.length === 0" description="暂无账户" />
      <el-card
        v-for="group in currencyGroups"
        v-else
        :key="group.currency"
        class="currency-group-card"
        shadow="never"
      >
        <template #header>
          <div class="currency-group-header">
            <strong>{{ group.currency }}</strong>
            <div class="currency-group-summary">
              <span>资产 {{ formatBalance(group.totalAssets) }}</span>
              <span>负债 {{ formatBalance(group.totalLiabilities) }}</span>
              <span>净额 {{ formatBalance(group.netAmount) }}</span>
            </div>
          </div>
        </template>

        <el-table :data="group.accounts" stripe>
          <el-table-column prop="name" label="账户" min-width="160" />
          <el-table-column label="类型" width="130">
            <template #default="{ row }: { row: Account }">
              {{ formatAccountType(row.type) }}
            </template>
          </el-table-column>
          <el-table-column label="资产" width="130" align="right">
            <template #default="{ row }: { row: Account }">
              {{ formatBalance(getAccountAssetAmount(row)) }}
            </template>
          </el-table-column>
          <el-table-column label="负债" width="130" align="right">
            <template #default="{ row }: { row: Account }">
              {{ formatBalance(getAccountLiabilityAmount(row)) }}
            </template>
          </el-table-column>
          <el-table-column prop="institution" label="机构" min-width="140" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }: { row: Account }">
              <el-tag :type="row.is_active === 1 ? 'success' : 'info'" effect="light">
                {{ row.is_active === 1 ? "启用" : "停用" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="230" fixed="right">
            <template #default="{ row }: { row: Account }">
              <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
              <el-button link type="warning" @click="handleToggleActive(row)">
                {{ row.is_active === 1 ? "停用" : "启用" }}
              </el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editingAccountId === null ? '新增账户' : '编辑账户'"
      width="560px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="96px"
        status-icon
      >
        <el-form-item label="账户名称" prop="name">
          <el-input v-model.trim="form.name" placeholder="例如 Chase Checking" />
        </el-form-item>

        <el-form-item label="类型" prop="type">
          <el-select v-model="form.type" class="full-width" placeholder="请选择类型">
            <el-option
              v-for="option in accountTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="币种" prop="currency">
          <el-select v-model="form.currency" class="full-width" placeholder="请选择币种">
            <el-option
              v-for="currency in currencyOptions"
              :key="currency"
              :label="currency"
              :value="currency"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="balanceLabel" prop="balance">
          <el-input-number
            v-model="form.balance"
            class="full-width"
            :precision="2"
            :step="100"
            controls-position="right"
          />
          <div v-if="form.type === 'credit_card'" class="field-help">
            信用卡余额按欠款处理，正数计入负债；如果是溢缴款，可输入负数。
          </div>
        </el-form-item>

        <template v-if="form.type === 'credit_card'">
          <el-form-item label="信用额度" prop="credit_limit">
            <el-input-number
              v-model="form.credit_limit"
              class="full-width"
              :min="0"
              :precision="2"
              :step="100"
              controls-position="right"
            />
          </el-form-item>

          <el-form-item label="账单日" prop="statement_day">
            <el-input-number
              v-model="form.statement_day"
              class="full-width"
              :min="1"
              :max="31"
              :step="1"
              controls-position="right"
            />
          </el-form-item>

          <el-form-item label="还款日" prop="due_day">
            <el-input-number
              v-model="form.due_day"
              class="full-width"
              :min="1"
              :max="31"
              :step="1"
              controls-position="right"
            />
          </el-form-item>

          <el-form-item label="卡组织" prop="card_network">
            <el-select v-model="form.card_network" class="full-width" clearable>
              <el-option
                v-for="network in cardNetworkOptions"
                :key="network"
                :label="network"
                :value="network"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="后四位" prop="last_four">
            <el-input v-model.trim="form.last_four" maxlength="4" />
          </el-form-item>
        </template>

        <el-form-item label="机构" prop="institution">
          <el-input v-model.trim="form.institution" placeholder="可选" />
        </el-form-item>

        <el-form-item label="备注" prop="note">
          <el-input
            v-model.trim="form.note"
            type="textarea"
            :rows="3"
            placeholder="可选"
          />
        </el-form-item>

        <el-form-item label="状态" prop="is_active">
          <el-switch
            v-model="form.is_active"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="停用"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          保存
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  setAccountActive,
  updateAccount
} from "../services/accountService";
import type { Account, AccountInput } from "../types/account";

interface CurrencyGroup {
  currency: string;
  accounts: Account[];
  totalAssets: number;
  totalLiabilities: number;
  netAmount: number;
}

const accountTypeOptions = [
  { label: "Cash", value: "cash" },
  { label: "Bank", value: "bank" },
  { label: "Credit Card", value: "credit_card" },
  { label: "Wallet", value: "wallet" },
  { label: "Investment", value: "investment" },
  { label: "Stored Value", value: "stored_value" },
  { label: "Other", value: "other" }
];

const currencyOptions = ["USD", "CNY", "JPY", "EUR", "GBP", "HKD"];
const cardNetworkOptions = [
  "Visa",
  "Mastercard",
  "Amex",
  "Discover",
  "UnionPay",
  "Other"
];

const accounts = ref<Account[]>([]);
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const editingAccountId = ref<number | null>(null);
const formRef = ref<FormInstance>();
const viewMode = ref<"table" | "currency">("table");

const form = reactive<AccountInput>({
  name: "",
  type: "bank",
  currency: "USD",
  balance: 0,
  institution: "",
  note: "",
  credit_limit: 0,
  statement_day: null,
  due_day: null,
  card_network: "",
  last_four: "",
  is_active: 1
});

const formRules: FormRules<AccountInput> = {
  name: [{ required: true, message: "请输入账户名称", trigger: "blur" }],
  type: [{ required: true, message: "请选择账户类型", trigger: "change" }],
  currency: [{ required: true, message: "请选择币种", trigger: "change" }],
  balance: [
    {
      required: true,
      type: "number",
      message: "请输入余额",
      trigger: "change"
    }
  ]
};

const balanceLabel = computed(() =>
  form.type === "credit_card" ? "当前欠款" : "余额"
);

const currencyGroups = computed<CurrencyGroup[]>(() => {
  const groups = new Map<string, CurrencyGroup>();

  for (const account of accounts.value) {
    const group =
      groups.get(account.currency) ??
      {
        currency: account.currency,
        accounts: [],
        totalAssets: 0,
        totalLiabilities: 0,
        netAmount: 0
      };

    group.accounts.push(account);
    group.totalAssets += getAccountAssetAmount(account);
    group.totalLiabilities += getAccountLiabilityAmount(account);
    group.netAmount = group.totalAssets - group.totalLiabilities;
    groups.set(account.currency, group);
  }

  return [...groups.values()].sort((left, right) =>
    left.currency.localeCompare(right.currency)
  );
});

onMounted(() => {
  void loadAccounts();
});

async function loadAccounts(): Promise<void> {
  loading.value = true;

  try {
    accounts.value = await listAccounts();
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

function openCreateDialog(): void {
  editingAccountId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function openEditDialog(account: Account): void {
  if (account.id === undefined) {
    ElMessage.error("账户 ID 缺失，无法编辑");
    return;
  }

  editingAccountId.value = account.id;
  form.name = account.name;
  form.type = account.type;
  form.currency = account.currency;
  form.balance = Number(account.balance);
  form.institution = account.institution ?? "";
  form.note = account.note ?? "";
  form.credit_limit = Number(account.credit_limit ?? 0);
  form.statement_day = account.statement_day ?? null;
  form.due_day = account.due_day ?? null;
  form.card_network = account.card_network ?? "";
  form.last_four = account.last_four ?? "";
  form.is_active = account.is_active;
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

    if (editingAccountId.value === null) {
      await createAccount(input);
      ElMessage.success("账户已新增");
    } else {
      await updateAccount(editingAccountId.value, input);
      ElMessage.success("账户已更新");
    }

    dialogVisible.value = false;
    await loadAccounts();
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    submitting.value = false;
  }
}

async function handleToggleActive(account: Account): Promise<void> {
  if (account.id === undefined) {
    ElMessage.error("账户 ID 缺失，无法更新状态");
    return;
  }

  const nextActive = account.is_active !== 1;

  try {
    await setAccountActive(account.id, nextActive);
    ElMessage.success(nextActive ? "账户已启用" : "账户已停用");
    await loadAccounts();
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  }
}

async function handleDelete(account: Account): Promise<void> {
  if (account.id === undefined) {
    ElMessage.error("账户 ID 缺失，无法删除");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确认删除账户「${account.name}」？此操作不可恢复。`,
      "删除账户",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
        confirmButtonClass: "el-button--danger"
      }
    );

    await deleteAccount(account.id);
    ElMessage.success("账户已删除");
    await loadAccounts();
  } catch (error) {
    if (error === "cancel" || error === "close") {
      return;
    }

    const message = getErrorMessage(error);

    if (message.includes("已有流水记录")) {
      ElMessage.warning(message);
      return;
    }

    ElMessage.error(message);
  }
}

function resetForm(): void {
  form.name = "";
  form.type = "bank";
  form.currency = "USD";
  form.balance = 0;
  form.institution = "";
  form.note = "";
  form.credit_limit = 0;
  form.statement_day = null;
  form.due_day = null;
  form.card_network = "";
  form.last_four = "";
  form.is_active = 1;
  formRef.value?.clearValidate();
}

function normalizeFormInput(): AccountInput {
  const isCreditCard = form.type === "credit_card";

  return {
    name: form.name.trim(),
    type: form.type,
    currency: form.currency,
    balance: Number(form.balance),
    institution: form.institution?.trim() || undefined,
    note: form.note?.trim() || undefined,
    credit_limit: isCreditCard ? Number(form.credit_limit ?? 0) : 0,
    statement_day: isCreditCard ? form.statement_day ?? null : null,
    due_day: isCreditCard ? form.due_day ?? null : null,
    card_network: isCreditCard ? form.card_network?.trim() || undefined : undefined,
    last_four: isCreditCard ? form.last_four?.trim() || undefined : undefined,
    is_active: form.is_active
  };
}

function getAccountAssetAmount(account: Account): number {
  const balance = Number(account.balance ?? 0);

  if (account.type === "credit_card") {
    return balance < 0 ? Math.abs(balance) : 0;
  }

  return balance > 0 ? balance : 0;
}

function getAccountLiabilityAmount(account: Account): number {
  const balance = Number(account.balance ?? 0);

  if (account.type === "credit_card") {
    return balance > 0 ? balance : 0;
  }

  return balance < 0 ? Math.abs(balance) : 0;
}

function formatAccountType(type: string): string {
  return (
    accountTypeOptions.find((option) => option.value === type)?.label ?? type
  );
}

function formatBalance(balance: number): string {
  return Number(balance).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
</script>

<style scoped>
.accounts-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.accounts-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.accounts-table {
  width: 100%;
}

.currency-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.currency-group-card {
  border-radius: 8px;
}

.currency-group-header,
.currency-group-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.currency-group-header {
  justify-content: space-between;
}

.currency-group-summary {
  color: #4b5563;
  font-size: 13px;
}

.full-width {
  width: 100%;
}

.field-help {
  margin-top: 6px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 780px) {
  .accounts-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .toolbar-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
