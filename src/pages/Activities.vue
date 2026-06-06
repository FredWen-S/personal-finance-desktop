<template>
  <section class="activities-page">
    <div class="activities-toolbar">
      <div>
        <h1 class="page-title">活动 / 优惠管理</h1>
        <p class="page-description">Track deals, offers, promotions, and eligibility.</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">新增活动</el-button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <span>总活动数</span>
        <strong>{{ activities.length }}</strong>
      </div>
      <div class="stat-card">
        <span>可参加活动数</span>
        <strong>{{ eligibleCount }}</strong>
      </div>
      <div class="stat-card">
        <span>未来 30 天截止</span>
        <strong>{{ upcomingActivities.length }}</strong>
      </div>
      <div class="stat-card">
        <span>预估净收益</span>
        <strong>{{ formatMoney(estimatedNetValue) }}</strong>
      </div>
    </div>

    <section class="section-panel">
      <div class="section-header">
        <h2>即将截止</h2>
      </div>

      <el-empty
        v-if="upcomingActivities.length === 0"
        description="未来 30 天内暂无截止活动"
      />

      <el-table
        v-else
        :data="upcomingActivities"
        border
        class="activities-table"
      >
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column prop="platform" label="平台" min-width="120" />
        <el-table-column label="分类" width="140">
          <template #default="{ row }: { row: Activity }">
            {{ formatCategory(row.category) }}
          </template>
        </el-table-column>
        <el-table-column prop="end_date" label="截止日期" width="120" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }: { row: Activity }">
            <el-tag :type="getStatusTagType(row.status)" effect="light">
              {{ formatStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="预计收益" width="120" align="right">
          <template #default="{ row }: { row: Activity }">
            {{ formatMoney(row.estimated_value) }}
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="section-panel">
      <div class="section-header">
        <h2>活动列表</h2>
      </div>

      <div class="filter-bar">
        <el-select
          v-model="filters.status"
          clearable
          placeholder="按状态筛选"
          class="filter-control"
        >
          <el-option
            v-for="option in statusOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-select
          v-model="filters.category"
          clearable
          placeholder="按分类筛选"
          class="filter-control"
        >
          <el-option
            v-for="option in categoryOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-select
          v-model="filters.priority"
          clearable
          placeholder="按优先级筛选"
          class="filter-control"
        >
          <el-option
            v-for="option in priorityOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-input
          v-model.trim="filters.keyword"
          clearable
          placeholder="搜索标题 / 平台 / 标签"
          class="keyword-input"
        />
      </div>

      <el-table
        v-loading="loading"
        :data="filteredActivities"
        border
        class="activities-table"
        empty-text="暂无活动"
      >
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column prop="platform" label="平台" min-width="120" />
        <el-table-column label="分类" width="140">
          <template #default="{ row }: { row: Activity }">
            {{ formatCategory(row.category) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }: { row: Activity }">
            <el-tag :type="getStatusTagType(row.status)" effect="light">
              {{ formatStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="100">
          <template #default="{ row }: { row: Activity }">
            <el-tag :type="getPriorityTagType(row.priority ?? 'medium')" effect="plain">
              {{ formatPriority(row.priority ?? "medium") }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="start_date" label="开始日期" width="120" />
        <el-table-column prop="end_date" label="截止日期" width="120" />
        <el-table-column label="预计成本" width="120" align="right">
          <template #default="{ row }: { row: Activity }">
            {{ formatMoney(row.estimated_cost) }}
          </template>
        </el-table-column>
        <el-table-column label="预计收益" width="120" align="right">
          <template #default="{ row }: { row: Activity }">
            {{ formatMoney(row.estimated_value) }}
          </template>
        </el-table-column>
        <el-table-column label="预估净收益" width="130" align="right">
          <template #default="{ row }: { row: Activity }">
            {{ formatMoney(row.estimated_value - row.estimated_cost) }}
          </template>
        </el-table-column>
        <el-table-column prop="tags" label="标签" min-width="140" show-overflow-tooltip />
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }: { row: Activity }">
            <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="success" @click="handleQuickStatus(row, 'joined')">
              已参加
            </el-button>
            <el-button link type="success" @click="handleQuickStatus(row, 'completed')">
              已完成
            </el-button>
            <el-button link type="warning" @click="handleQuickStatus(row, 'skipped')">
              跳过
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog
      v-model="dialogVisible"
      :title="editingActivityId === null ? '新增活动' : '编辑活动'"
      width="680px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="116px"
        status-icon
      >
        <el-form-item label="标题" prop="title">
          <el-input v-model.trim="form.title" placeholder="例如 Chase Offer" />
        </el-form-item>
        <el-form-item label="平台" prop="platform">
          <el-input v-model.trim="form.platform" placeholder="可选" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" class="full-width">
            <el-option
              v-for="option in categoryOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期" prop="start_date">
          <el-date-picker
            v-model="form.start_date"
            type="date"
            value-format="YYYY-MM-DD"
            class="full-width"
            placeholder="可选"
          />
        </el-form-item>
        <el-form-item label="截止日期" prop="end_date">
          <el-date-picker
            v-model="form.end_date"
            type="date"
            value-format="YYYY-MM-DD"
            class="full-width"
            placeholder="可选"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" class="full-width">
            <el-option
              v-for="option in statusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="参与要求" prop="requirement">
          <el-input
            v-model.trim="form.requirement"
            type="textarea"
            :rows="3"
            placeholder="可选"
          />
        </el-form-item>
        <el-form-item label="预计成本" prop="estimated_cost">
          <el-input-number
            v-model="form.estimated_cost"
            class="full-width"
            :min="0"
            :precision="2"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="预计收益" prop="estimated_value">
          <el-input-number
            v-model="form.estimated_value"
            class="full-width"
            :min="0"
            :precision="2"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="实际成本" prop="actual_cost">
          <el-input-number
            v-model="form.actual_cost"
            class="full-width"
            :min="0"
            :precision="2"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="实际收益" prop="actual_value">
          <el-input-number
            v-model="form.actual_value"
            class="full-width"
            :min="0"
            :precision="2"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="链接" prop="url">
          <el-input v-model.trim="form.url" placeholder="可选" />
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-select v-model="form.priority" class="full-width">
            <el-option
              v-for="option in priorityOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="标签" prop="tags">
          <el-input v-model.trim="form.tags" placeholder="逗号分隔，例如 card,grocery" />
        </el-form-item>
        <el-form-item label="备注" prop="note">
          <el-input
            v-model.trim="form.note"
            type="textarea"
            :rows="3"
            placeholder="可选"
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
  createActivity,
  deleteActivity,
  listActivities,
  listUpcomingActivities,
  updateActivity
} from "../services/activityService";
import type {
  Activity,
  ActivityCategory,
  ActivityInput,
  ActivityPriority,
  ActivityStatus
} from "../types/activity";

const statusOptions: Array<{ label: string; value: ActivityStatus }> = [
  { label: "Watching", value: "watching" },
  { label: "Eligible", value: "eligible" },
  { label: "Joined", value: "joined" },
  { label: "Completed", value: "completed" },
  { label: "Skipped", value: "skipped" },
  { label: "Expired", value: "expired" }
];

const categoryOptions: Array<{ label: string; value: ActivityCategory }> = [
  { label: "Credit Card", value: "credit_card" },
  { label: "Hotel", value: "hotel" },
  { label: "Airline", value: "airline" },
  { label: "Shopping", value: "shopping" },
  { label: "Student Discount", value: "student_discount" },
  { label: "Campus", value: "campus" },
  { label: "Telecom", value: "telecom" },
  { label: "Subscription", value: "subscription" },
  { label: "Membership Match", value: "membership_match" },
  { label: "Cashback", value: "cashback" },
  { label: "Points Purchase", value: "points_purchase" },
  { label: "Other", value: "other" }
];

const priorityOptions: Array<{ label: string; value: ActivityPriority }> = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" }
];

const activities = ref<Activity[]>([]);
const upcomingActivities = ref<Activity[]>([]);
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const editingActivityId = ref<number | null>(null);
const formRef = ref<FormInstance>();

const filters = reactive<{
  status: ActivityStatus | "";
  category: ActivityCategory | "";
  priority: ActivityPriority | "";
  keyword: string;
}>({
  status: "",
  category: "",
  priority: "",
  keyword: ""
});

const form = reactive<ActivityInput>({
  title: "",
  platform: "",
  category: "credit_card",
  start_date: null,
  end_date: null,
  status: "watching",
  requirement: "",
  estimated_cost: 0,
  estimated_value: 0,
  actual_cost: 0,
  actual_value: 0,
  url: "",
  priority: "medium",
  tags: "",
  note: ""
});

const eligibleCount = computed(
  () => activities.value.filter((activity) => activity.status === "eligible").length
);

const estimatedNetValue = computed(() =>
  activities.value.reduce(
    (sum, activity) =>
      sum + Number(activity.estimated_value) - Number(activity.estimated_cost),
    0
  )
);

const filteredActivities = computed(() =>
  activities.value.filter((activity) => {
    const matchesStatus = !filters.status || activity.status === filters.status;
    const matchesCategory =
      !filters.category || activity.category === filters.category;
    const matchesPriority =
      !filters.priority || (activity.priority ?? "medium") === filters.priority;
    const keyword = filters.keyword.toLowerCase();
    const searchable = `${activity.title} ${activity.platform ?? ""} ${
      activity.tags ?? ""
    }`.toLowerCase();
    const matchesKeyword = !keyword || searchable.includes(keyword);

    return (
      matchesStatus && matchesCategory && matchesPriority && matchesKeyword
    );
  })
);

const nonNegativeNumberRule = {
  validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
    if (!Number.isFinite(Number(value)) || Number(value) < 0) {
      callback(new Error("金额不能为负数"));
      return;
    }

    callback();
  },
  trigger: "change"
};

const formRules: FormRules<ActivityInput> = {
  title: [{ required: true, message: "请输入活动标题", trigger: "blur" }],
  category: [{ required: true, message: "请选择分类", trigger: "change" }],
  status: [{ required: true, message: "请选择状态", trigger: "change" }],
  priority: [{ required: true, message: "请选择优先级", trigger: "change" }],
  end_date: [
    {
      validator: (_rule, value, callback) => {
        if (form.start_date && value && String(value) < form.start_date) {
          callback(new Error("截止日期不能早于开始日期"));
          return;
        }

        callback();
      },
      trigger: "change"
    }
  ],
  estimated_cost: [nonNegativeNumberRule],
  estimated_value: [nonNegativeNumberRule],
  actual_cost: [nonNegativeNumberRule],
  actual_value: [nonNegativeNumberRule]
};

onMounted(() => {
  void loadPageData();
});

async function loadPageData(): Promise<void> {
  loading.value = true;

  try {
    const [activityRows, upcomingRows] = await Promise.all([
      listActivities(),
      listUpcomingActivities(30)
    ]);

    activities.value = activityRows;
    upcomingActivities.value = upcomingRows;
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

function openCreateDialog(): void {
  editingActivityId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function openEditDialog(activity: Activity): void {
  if (activity.id === undefined) {
    ElMessage.error("活动 ID 缺失，无法编辑");
    return;
  }

  editingActivityId.value = activity.id;
  form.title = activity.title;
  form.platform = activity.platform ?? "";
  form.category = activity.category;
  form.start_date = activity.start_date ?? null;
  form.end_date = activity.end_date ?? null;
  form.status = activity.status;
  form.requirement = activity.requirement ?? "";
  form.estimated_cost = Number(activity.estimated_cost);
  form.estimated_value = Number(activity.estimated_value);
  form.actual_cost = Number(activity.actual_cost ?? 0);
  form.actual_value = Number(activity.actual_value ?? 0);
  form.url = activity.url ?? "";
  form.priority = activity.priority ?? "medium";
  form.tags = activity.tags ?? "";
  form.note = activity.note ?? "";
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

    if (editingActivityId.value === null) {
      await createActivity(input);
      ElMessage.success("活动已新增");
    } else {
      await updateActivity(editingActivityId.value, input);
      ElMessage.success("活动已更新");
    }

    dialogVisible.value = false;
    await loadPageData();
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    submitting.value = false;
  }
}

async function handleQuickStatus(
  activity: Activity,
  status: ActivityStatus
): Promise<void> {
  if (activity.id === undefined) {
    ElMessage.error("活动 ID 缺失，无法更新状态");
    return;
  }

  try {
    await updateActivity(activity.id, {
      ...activity,
      platform: activity.platform ?? null,
      start_date: activity.start_date ?? null,
      end_date: activity.end_date ?? null,
      requirement: activity.requirement ?? null,
      actual_cost: activity.actual_cost ?? 0,
      actual_value: activity.actual_value ?? 0,
      url: activity.url ?? null,
      priority: activity.priority ?? "medium",
      tags: activity.tags ?? null,
      note: activity.note ?? null,
      status
    });
    ElMessage.success("活动状态已更新");
    await loadPageData();
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  }
}

async function handleDelete(activity: Activity): Promise<void> {
  if (activity.id === undefined) {
    ElMessage.error("活动 ID 缺失，无法删除");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确认删除活动「${activity.title}」？此操作不可恢复。`,
      "删除活动",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
        confirmButtonClass: "el-button--danger"
      }
    );

    await deleteActivity(activity.id);
    ElMessage.success("活动已删除");
    await loadPageData();
  } catch (error) {
    if (error === "cancel" || error === "close") {
      return;
    }

    ElMessage.error(getErrorMessage(error));
  }
}

function resetForm(): void {
  form.title = "";
  form.platform = "";
  form.category = "credit_card";
  form.start_date = null;
  form.end_date = null;
  form.status = "watching";
  form.requirement = "";
  form.estimated_cost = 0;
  form.estimated_value = 0;
  form.actual_cost = 0;
  form.actual_value = 0;
  form.url = "";
  form.priority = "medium";
  form.tags = "";
  form.note = "";
  formRef.value?.clearValidate();
}

function normalizeFormInput(): ActivityInput {
  return {
    title: form.title.trim(),
    platform: form.platform?.trim() || null,
    category: form.category,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    status: form.status,
    requirement: form.requirement?.trim() || null,
    estimated_cost: Number(form.estimated_cost),
    estimated_value: Number(form.estimated_value),
    actual_cost: Number(form.actual_cost ?? 0),
    actual_value: Number(form.actual_value ?? 0),
    url: form.url?.trim() || null,
    priority: form.priority ?? "medium",
    tags: form.tags?.trim() || null,
    note: form.note?.trim() || null
  };
}

function formatStatus(status: ActivityStatus): string {
  return statusOptions.find((option) => option.value === status)?.label ?? status;
}

function formatCategory(category: ActivityCategory): string {
  return (
    categoryOptions.find((option) => option.value === category)?.label ?? category
  );
}

function formatPriority(priority: ActivityPriority): string {
  return (
    priorityOptions.find((option) => option.value === priority)?.label ?? priority
  );
}

function formatMoney(value: number): string {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getStatusTagType(
  status: ActivityStatus
): "success" | "warning" | "info" | "primary" | "danger" {
  if (status === "completed") {
    return "success";
  }

  if (status === "eligible" || status === "joined") {
    return "primary";
  }

  if (status === "skipped" || status === "expired") {
    return "info";
  }

  return "warning";
}

function getPriorityTagType(
  priority: ActivityPriority
): "success" | "warning" | "danger" {
  if (priority === "high") {
    return "danger";
  }

  if (priority === "medium") {
    return "warning";
  }

  return "success";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
</script>

<style scoped>
.activities-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.activities-toolbar,
.section-panel {
  padding: 24px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.activities-toolbar,
.section-header,
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.stat-card span {
  color: #6b7280;
  font-size: 13px;
}

.stat-card strong {
  color: #111827;
  font-size: 24px;
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

.filter-bar {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.filter-control {
  width: 190px;
}

.keyword-input {
  width: 280px;
}

.activities-table {
  width: 100%;
}

.full-width {
  width: 100%;
}
</style>
