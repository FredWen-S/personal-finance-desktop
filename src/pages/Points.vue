<template>
  <section class="points-page">
    <div class="points-toolbar">
      <div>
        <h1 class="page-title">积分/里程管理</h1>
        <p class="page-description">Manage rewards programs and point activity.</p>
      </div>
      <div class="toolbar-actions">
        <el-button type="primary" @click="openProgramCreateDialog">
          新增积分账户
        </el-button>
        <el-button type="success" @click="openTransactionCreateDialog">
          新增积分流水
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="expiringPrograms.length > 0"
      title="未来 90 天内即将过期"
      type="warning"
      show-icon
      :closable="false"
    >
      <div class="expiry-list">
        <span
          v-for="program in expiringPrograms"
          :key="program.id"
          class="expiry-item"
        >
          {{ program.name }}：{{ formatPoints(program.balance) }}，{{ program.expire_date }}
        </span>
      </div>
    </el-alert>

    <section class="section-panel">
      <div class="section-header">
        <h2>积分账户</h2>
      </div>

      <el-table
        v-loading="loading"
        :data="programs"
        class="points-table"
        border
        empty-text="暂无积分账户"
      >
        <el-table-column prop="name" label="名称" min-width="150" />
        <el-table-column label="类型" width="120">
          <template #default="{ row }: { row: PointProgram }">
            {{ formatProgramType(row.type) }}
          </template>
        </el-table-column>
        <el-table-column label="当前余额" width="130" align="right">
          <template #default="{ row }: { row: PointProgram }">
            {{ formatPoints(row.balance) }}
          </template>
        </el-table-column>
        <el-table-column prop="tier" label="会员等级" width="120" />
        <el-table-column prop="expire_date" label="过期日期" width="120" />
        <el-table-column label="估值单价" width="110" align="right">
          <template #default="{ row }: { row: PointProgram }">
            {{ formatMoney(row.value_per_point ?? 0) }}
          </template>
        </el-table-column>
        <el-table-column label="估算价值" width="120" align="right">
          <template #default="{ row }: { row: PointProgram }">
            {{ formatMoney(row.balance * Number(row.value_per_point ?? 0)) }}
          </template>
        </el-table-column>
        <el-table-column prop="institution" label="机构" min-width="130" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }: { row: PointProgram }">
            <el-tag :type="row.is_active === 1 ? 'success' : 'info'" effect="light">
              {{ row.is_active === 1 ? "启用" : "停用" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" min-width="160" show-overflow-tooltip />
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }: { row: PointProgram }">
            <el-button link type="primary" @click="openProgramEditDialog(row)">
              编辑
            </el-button>
            <el-button link type="warning" @click="handleToggleProgramActive(row)">
              {{ row.is_active === 1 ? "停用" : "启用" }}
            </el-button>
            <el-button link type="danger" @click="handleDeleteProgram(row)">
              删除
            </el-button>
            <el-button link type="success" @click="showProgramTransactions(row)">
              查看流水
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="section-panel">
      <div class="section-header">
        <h2>积分流水</h2>
        <el-select
          v-model="transactionProgramFilter"
          clearable
          placeholder="按积分账户筛选"
          class="program-filter"
        >
          <el-option
            v-for="program in programs"
            :key="program.id"
            :label="program.name"
            :value="program.id"
          />
        </el-select>
      </div>

      <el-table
        v-loading="loading"
        :data="filteredTransactions"
        class="points-table"
        border
        empty-text="暂无积分流水"
      >
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column prop="program_name" label="积分账户" min-width="150" />
        <el-table-column label="类型" width="120">
          <template #default="{ row }: { row: PointTransaction }">
            <el-tag :type="getTransactionTagType(row.type)" effect="light">
              {{ formatTransactionType(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="点数" width="130" align="right">
          <template #default="{ row }: { row: PointTransaction }">
            <span :class="getPointAmountClass(row.type)">
              {{ formatDisplayPoints(row) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="现金价值" width="120" align="right">
          <template #default="{ row }: { row: PointTransaction }">
            {{ row.related_cash_value == null ? "-" : formatMoney(row.related_cash_value) }}
          </template>
        </el-table-column>
        <el-table-column prop="expire_date" label="过期日期" width="120" />
        <el-table-column
          prop="description"
          label="描述"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }: { row: PointTransaction }">
            <el-button link type="primary" @click="openTransactionEditDialog(row)">
              编辑
            </el-button>
            <el-button link type="danger" @click="handleDeleteTransaction(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog
      v-model="programDialogVisible"
      :title="editingProgramId === null ? '新增积分账户' : '编辑积分账户'"
      width="640px"
      destroy-on-close
    >
      <el-form
        ref="programFormRef"
        :model="programForm"
        :rules="programRules"
        label-width="116px"
        status-icon
      >
        <el-form-item label="名称" prop="name">
          <el-input v-model.trim="programForm.name" placeholder="例如 Flying Blue" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="programForm.type" class="full-width">
            <el-option
              v-for="option in programTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="余额" prop="balance">
          <el-input-number
            v-model="programForm.balance"
            class="full-width"
            :min="0"
            :precision="2"
            :step="1000"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="会员等级" prop="tier">
          <el-input v-model.trim="programForm.tier" placeholder="可选" />
        </el-form-item>
        <el-form-item label="过期日期" prop="expire_date">
          <el-date-picker
            v-model="programForm.expire_date"
            type="date"
            value-format="YYYY-MM-DD"
            class="full-width"
            placeholder="可选"
          />
        </el-form-item>
        <el-form-item label="估值单价" prop="value_per_point">
          <el-input-number
            v-model="programForm.value_per_point"
            class="full-width"
            :min="0"
            :precision="4"
            :step="0.001"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="机构" prop="institution">
          <el-input v-model.trim="programForm.institution" placeholder="可选" />
        </el-form-item>
        <el-form-item label="账号" prop="account_number">
          <el-input v-model.trim="programForm.account_number" placeholder="可选" />
        </el-form-item>
        <el-form-item label="登录地址" prop="login_url">
          <el-input v-model.trim="programForm.login_url" placeholder="可选" />
        </el-form-item>
        <el-form-item label="状态" prop="is_active">
          <el-switch
            v-model="programForm.is_active"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="停用"
          />
        </el-form-item>
        <el-form-item label="备注" prop="note">
          <el-input
            v-model.trim="programForm.note"
            type="textarea"
            :rows="3"
            placeholder="可选"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="programDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="programSubmitting"
          @click="handleSubmitProgram"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="transactionDialogVisible"
      :title="editingTransactionId === null ? '新增积分流水' : '编辑积分流水'"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="transactionFormRef"
        :model="transactionForm"
        :rules="transactionRules"
        label-width="116px"
        status-icon
      >
        <el-form-item label="积分账户" prop="program_id">
          <el-select
            v-model="transactionForm.program_id"
            class="full-width"
            placeholder="请选择积分账户"
          >
            <el-option
              v-for="program in activePrograms"
              :key="program.id"
              :label="program.name"
              :value="program.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="日期" prop="date">
          <el-date-picker
            v-model="transactionForm.date"
            type="date"
            value-format="YYYY-MM-DD"
            class="full-width"
            placeholder="请选择日期"
          />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="transactionForm.type" class="full-width">
            <el-option
              v-for="option in transactionTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="点数" prop="points">
          <el-input-number
            v-model="transactionForm.points"
            class="full-width"
            :min="0"
            :precision="2"
            :step="100"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="现金价值" prop="related_cash_value">
          <el-input-number
            v-model="transactionForm.related_cash_value"
            class="full-width"
            :min="0"
            :precision="2"
            :step="10"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="过期日期" prop="expire_date">
          <el-date-picker
            v-model="transactionForm.expire_date"
            type="date"
            value-format="YYYY-MM-DD"
            class="full-width"
            placeholder="可选"
          />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model.trim="transactionForm.description"
            type="textarea"
            :rows="3"
            placeholder="可选"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="transactionDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="transactionSubmitting"
          @click="handleSubmitTransaction"
        >
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
  createPointProgram,
  createPointTransaction,
  deletePointProgram,
  deletePointTransaction,
  listPointPrograms,
  listPointTransactions,
  setPointProgramActive,
  updatePointProgram,
  updatePointTransaction
} from "../services/pointService";
import type {
  PointProgram,
  PointProgramInput,
  PointProgramType,
  PointTransaction,
  PointTransactionInput,
  PointTransactionType
} from "../types/points";

const PROGRAM_DELETE_BLOCKED_MESSAGE =
  "该积分账户已有流水记录，请停用账户而不是删除。";

const programTypeOptions: Array<{ label: string; value: PointProgramType }> = [
  { label: "Airline", value: "airline" },
  { label: "Hotel", value: "hotel" },
  { label: "Credit Card", value: "credit_card" },
  { label: "Cashback", value: "cashback" },
  { label: "Membership", value: "membership" },
  { label: "Coupon", value: "coupon" },
  { label: "Other", value: "other" }
];

const transactionTypeOptions: Array<{
  label: string;
  value: PointTransactionType;
}> = [
  { label: "Earn", value: "earn" },
  { label: "Redeem", value: "redeem" },
  { label: "Expire", value: "expire" },
  { label: "Adjustment", value: "adjustment" }
];

const programs = ref<PointProgram[]>([]);
const transactions = ref<PointTransaction[]>([]);
const loading = ref(false);
const transactionProgramFilter = ref<number | "">("");

const programDialogVisible = ref(false);
const programSubmitting = ref(false);
const editingProgramId = ref<number | null>(null);
const programFormRef = ref<FormInstance>();

const transactionDialogVisible = ref(false);
const transactionSubmitting = ref(false);
const editingTransactionId = ref<number | null>(null);
const transactionFormRef = ref<FormInstance>();

const programForm = reactive<PointProgramInput>({
  name: "",
  type: "airline",
  balance: 0,
  tier: "",
  expire_date: null,
  value_per_point: 0,
  institution: "",
  account_number: "",
  login_url: "",
  is_active: 1,
  note: ""
});

const transactionForm = reactive<PointTransactionInput>({
  program_id: 0,
  date: getToday(),
  type: "earn",
  points: 0,
  description: "",
  related_cash_value: null,
  expire_date: null
});

const activePrograms = computed(() =>
  programs.value.filter((program) => program.is_active === 1 && program.id)
);

const filteredTransactions = computed(() => {
  if (!transactionProgramFilter.value) {
    return transactions.value;
  }

  return transactions.value.filter(
    (transaction) => transaction.program_id === transactionProgramFilter.value
  );
});

const expiringPrograms = computed(() => {
  const today = startOfDay(new Date());
  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + 90);

  return programs.value
    .filter((program) => {
      if (!program.expire_date) {
        return false;
      }

      const expireDate = startOfDay(new Date(program.expire_date));
      return expireDate >= today && expireDate <= threshold;
    })
    .sort((a, b) => String(a.expire_date).localeCompare(String(b.expire_date)));
});

const programRules: FormRules<PointProgramInput> = {
  name: [{ required: true, message: "请输入积分账户名称", trigger: "blur" }],
  type: [{ required: true, message: "请选择积分账户类型", trigger: "change" }],
  balance: [
    {
      validator: (_rule, value, callback) => {
        if (!Number.isFinite(Number(value)) || Number(value) < 0) {
          callback(new Error("余额不能小于 0"));
          return;
        }

        callback();
      },
      trigger: "change"
    }
  ]
};

const transactionRules: FormRules<PointTransactionInput> = {
  program_id: [
    {
      required: true,
      type: "number",
      min: 1,
      message: "请选择积分账户",
      trigger: "change"
    }
  ],
  date: [{ required: true, message: "请选择日期", trigger: "change" }],
  type: [{ required: true, message: "请选择流水类型", trigger: "change" }],
  points: [
    {
      validator: (_rule, value, callback) => {
        if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
          callback(new Error("点数必须大于 0"));
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
    const [programRows, transactionRows] = await Promise.all([
      listPointPrograms(),
      listPointTransactions()
    ]);

    programs.value = programRows;
    transactions.value = transactionRows;
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

function openProgramCreateDialog(): void {
  editingProgramId.value = null;
  resetProgramForm();
  programDialogVisible.value = true;
}

function openProgramEditDialog(program: PointProgram): void {
  if (program.id === undefined) {
    ElMessage.error("积分账户 ID 缺失，无法编辑");
    return;
  }

  editingProgramId.value = program.id;
  programForm.name = program.name;
  programForm.type = program.type;
  programForm.balance = Number(program.balance);
  programForm.tier = program.tier ?? "";
  programForm.expire_date = program.expire_date ?? null;
  programForm.value_per_point = Number(program.value_per_point ?? 0);
  programForm.institution = program.institution ?? "";
  programForm.account_number = program.account_number ?? "";
  programForm.login_url = program.login_url ?? "";
  programForm.is_active = program.is_active;
  programForm.note = program.note ?? "";
  programDialogVisible.value = true;
}

async function handleSubmitProgram(): Promise<void> {
  if (!programFormRef.value) {
    return;
  }

  const valid = await programFormRef.value.validate().catch(() => false);
  if (!valid) {
    return;
  }

  programSubmitting.value = true;

  try {
    const input = normalizeProgramInput();

    if (editingProgramId.value === null) {
      await createPointProgram(input);
      ElMessage.success("积分账户已新增");
    } else {
      await updatePointProgram(editingProgramId.value, input);
      ElMessage.success("积分账户已更新");
    }

    programDialogVisible.value = false;
    await loadPageData();
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    programSubmitting.value = false;
  }
}

async function handleToggleProgramActive(program: PointProgram): Promise<void> {
  if (program.id === undefined) {
    ElMessage.error("积分账户 ID 缺失，无法更新状态");
    return;
  }

  const nextActive = program.is_active !== 1;

  try {
    await setPointProgramActive(program.id, nextActive);
    ElMessage.success(nextActive ? "积分账户已启用" : "积分账户已停用");
    await loadPageData();
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  }
}

async function handleDeleteProgram(program: PointProgram): Promise<void> {
  if (program.id === undefined) {
    ElMessage.error("积分账户 ID 缺失，无法删除");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确认删除积分账户「${program.name}」？此操作不可恢复。`,
      "删除积分账户",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
        confirmButtonClass: "el-button--danger"
      }
    );

    await deletePointProgram(program.id);
    ElMessage.success("积分账户已删除");
    await loadPageData();
  } catch (error) {
    if (error === "cancel" || error === "close") {
      return;
    }

    const message = getErrorMessage(error);
    if (message === PROGRAM_DELETE_BLOCKED_MESSAGE) {
      ElMessage.warning(message);
      return;
    }

    ElMessage.error(message);
  }
}

function showProgramTransactions(program: PointProgram): void {
  transactionProgramFilter.value = program.id ?? "";
}

function openTransactionCreateDialog(): void {
  editingTransactionId.value = null;
  resetTransactionForm();
  transactionDialogVisible.value = true;
}

function openTransactionEditDialog(transaction: PointTransaction): void {
  if (transaction.id === undefined) {
    ElMessage.error("积分流水 ID 缺失，无法编辑");
    return;
  }

  editingTransactionId.value = transaction.id;
  transactionForm.program_id = transaction.program_id;
  transactionForm.date = transaction.date;
  transactionForm.type = transaction.type;
  transactionForm.points = Number(transaction.points);
  transactionForm.description = transaction.description ?? "";
  transactionForm.related_cash_value =
    transaction.related_cash_value == null
      ? null
      : Number(transaction.related_cash_value);
  transactionForm.expire_date = transaction.expire_date ?? null;
  transactionDialogVisible.value = true;
}

async function handleSubmitTransaction(): Promise<void> {
  if (!transactionFormRef.value) {
    return;
  }

  const valid = await transactionFormRef.value.validate().catch(() => false);
  if (!valid) {
    return;
  }

  transactionSubmitting.value = true;

  try {
    const input = normalizeTransactionInput();

    if (editingTransactionId.value === null) {
      await createPointTransaction(input);
      ElMessage.success("积分流水已新增");
    } else {
      await updatePointTransaction(editingTransactionId.value, input);
      ElMessage.success("积分流水已更新");
    }

    transactionDialogVisible.value = false;
    await loadPageData();
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    transactionSubmitting.value = false;
  }
}

async function handleDeleteTransaction(
  transaction: PointTransaction
): Promise<void> {
  if (transaction.id === undefined) {
    ElMessage.error("积分流水 ID 缺失，无法删除");
    return;
  }

  try {
    await ElMessageBox.confirm(
      "确认删除这笔积分流水？此操作会回退积分余额。",
      "删除积分流水",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
        confirmButtonClass: "el-button--danger"
      }
    );

    await deletePointTransaction(transaction.id);
    ElMessage.success("积分流水已删除");
    await loadPageData();
  } catch (error) {
    if (error === "cancel" || error === "close") {
      return;
    }

    ElMessage.error(getErrorMessage(error));
  }
}

function resetProgramForm(): void {
  programForm.name = "";
  programForm.type = "airline";
  programForm.balance = 0;
  programForm.tier = "";
  programForm.expire_date = null;
  programForm.value_per_point = 0;
  programForm.institution = "";
  programForm.account_number = "";
  programForm.login_url = "";
  programForm.is_active = 1;
  programForm.note = "";
  programFormRef.value?.clearValidate();
}

function resetTransactionForm(): void {
  transactionForm.program_id = activePrograms.value[0]?.id ?? 0;
  transactionForm.date = getToday();
  transactionForm.type = "earn";
  transactionForm.points = 0;
  transactionForm.description = "";
  transactionForm.related_cash_value = null;
  transactionForm.expire_date = null;
  transactionFormRef.value?.clearValidate();
}

function normalizeProgramInput(): PointProgramInput {
  return {
    name: programForm.name.trim(),
    type: programForm.type,
    balance: Number(programForm.balance),
    tier: programForm.tier?.trim() || null,
    expire_date: programForm.expire_date || null,
    value_per_point: Number(programForm.value_per_point ?? 0),
    institution: programForm.institution?.trim() || null,
    account_number: programForm.account_number?.trim() || null,
    login_url: programForm.login_url?.trim() || null,
    is_active: programForm.is_active,
    note: programForm.note?.trim() || null
  };
}

function normalizeTransactionInput(): PointTransactionInput {
  return {
    program_id: Number(transactionForm.program_id),
    date: transactionForm.date,
    type: transactionForm.type,
    points: Number(transactionForm.points),
    description: transactionForm.description?.trim() || null,
    related_cash_value:
      transactionForm.related_cash_value == null
        ? null
        : Number(transactionForm.related_cash_value),
    expire_date: transactionForm.expire_date || null
  };
}

function formatProgramType(type: PointProgramType): string {
  return programTypeOptions.find((option) => option.value === type)?.label ?? type;
}

function formatTransactionType(type: PointTransactionType): string {
  return (
    transactionTypeOptions.find((option) => option.value === type)?.label ?? type
  );
}

function formatPoints(value: number): string {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatMoney(value: number): string {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  });
}

function formatDisplayPoints(transaction: PointTransaction): string {
  const value = formatPoints(transaction.points);
  if (transaction.type === "redeem" || transaction.type === "expire") {
    return `-${value}`;
  }

  return value;
}

function getPointAmountClass(type: PointTransactionType): string {
  if (type === "redeem" || type === "expire") {
    return "amount-negative";
  }

  return "amount-positive";
}

function getTransactionTagType(
  type: PointTransactionType
): "success" | "warning" | "info" | "primary" {
  if (type === "earn") {
    return "success";
  }

  if (type === "redeem" || type === "expire") {
    return "warning";
  }

  if (type === "adjustment") {
    return "info";
  }

  return "primary";
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
</script>

<style scoped>
.points-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.points-toolbar,
.section-panel {
  padding: 24px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.points-toolbar,
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
}

.section-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
  color: #111827;
}

.points-table {
  width: 100%;
}

.program-filter {
  width: 240px;
}

.expiry-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-top: 8px;
}

.expiry-item {
  color: #92400e;
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
