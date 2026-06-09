<template>
  <section v-loading="loading" class="budgets-page">
    <div class="page-toolbar">
      <div>
        <h1 class="page-title">预算管理</h1>
        <p class="page-description">Monthly category budgets in the current base currency.</p>
      </div>

      <div class="toolbar-actions">
        <el-date-picker
          v-model="selectedMonth"
          type="month"
          value-format="YYYY-MM"
          format="YYYY-MM"
          :clearable="false"
          @change="loadPageData"
        />
        <el-tag effect="plain">Base: {{ baseCurrency }}</el-tag>
        <el-button :loading="loading" @click="loadPageData">刷新</el-button>
        <el-button type="primary" @click="openCreateDialog">新增预算</el-button>
      </div>
    </div>

    <el-alert
      v-if="loadError"
      :title="loadError"
      type="error"
      show-icon
      :closable="false"
    />

    <el-alert
      v-if="summary?.hasCurrencyMismatch"
      title="当前月份存在预算币种与当前基础币种不同的记录。第一版不会自动换算历史预算金额，请按需编辑预算。"
      type="warning"
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
          <span>预算使用列表</span>
          <el-tag effect="plain">{{ budgetUsages.length }} categories</el-tag>
        </div>
      </template>

      <el-empty v-if="budgetUsages.length === 0" description="暂无预算" />
      <el-table v-else :data="budgetUsages" stripe>
        <el-table-column prop="category" label="分类" min-width="140" />
        <el-table-column label="预算金额" width="130" align="right">
          <template #default="{ row }: { row: BudgetUsage }">
            {{ formatMoney(row.budget_amount) }}
          </template>
        </el-table-column>
        <el-table-column label="实际支出" width="130" align="right">
          <template #default="{ row }: { row: BudgetUsage }">
            {{ formatMoney(row.actual_amount) }}
          </template>
        </el-table-column>
        <el-table-column label="剩余额度" width="130" align="right">
          <template #default="{ row }: { row: BudgetUsage }">
            <span :class="{ negative: row.remaining_amount < 0 }">
              {{ formatMoney(row.remaining_amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="使用率" width="180">
          <template #default="{ row }: { row: BudgetUsage }">
            <el-progress
              :percentage="progressPercent(row.usage_percent)"
              :status="progressStatus(row.status)"
            />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }: { row: BudgetUsage }">
            <el-tag :type="statusTagType(row.status)" effect="plain">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }: { row: BudgetUsage }">
            <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="section-header">
          <span>未预算支出</span>
          <el-tag effect="plain">{{ unbudgetedCategories.length }} categories</el-tag>
        </div>
      </template>

      <el-empty
        v-if="unbudgetedCategories.length === 0"
        description="暂无未预算支出"
      />
      <el-table v-else :data="unbudgetedCategories" stripe>
        <el-table-column prop="category" label="分类" min-width="160" />
        <el-table-column label="实际支出" width="160" align="right">
          <template #default="{ row }">
            {{ formatMoney(row.actual_amount) }} {{ row.base_currency }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="editingBudgetId === null ? '新增预算' : '编辑预算'"
      width="560px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="118px"
        status-icon
      >
        <el-form-item label="月份" prop="month">
          <el-date-picker
            v-model="form.month"
            type="month"
            value-format="YYYY-MM"
            format="YYYY-MM"
            class="full-width"
            :clearable="false"
          />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" class="full-width">
            <el-option
              v-for="category in categoryOptions"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="预算金额" prop="amount">
          <el-input-number
            v-model="form.amount"
            class="full-width"
            :min="0"
            :precision="2"
          />
        </el-form-item>
        <el-form-item label="基础币种" prop="base_currency">
          <el-input v-model="form.base_currency" disabled />
        </el-form-item>
        <el-form-item label="备注" prop="note">
          <el-input v-model.trim="form.note" type="textarea" :rows="3" />
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
import { getBaseCurrency } from "../services/currencyService";
import {
  createBudget,
  deleteBudget,
  getBudget,
  getBudgetSummary,
  updateBudget
} from "../services/budgetService";
import type {
  BudgetInput,
  BudgetSummary,
  BudgetUsage,
  BudgetStatus
} from "../types/budget";

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
  "other"
];

const selectedMonth = ref(getCurrentMonth());
const baseCurrency = ref("CNY");
const summary = ref<BudgetSummary | null>(null);
const loading = ref(false);
const submitting = ref(false);
const loadError = ref("");
const dialogVisible = ref(false);
const editingBudgetId = ref<number | null>(null);
const formRef = ref<FormInstance>();

const form = reactive<BudgetInput>({
  month: selectedMonth.value,
  category: "food",
  amount: 0,
  base_currency: "CNY",
  note: ""
});

const formRules: FormRules<BudgetInput> = {
  month: [{ required: true, message: "请选择月份", trigger: "change" }],
  category: [{ required: true, message: "请选择分类", trigger: "change" }],
  amount: [
    {
      validator: (_rule, value, callback) => {
        if (!Number.isFinite(Number(value)) || Number(value) < 0) {
          callback(new Error("预算金额必须大于或等于 0"));
          return;
        }
        callback();
      },
      trigger: "change"
    }
  ]
};

const budgetUsages = computed(() => summary.value?.budgetUsages ?? []);
const unbudgetedCategories = computed(
  () => summary.value?.unbudgetedCategories ?? []
);

const statCards = computed(() => [
  {
    label: `本月总预算 (${baseCurrency.value})`,
    value: summary.value?.totalBudget ?? 0,
    precision: 2
  },
  {
    label: `本月实际支出 (${baseCurrency.value})`,
    value: summary.value?.actualSpending ?? 0,
    precision: 2
  },
  {
    label: `剩余额度 (${baseCurrency.value})`,
    value: summary.value?.remainingBudget ?? 0,
    precision: 2
  },
  {
    label: "预算使用率",
    value: summary.value?.usagePercent ?? 0,
    precision: 2
  },
  {
    label: "超预算分类数",
    value: summary.value?.exceededCategoryCount ?? 0,
    precision: 0
  },
  {
    label: `未预算支出 (${baseCurrency.value})`,
    value: summary.value?.unbudgetedSpending ?? 0,
    precision: 2
  }
]);

onMounted(() => {
  void loadPageData();
});

async function loadPageData(): Promise<void> {
  loading.value = true;

  try {
    loadError.value = "";
    const [nextBaseCurrency, nextSummary] = await Promise.all([
      getBaseCurrency(),
      getBudgetSummary(selectedMonth.value)
    ]);
    baseCurrency.value = nextBaseCurrency;
    summary.value = nextSummary;
  } catch (error) {
    const message = getErrorMessage(error);
    loadError.value = message;
    ElMessage.error(message);
  } finally {
    loading.value = false;
  }
}

function openCreateDialog(): void {
  editingBudgetId.value = null;
  Object.assign(form, {
    month: selectedMonth.value,
    category: "food",
    amount: 0,
    base_currency: baseCurrency.value,
    note: ""
  });
  formRef.value?.clearValidate();
  dialogVisible.value = true;
}

async function openEditDialog(usage: BudgetUsage): Promise<void> {
  const budget = await getBudget(usage.budget_id);

  if (!budget) {
    ElMessage.error("预算不存在");
    return;
  }

  editingBudgetId.value = usage.budget_id;
  Object.assign(form, {
    month: budget.month,
    category: budget.category,
    amount: Number(budget.amount),
    base_currency: budget.base_currency,
    note: budget.note ?? ""
  });
  formRef.value?.clearValidate();
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

    if (editingBudgetId.value === null) {
      await createBudget(input);
      ElMessage.success("预算已新增");
    } else {
      await updateBudget(editingBudgetId.value, input);
      ElMessage.success("预算已更新");
    }

    dialogVisible.value = false;
    selectedMonth.value = input.month;
    await loadPageData();
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(usage: BudgetUsage): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确认删除 ${usage.month} / ${usage.category} 预算？`,
      "删除预算",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
        confirmButtonClass: "el-button--danger"
      }
    );
    await deleteBudget(usage.budget_id);
    ElMessage.success("预算已删除");
    await loadPageData();
  } catch (error) {
    if (error === "cancel" || error === "close") {
      return;
    }

    ElMessage.error(getErrorMessage(error));
  }
}

function normalizeFormInput(): BudgetInput {
  return {
    month: form.month,
    category: form.category,
    amount: Number(form.amount),
    base_currency: form.base_currency,
    note: form.note?.trim() || null
  };
}

function statusLabel(status: BudgetStatus): string {
  const labels: Record<BudgetStatus, string> = {
    normal: "正常",
    warning: "接近预算",
    exceeded: "超预算"
  };

  return labels[status];
}

function statusTagType(
  status: BudgetStatus
): "success" | "warning" | "danger" {
  const types: Record<BudgetStatus, "success" | "warning" | "danger"> = {
    normal: "success",
    warning: "warning",
    exceeded: "danger"
  };

  return types[status];
}

function progressStatus(
  status: BudgetStatus
): "success" | "warning" | "exception" {
  if (status === "exceeded") {
    return "exception";
  }

  if (status === "warning") {
    return "warning";
  }

  return "success";
}

function progressPercent(value: number): number {
  return Math.min(100, Number(Number(value || 0).toFixed(2)));
}

function formatMoney(value: number): string {
  return Number(value || 0).toFixed(2);
}

function getCurrentMonth(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
</script>

<style scoped>
.budgets-page {
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

.toolbar-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.section-card {
  border-radius: 8px;
}

.full-width {
  width: 100%;
}

.negative {
  color: #dc2626;
}

:deep(.el-card__body) {
  overflow-x: auto;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .page-toolbar,
  .toolbar-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
