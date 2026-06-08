<template>
  <section v-loading="loading" class="dashboard-page">
    <div class="dashboard-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-description">个人财务与权益总览</p>
      </div>

      <div class="header-actions">
        <el-tag size="large" effect="plain">{{ currentMonth }}</el-tag>
        <el-button type="primary" :loading="loading" @click="loadDashboard">
          刷新
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="loadError"
      :title="loadError"
      type="error"
      show-icon
      :closable="false"
    />

    <div class="summary-grid finance-grid">
      <el-card v-for="card in financeCards" :key="card.label" shadow="never">
        <el-statistic :title="card.label" :value="card.value" :precision="2" />
      </el-card>
    </div>

    <el-alert
      v-if="dashboardData?.accountSummary.liabilityNote"
      :title="dashboardData.accountSummary.liabilityNote"
      type="info"
      show-icon
      :closable="false"
    />

    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="section-header">
          <span>信用卡概览</span>
          <el-tag effect="plain">{{ creditCardOverview.length }} 张</el-tag>
        </div>
      </template>

      <el-empty v-if="creditCardOverview.length === 0" description="暂无启用信用卡账户" />
      <el-table v-else :data="creditCardOverview" stripe>
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column prop="currency" label="币种" width="90" />
        <el-table-column label="当前欠款" width="130" align="right">
          <template #default="{ row }">
            {{ formatMoney(row.current_debt) }}
          </template>
        </el-table-column>
        <el-table-column label="信用额度" width="130" align="right">
          <template #default="{ row }">
            {{ formatMoney(row.credit_limit) }}
          </template>
        </el-table-column>
        <el-table-column label="可用额度" width="130" align="right">
          <template #default="{ row }">
            {{ formatMoney(row.available_credit) }}
          </template>
        </el-table-column>
        <el-table-column label="账单日" width="100">
          <template #default="{ row }">
            {{ row.statement_day || "-" }}
          </template>
        </el-table-column>
        <el-table-column label="还款日" width="100">
          <template #default="{ row }">
            {{ row.due_day || "-" }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <div class="summary-grid benefit-grid">
      <el-card shadow="never">
        <el-statistic
          title="积分账户数"
          :value="dashboardData?.pointSummary.totalPointPrograms ?? 0"
        />
      </el-card>
      <el-card shadow="never">
        <el-statistic
          title="积分估算价值"
          :value="dashboardData?.pointSummary.totalPointEstimatedValue ?? 0"
          :precision="2"
        />
      </el-card>
      <el-card shadow="never">
        <el-statistic
          title="可参加活动数"
          :value="dashboardData?.activitySummary.eligibleActivities ?? 0"
        />
      </el-card>
      <el-card shadow="never">
        <el-statistic
          title="未来 30 天截止活动数"
          :value="dashboardData?.activitySummary.upcomingActivities.length ?? 0"
        />
      </el-card>
      <el-card shadow="never">
        <el-statistic
          title="活动预估净收益"
          :value="dashboardData?.activitySummary.estimatedNetValue ?? 0"
          :precision="2"
        />
      </el-card>
    </div>

    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="section-header">
          <span>最近流水</span>
          <el-tag effect="plain">{{ recentTransactions.length }} 条</el-tag>
        </div>
      </template>

      <el-empty v-if="recentTransactions.length === 0" description="暂无流水" />
      <el-table v-else :data="recentTransactions" stripe>
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column label="类型" width="110">
          <template #default="{ row }">
            <el-tag :type="transactionTagType(row.type)" effect="plain">
              {{ transactionTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="account_name" label="账户" min-width="140">
          <template #default="{ row }">
            {{ row.account_name || "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="target_account_name" label="转入账户" min-width="140">
          <template #default="{ row }">
            {{ row.target_account_name || "-" }}
          </template>
        </el-table-column>
        <el-table-column label="金额" width="130" align="right">
          <template #default="{ row }">
            {{ formatMoney(row.amount) }}
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" min-width="120" />
        <el-table-column prop="merchant" label="商户" min-width="140">
          <template #default="{ row }">
            {{ row.merchant || "-" }}
          </template>
        </el-table-column>
        <el-table-column
          prop="description"
          label="描述"
          min-width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.description || "-" }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="section-header">
          <span>即将截止活动</span>
          <el-tag effect="plain">未来 30 天</el-tag>
        </div>
      </template>

      <el-empty v-if="upcomingActivities.length === 0" description="暂无即将截止活动" />
      <el-table v-else :data="upcomingActivities" stripe>
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column prop="platform" label="平台" min-width="120">
          <template #default="{ row }">
            {{ row.platform || "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" min-width="140" />
        <el-table-column prop="end_date" label="截止日期" width="120" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag effect="plain">{{ activityStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="预估净收益" width="130" align="right">
          <template #default="{ row }">
            {{ formatMoney(row.estimated_value - row.estimated_cost) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="section-header">
          <span>即将过期积分</span>
          <el-tag effect="plain">未来 90 天</el-tag>
        </div>
      </template>

      <el-empty
        v-if="expiringPointPrograms.length === 0"
        description="暂无即将过期积分"
      />
      <el-table v-else :data="expiringPointPrograms" stripe>
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column prop="type" label="类型" min-width="120" />
        <el-table-column label="余额" width="130" align="right">
          <template #default="{ row }">
            {{ formatPoints(row.balance) }}
          </template>
        </el-table-column>
        <el-table-column prop="tier" label="会员等级" min-width="120">
          <template #default="{ row }">
            {{ row.tier || "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="expire_date" label="过期日期" width="120" />
        <el-table-column label="估算价值" width="130" align="right">
          <template #default="{ row }">
            {{ formatMoney(row.balance * (row.value_per_point ?? 0)) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { getDashboardData } from "../services/dashboardService";
import type { DashboardData } from "../types/dashboard";
import type { ActivityStatus } from "../types/activity";
import type { TransactionType } from "../types/transaction";

const loading = ref(false);
const dashboardData = ref<DashboardData | null>(null);
const loadError = ref("");

const currentMonth = computed(
  () => dashboardData.value?.month ?? getCurrentMonth()
);

const financeCards = computed(() => [
  {
    label: "总资产",
    value: dashboardData.value?.accountSummary.totalAssets ?? 0
  },
  {
    label: "总负债",
    value: dashboardData.value?.accountSummary.totalLiabilities ?? 0
  },
  {
    label: "净资产",
    value: dashboardData.value?.accountSummary.netWorth ?? 0
  },
  {
    label: "本月收入",
    value: dashboardData.value?.monthlyTransactionSummary.monthlyIncome ?? 0
  },
  {
    label: "本月支出",
    value: dashboardData.value?.monthlyTransactionSummary.monthlyExpense ?? 0
  },
  {
    label: "本月净流入",
    value: dashboardData.value?.monthlyTransactionSummary.monthlyNet ?? 0
  }
].map((card) => ({
  ...card,
  label: withBaseCurrency(card.label)
})));

const recentTransactions = computed(
  () => dashboardData.value?.recentTransactions ?? []
);
const upcomingActivities = computed(
  () => dashboardData.value?.activitySummary.upcomingActivities ?? []
);
const expiringPointPrograms = computed(
  () => dashboardData.value?.pointSummary.expiringPointPrograms ?? []
);
const creditCardOverview = computed(
  () => dashboardData.value?.creditCardOverview ?? []
);

onMounted(() => {
  void loadDashboard();
});

async function loadDashboard(): Promise<void> {
  loading.value = true;

  try {
    loadError.value = "";
    dashboardData.value = await getDashboardData();
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : String(caughtError);
    loadError.value = message;
    ElMessage.error(message);
  } finally {
    loading.value = false;
  }
}

function withBaseCurrency(label: string): string {
  const baseCurrency =
    dashboardData.value?.accountSummary.baseCurrency ??
    dashboardData.value?.monthlyTransactionSummary.baseCurrency;

  return baseCurrency ? `${label} (${baseCurrency})` : label;
}

function formatMoney(value: number): string {
  return Number(value || 0).toFixed(2);
}

function formatPoints(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function transactionTypeLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    expense: "支出",
    income: "收入",
    adjustment: "调整",
    transfer: "转账"
  };

  return labels[type];
}

function transactionTagType(
  type: TransactionType
): "success" | "warning" | "info" | "primary" | "danger" {
  const types: Record<
    TransactionType,
    "success" | "warning" | "info" | "primary" | "danger"
  > = {
    income: "success",
    expense: "danger",
    transfer: "primary",
    adjustment: "info"
  };

  return types[type];
}

function activityStatusLabel(status: ActivityStatus): string {
  const labels: Record<ActivityStatus, string> = {
    watching: "关注中",
    eligible: "可参加",
    joined: "已参加",
    completed: "已完成",
    skipped: "已跳过",
    expired: "已过期"
  };

  return labels[status];
}

function getCurrentMonth(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dashboard-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-grid {
  display: grid;
  gap: 16px;
}

.finance-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.benefit-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.section-card {
  border-radius: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 650;
}

:deep(.el-card__body) {
  overflow-x: auto;
}

@media (max-width: 1200px) {
  .finance-grid,
  .benefit-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .dashboard-header,
  .header-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .finance-grid,
  .benefit-grid {
    grid-template-columns: 1fr;
  }
}
</style>
