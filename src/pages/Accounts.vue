<template>
  <section class="accounts-page">
    <div class="accounts-toolbar">
      <div>
        <h1 class="page-title">账户管理</h1>
        <p class="page-description">Manage local accounts stored in SQLite.</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">新增账户</el-button>
    </div>

    <el-table
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

        <el-form-item label="余额" prop="balance">
          <el-input-number
            v-model="form.balance"
            class="full-width"
            :precision="2"
            :step="100"
            controls-position="right"
          />
        </el-form-item>

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
import { onMounted, reactive, ref } from "vue";
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

const accounts = ref<Account[]>([]);
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const editingAccountId = ref<number | null>(null);
const formRef = ref<FormInstance>();

const form = reactive<AccountInput>({
  name: "",
  type: "bank",
  currency: "USD",
  balance: 0,
  institution: "",
  note: "",
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

    if (message === "该账户已有流水记录，请停用账户而不是删除。") {
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
  form.is_active = 1;
  formRef.value?.clearValidate();
}

function normalizeFormInput(): AccountInput {
  return {
    name: form.name.trim(),
    type: form.type,
    currency: form.currency,
    balance: Number(form.balance),
    institution: form.institution?.trim() || undefined,
    note: form.note?.trim() || undefined,
    is_active: form.is_active
  };
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

.accounts-table {
  width: 100%;
}

.full-width {
  width: 100%;
}
</style>
