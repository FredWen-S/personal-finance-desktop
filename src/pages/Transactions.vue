<template>
  <section class="transactions-page">
    <div class="transactions-toolbar">
      <div>
        <h1 class="page-title">流水管理</h1>
        <p class="page-description">Manage transactions and account balance changes.</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">新增流水</el-button>
    </div>

    <div class="filter-bar">
      <el-select
        v-model="filters.type"
        clearable
        placeholder="按类型筛选"
        class="filter-control"
      >
        <el-option
          v-for="option in transactionTypeOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>

      <el-select
        v-model="filters.accountId"
        clearable
        placeholder="按账户筛选"
        class="filter-control"
      >
        <el-option
          v-for="account in activeAccounts"
          :key="account.id"
          :label="account.name"
          :value="account.id"
        />
      </el-select>

      <el-date-picker
        v-model="filters.month"
        type="month"
        value-format="YYYY-MM"
        placeholder="按月份筛选"
        class="filter-control"
      />
    </div>

    <el-table
      v-loading="loading"
      :data="filteredTransactions"
      class="transactions-table"
      border
      empty-text="暂无流水"
    >
      <el-table-column prop="date" label="日期" width="120" />
      <el-table-column label="类型" width="120">
        <template #default="{ row }: { row: Transaction }">
          <el-tag :type="getTransactionTagType(row.type)" effect="light">
            {{ formatTransactionType(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="account_name" label="账户" min-width="150" />
      <el-table-column label="转入账户" min-width="150">
        <template #default="{ row }: { row: Transaction }">
          {{ row.type === "transfer" ? row.target_account_name ?? "-" : "-" }}
        </template>
      </el-table-column>
      <el-table-column label="金额" width="130" align="right">
        <template #default="{ row }: { row: Transaction }">
          <span :class="getAmountClass(row.type)">
            {{ formatDisplayAmount(row) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="currency" label="币种" width="90" />
      <el-table-column prop="category" label="分类" width="120" />
      <el-table-column prop="merchant" label="商户" min-width="140" />
      <el-table-column label="是否报销" width="100">
        <template #default="{ row }: { row: Transaction }">
          {{ row.is_reimbursable === 1 ? "是" : "否" }}
        </template>
      </el-table-column>
      <el-table-column
        prop="description"
        label="描述"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }: { row: Transaction }">
          <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="editingTransactionId === null ? '新增流水' : '编辑流水'"
      width="620px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="112px"
        status-icon
      >
        <el-form-item label="类型" prop="type">
          <el-select v-model="form.type" class="full-width" @change="handleTypeChange">
            <el-option
              v-for="option in transactionTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="账户" prop="account_id">
          <el-select v-model="form.account_id" class="full-width" placeholder="请选择账户">
            <el-option
              v-for="account in activeAccounts"
              :key="account.id"
              :label="account.name"
              :value="account.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item
          v-if="form.type === 'transfer'"
          label="转入账户"
          prop="target_account_id"
        >
          <el-select
            v-model="form.target_account_id"
            class="full-width"
            placeholder="请选择转入账户"
          >
            <el-option
              v-for="account in activeAccounts"
              :key="account.id"
              :label="account.name"
              :value="account.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="日期" prop="date">
          <el-date-picker
            v-model="form.date"
            type="date"
            value-format="YYYY-MM-DD"
            class="full-width"
            placeholder="请选择日期"
          />
        </el-form-item>

        <el-form-item label="金额" prop="amount">
          <el-input-number
            v-model="form.amount"
            class="full-width"
            :precision="2"
            :min="0"
            :step="10"
            controls-position="right"
          />
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

        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" class="full-width" placeholder="请选择分类">
            <el-option
              v-for="category in categoryOptions"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="商户" prop="merchant">
          <el-input v-model.trim="form.merchant" placeholder="可选" />
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model.trim="form.description"
            type="textarea"
            :rows="3"
            placeholder="可选"
          />
        </el-form-item>

        <el-form-item label="是否报销" prop="is_reimbursable">
          <el-switch
            v-model="form.is_reimbursable"
            :active-value="1"
            :inactive-value="0"
            active-text="是"
            inactive-text="否"
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
import { listAccounts } from "../services/accountService";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction
} from "../services/transactionService";
import type { Account } from "../types/account";
import type {
  Transaction,
  TransactionInput,
  TransactionType
} from "../types/transaction";

const transactionTypeOptions: Array<{ label: string; value: TransactionType }> = [
  { label: "Expense", value: "expense" },
  { label: "Income", value: "income" },
  { label: "Adjustment", value: "adjustment" },
  { label: "Transfer", value: "transfer" }
];

const categoryOptions = [
  "food",
  "transport",
  "rent",
  "tuition",
  "shopping",
  "travel",
  "phone",
  "subscription",
  "medical",
  "entertainment",
  "transfer",
  "other"
];

const currencyOptions = ["USD", "CNY", "JPY", "EUR", "GBP", "HKD"];

const transactions = ref<Transaction[]>([]);
const accounts = ref<Account[]>([]);
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const editingTransactionId = ref<number | null>(null);
const formRef = ref<FormInstance>();

const filters = reactive<{
  type: TransactionType | "";
  accountId: number | "";
  month: string;
}>({
  type: "",
  accountId: "",
  month: ""
});

const form = reactive<TransactionInput>({
  type: "expense",
  account_id: 0,
  target_account_id: null,
  date: getToday(),
  amount: 0,
  currency: "USD",
  category: "other",
  merchant: "",
  description: "",
  is_reimbursable: 0
});

const activeAccounts = computed(() =>
  accounts.value.filter((account) => account.is_active === 1 && account.id)
);

const filteredTransactions = computed(() =>
  transactions.value.filter((transaction) => {
    const matchesType = !filters.type || transaction.type === filters.type;
    const matchesAccount =
      !filters.accountId ||
      transaction.account_id === filters.accountId ||
      transaction.target_account_id === filters.accountId;
    const matchesMonth = !filters.month || transaction.date.startsWith(filters.month);

    return matchesType && matchesAccount && matchesMonth;
  })
);

const formRules: FormRules<TransactionInput> = {
  type: [{ required: true, message: "请选择流水类型", trigger: "change" }],
  account_id: [
    {
      required: true,
      type: "number",
      min: 1,
      message: "请选择账户",
      trigger: "change"
    }
  ],
  target_account_id: [
    {
      validator: (_rule, value, callback) => {
        if (form.type !== "transfer") {
          callback();
          return;
        }

        if (!value) {
          callback(new Error("请选择转入账户"));
          return;
        }

        if (value === form.account_id) {
          callback(new Error("转出账户和转入账户不能相同"));
          return;
        }

        callback();
      },
      trigger: "change"
    }
  ],
  date: [{ required: true, message: "请选择日期", trigger: "change" }],
  amount: [
    {
      validator: (_rule, value, callback) => {
        if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
          callback(new Error("金额必须大于 0"));
          return;
        }

        callback();
      },
      trigger: "change"
    }
  ],
  currency: [{ required: true, message: "请选择币种", trigger: "change" }],
  category: [{ required: true, message: "请选择分类", trigger: "change" }]
};

onMounted(() => {
  void loadPageData();
});

async function loadPageData(): Promise<void> {
  loading.value = true;

  try {
    const [transactionRows, accountRows] = await Promise.all([
      listTransactions(),
      listAccounts()
    ]);

    transactions.value = transactionRows;
    accounts.value = accountRows;
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

function openCreateDialog(): void {
  editingTransactionId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function openEditDialog(transaction: Transaction): void {
  if (transaction.id === undefined) {
    ElMessage.error("流水 ID 缺失，无法编辑");
    return;
  }

  editingTransactionId.value = transaction.id;
  form.type = transaction.type;
  form.account_id = transaction.account_id;
  form.target_account_id = transaction.target_account_id ?? null;
  form.date = transaction.date;
  form.amount = Number(transaction.amount);
  form.currency = transaction.currency;
  form.category = transaction.category;
  form.merchant = transaction.merchant ?? "";
  form.description = transaction.description ?? "";
  form.is_reimbursable = transaction.is_reimbursable;
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

    if (editingTransactionId.value === null) {
      await createTransaction(input);
      ElMessage.success("流水已新增");
    } else {
      await updateTransaction(editingTransactionId.value, input);
      ElMessage.success("流水已更新");
    }

    dialogVisible.value = false;
    await loadPageData();
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(transaction: Transaction): Promise<void> {
  if (transaction.id === undefined) {
    ElMessage.error("流水 ID 缺失，无法删除");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确认删除这笔 ${formatTransactionType(transaction.type)} 流水？此操作会回退账户余额。`,
      "删除流水",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
        confirmButtonClass: "el-button--danger"
      }
    );

    await deleteTransaction(transaction.id);
    ElMessage.success("流水已删除");
    await loadPageData();
  } catch (error) {
    if (error === "cancel" || error === "close") {
      return;
    }

    ElMessage.error(getErrorMessage(error));
  }
}

function handleTypeChange(type: TransactionType): void {
  if (type !== "transfer") {
    form.target_account_id = null;
  } else {
    form.category = "transfer";
  }
}

function resetForm(): void {
  form.type = "expense";
  form.account_id = activeAccounts.value[0]?.id ?? 0;
  form.target_account_id = null;
  form.date = getToday();
  form.amount = 0;
  form.currency = "USD";
  form.category = "other";
  form.merchant = "";
  form.description = "";
  form.is_reimbursable = 0;
  formRef.value?.clearValidate();
}

function normalizeFormInput(): TransactionInput {
  return {
    type: form.type,
    account_id: Number(form.account_id),
    target_account_id:
      form.type === "transfer" ? Number(form.target_account_id) : null,
    date: form.date,
    amount: Number(form.amount),
    currency: form.currency,
    category: form.category,
    merchant: form.merchant?.trim() || null,
    description: form.description?.trim() || null,
    is_reimbursable: form.is_reimbursable
  };
}

function formatTransactionType(type: TransactionType): string {
  return (
    transactionTypeOptions.find((option) => option.value === type)?.label ?? type
  );
}

function formatDisplayAmount(transaction: Transaction): string {
  const amount = Number(transaction.amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  if (transaction.type === "expense") {
    return `-${amount}`;
  }

  return amount;
}

function getAmountClass(type: TransactionType): string {
  if (type === "expense") {
    return "amount-negative";
  }

  if (type === "income" || type === "adjustment") {
    return "amount-positive";
  }

  return "";
}

function getTransactionTagType(
  type: TransactionType
): "success" | "warning" | "info" | "primary" {
  if (type === "income") {
    return "success";
  }

  if (type === "expense") {
    return "warning";
  }

  if (type === "transfer") {
    return "primary";
  }

  return "info";
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
</script>

<style scoped>
.transactions-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.transactions-toolbar,
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.filter-bar {
  justify-content: flex-start;
  padding: 16px 24px;
}

.filter-control {
  width: 220px;
}

.transactions-table {
  width: 100%;
}

.full-width {
  width: 100%;
}

.amount-negative {
  color: #dc2626;
}

.amount-positive {
  color: #059669;
}
</style>
