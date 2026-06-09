<template>
  <section v-loading="loading" class="reports-page">
    <div class="reports-header">
      <div>
        <h1 class="page-title">Reports</h1>
        <p class="page-description">消费、账户、积分和活动数据分析</p>
      </div>

      <div class="header-actions">
        <el-date-picker
          v-model="selectedMonth"
          type="month"
          value-format="YYYY-MM"
          format="YYYY-MM"
          placeholder="选择月份"
          :clearable="false"
          @change="handleMonthChange"
        />
        <el-button type="primary" :loading="loading" @click="loadReports">
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

    <div class="chart-grid">
      <el-card class="chart-card" shadow="never">
        <template #header>最近 6 个月现金流趋势</template>
        <div class="chart-currency">{{ reportData.baseCurrency }}</div>
        <div v-show="hasCashFlowData" ref="cashFlowChartRef" class="chart" />
        <el-empty v-if="!hasCashFlowData" description="暂无现金流数据" />
      </el-card>

      <el-card class="chart-card" shadow="never">
        <template #header>本月支出分类占比</template>
        <div class="chart-currency">{{ reportData.baseCurrency }}</div>
        <div v-show="reportData.expenseByCategory.length > 0" ref="expenseChartRef" class="chart" />
        <el-empty
          v-if="reportData.expenseByCategory.length === 0"
          description="暂无本月支出分类数据"
        />
      </el-card>

      <el-card class="chart-card" shadow="never">
        <template #header>账户余额分布</template>
        <div class="chart-currency">{{ reportData.baseCurrency }}</div>
        <div v-show="reportData.accountBalances.length > 0" ref="accountChartRef" class="chart" />
        <el-empty
          v-if="reportData.accountBalances.length === 0"
          description="暂无启用账户数据"
        />
      </el-card>

      <el-card class="chart-card" shadow="never">
        <template #header>积分估值排行</template>
        <div v-show="reportData.pointValues.length > 0" ref="pointChartRef" class="chart" />
        <el-empty
          v-if="reportData.pointValues.length === 0"
          description="暂无启用积分账户数据"
        />
      </el-card>

      <el-card class="chart-card" shadow="never">
        <template #header>活动状态分布</template>
        <div v-show="reportData.activityStatuses.length > 0" ref="activityStatusChartRef" class="chart" />
        <el-empty
          v-if="reportData.activityStatuses.length === 0"
          description="暂无活动状态数据"
        />
      </el-card>

      <el-card class="chart-card" shadow="never">
        <template #header>本月 Top 商户</template>
        <div class="chart-currency">{{ reportData.baseCurrency }}</div>
        <div v-show="reportData.topMerchants.length > 0" ref="merchantChartRef" class="chart" />
        <el-empty
          v-if="reportData.topMerchants.length === 0"
          description="暂无本月商户消费数据"
        />
      </el-card>

      <el-card class="chart-card" shadow="never">
        <template #header>预算 vs 实际支出</template>
        <div class="chart-currency">{{ reportData.baseCurrency }}</div>
        <div
          v-show="reportData.budgetVsActual.length > 0"
          ref="budgetChartRef"
          class="chart"
        />
        <el-empty
          v-if="reportData.budgetVsActual.length === 0"
          description="暂无预算数据"
        />
      </el-card>
    </div>

    <div class="table-grid">
      <el-card class="section-card" shadow="never">
        <template #header>
          <div class="section-header">
            <span>Subscription Spending Overview</span>
            <el-tag effect="plain">{{ reportData.baseCurrency }}</el-tag>
          </div>
        </template>

        <el-empty
          v-if="
            reportData.subscriptionCategories.length === 0 &&
            reportData.subscriptionCycles.length === 0
          "
          description="No subscription data"
        />
        <div v-else class="subscription-report-grid">
          <el-table :data="reportData.subscriptionCategories" stripe>
            <el-table-column prop="category" label="Category" min-width="130" />
            <el-table-column prop="count" label="Count" width="90" align="right" />
            <el-table-column label="Amount" width="130" align="right">
              <template #default="{ row }">
                {{ formatMoney(row.amount) }}
              </template>
            </el-table-column>
          </el-table>

          <el-table :data="reportData.subscriptionCycles" stripe>
            <el-table-column prop="billing_cycle" label="Billing cycle" min-width="130" />
            <el-table-column prop="count" label="Count" width="90" align="right" />
          </el-table>
        </div>
      </el-card>

      <el-card class="section-card" shadow="never">
        <template #header>
          <div class="section-header">
            <span>积分估值明细</span>
            <el-tag effect="plain">{{ reportData.pointValues.length }} 项</el-tag>
          </div>
        </template>

        <el-empty v-if="reportData.pointValues.length === 0" description="暂无积分估值明细" />
        <el-table v-else :data="reportData.pointValues" stripe>
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="type" label="类型" min-width="120" />
          <el-table-column label="余额" width="130" align="right">
            <template #default="{ row }">
              {{ formatPoints(row.balance) }}
            </template>
          </el-table-column>
          <el-table-column label="估值单价" width="120" align="right">
            <template #default="{ row }">
              {{ formatMoney(row.value_per_point ?? 0) }}
            </template>
          </el-table-column>
          <el-table-column label="估算价值" width="130" align="right">
            <template #default="{ row }">
              {{ formatMoney(row.estimated_value) }}
            </template>
          </el-table-column>
          <el-table-column prop="tier" label="等级" min-width="120">
            <template #default="{ row }">
              {{ row.tier || "-" }}
            </template>
          </el-table-column>
          <el-table-column prop="expire_date" label="过期日期" width="120">
            <template #default="{ row }">
              {{ row.expire_date || "-" }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card class="section-card" shadow="never">
        <template #header>
          <div class="section-header">
            <span>活动分类收益</span>
            <el-tag effect="plain">{{ reportData.activityCategories.length }} 类</el-tag>
          </div>
        </template>

        <el-empty
          v-if="reportData.activityCategories.length === 0"
          description="暂无活动分类收益"
        />
        <el-table v-else :data="reportData.activityCategories" stripe>
          <el-table-column prop="category" label="分类" min-width="160" />
          <el-table-column prop="count" label="数量" width="100" align="right" />
          <el-table-column label="预估净收益" width="140" align="right">
            <template #default="{ row }">
              {{ formatMoney(row.estimated_net_value) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import * as echarts from "echarts";
import { getReportData } from "../services/reportService";
import type { ReportData } from "../types/report";

type ChartInstance = echarts.ECharts;

const loading = ref(false);
const selectedMonth = ref(getCurrentMonth());
const loadError = ref("");
const reportData = reactive<ReportData>({
  month: selectedMonth.value,
  baseCurrency: "CNY",
  monthlyCashFlow: [],
  expenseByCategory: [],
  accountBalances: [],
  pointValues: [],
  activityStatuses: [],
  activityCategories: [],
  topMerchants: [],
  subscriptionCategories: [],
  subscriptionCycles: [],
  budgetVsActual: []
});

const cashFlowChartRef = ref<HTMLDivElement>();
const expenseChartRef = ref<HTMLDivElement>();
const accountChartRef = ref<HTMLDivElement>();
const pointChartRef = ref<HTMLDivElement>();
const activityStatusChartRef = ref<HTMLDivElement>();
const merchantChartRef = ref<HTMLDivElement>();
const budgetChartRef = ref<HTMLDivElement>();

let cashFlowChart: ChartInstance | null = null;
let expenseChart: ChartInstance | null = null;
let accountChart: ChartInstance | null = null;
let pointChart: ChartInstance | null = null;
let activityStatusChart: ChartInstance | null = null;
let merchantChart: ChartInstance | null = null;
let budgetChart: ChartInstance | null = null;

const hasCashFlowData = computed(() =>
  reportData.monthlyCashFlow.some(
    (item) => item.income !== 0 || item.expense !== 0 || item.net !== 0
  )
);

onMounted(() => {
  window.addEventListener("resize", resizeCharts);
  void loadReports();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeCharts);
  disposeCharts();
});

async function loadReports(): Promise<void> {
  loading.value = true;

  try {
    loadError.value = "";
    const data = await getReportData(selectedMonth.value);
    Object.assign(reportData, data);
    await nextTick();
    renderCharts();
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : String(caughtError);
    loadError.value = message;
    ElMessage.error(message);
  } finally {
    loading.value = false;
  }
}

function handleMonthChange(): void {
  void loadReports();
}

function renderCharts(): void {
  renderCashFlowChart();
  renderExpenseChart();
  renderAccountChart();
  renderPointChart();
  renderActivityStatusChart();
  renderMerchantChart();
  renderBudgetChart();
}

function renderCashFlowChart(): void {
  if (!cashFlowChartRef.value || !hasCashFlowData.value) {
    cashFlowChart?.clear();
    return;
  }

  cashFlowChart = ensureChart(cashFlowChart, cashFlowChartRef.value);
  cashFlowChart.setOption({
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 48, right: 24, top: 48, bottom: 36 },
    xAxis: {
      type: "category",
      data: reportData.monthlyCashFlow.map((item) => item.month)
    },
    yAxis: { type: "value" },
    series: [
      {
        name: "收入",
        type: "bar",
        data: reportData.monthlyCashFlow.map((item) => toFixedNumber(item.income))
      },
      {
        name: "支出",
        type: "bar",
        data: reportData.monthlyCashFlow.map((item) => toFixedNumber(item.expense))
      },
      {
        name: "净流入",
        type: "line",
        smooth: true,
        data: reportData.monthlyCashFlow.map((item) => toFixedNumber(item.net))
      }
    ]
  });
}

function renderExpenseChart(): void {
  if (!expenseChartRef.value || reportData.expenseByCategory.length === 0) {
    expenseChart?.clear();
    return;
  }

  expenseChart = ensureChart(expenseChart, expenseChartRef.value);
  expenseChart.setOption({
    tooltip: { trigger: "item" },
    legend: { bottom: 0, type: "scroll" },
    series: [
      {
        name: "支出分类",
        type: "pie",
        radius: ["38%", "68%"],
        center: ["50%", "45%"],
        data: reportData.expenseByCategory.map((item) => ({
          name: item.category,
          value: toFixedNumber(item.amount)
        }))
      }
    ]
  });
}

function renderAccountChart(): void {
  if (!accountChartRef.value || reportData.accountBalances.length === 0) {
    accountChart?.clear();
    return;
  }

  accountChart = ensureChart(accountChart, accountChartRef.value);
  accountChart.setOption({
    tooltip: { trigger: "axis" },
    grid: { left: 56, right: 24, top: 28, bottom: 64 },
    xAxis: {
      type: "category",
      axisLabel: { interval: 0, rotate: 30 },
      data: reportData.accountBalances.map((item) => item.account_name)
    },
    yAxis: { type: "value" },
    series: [
      {
        name: "余额",
        type: "bar",
        stack: "account-balance",
        data: reportData.accountBalances.map((item) =>
          toFixedNumber(item.asset_amount)
        )
      },
      {
        name: "信用卡/负债金额",
        type: "bar",
        stack: "account-balance",
        data: reportData.accountBalances.map((item) =>
          toFixedNumber(item.liability_amount)
        )
      }
    ]
  });
}

function renderPointChart(): void {
  if (!pointChartRef.value || reportData.pointValues.length === 0) {
    pointChart?.clear();
    return;
  }

  pointChart = ensureChart(pointChart, pointChartRef.value);
  pointChart.setOption({
    tooltip: { trigger: "axis" },
    grid: { left: 56, right: 24, top: 28, bottom: 72 },
    xAxis: {
      type: "category",
      axisLabel: { interval: 0, rotate: 35 },
      data: reportData.pointValues.map((item) => item.name)
    },
    yAxis: { type: "value" },
    series: [
      {
        name: "估算价值",
        type: "bar",
        data: reportData.pointValues.map((item) =>
          toFixedNumber(item.estimated_value)
        )
      }
    ]
  });
}

function renderActivityStatusChart(): void {
  if (!activityStatusChartRef.value || reportData.activityStatuses.length === 0) {
    activityStatusChart?.clear();
    return;
  }

  activityStatusChart = ensureChart(
    activityStatusChart,
    activityStatusChartRef.value
  );
  activityStatusChart.setOption({
    tooltip: { trigger: "item" },
    legend: { bottom: 0, type: "scroll" },
    series: [
      {
        name: "活动状态",
        type: "pie",
        radius: "64%",
        center: ["50%", "45%"],
        data: reportData.activityStatuses.map((item) => ({
          name: activityStatusLabel(item.status),
          value: item.count
        }))
      }
    ]
  });
}

function renderMerchantChart(): void {
  if (!merchantChartRef.value || reportData.topMerchants.length === 0) {
    merchantChart?.clear();
    return;
  }

  const merchants = [...reportData.topMerchants].reverse();
  merchantChart = ensureChart(merchantChart, merchantChartRef.value);
  merchantChart.setOption({
    tooltip: { trigger: "axis" },
    grid: { left: 96, right: 24, top: 28, bottom: 32 },
    xAxis: { type: "value" },
    yAxis: {
      type: "category",
      data: merchants.map((item) => item.merchant)
    },
    series: [
      {
        name: "消费金额",
        type: "bar",
        data: merchants.map((item) => toFixedNumber(item.amount))
      }
    ]
  });
}

function renderBudgetChart(): void {
  if (!budgetChartRef.value || reportData.budgetVsActual.length === 0) {
    budgetChart?.clear();
    return;
  }

  budgetChart = ensureChart(budgetChart, budgetChartRef.value);
  budgetChart.setOption({
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 56, right: 24, top: 48, bottom: 64 },
    xAxis: {
      type: "category",
      axisLabel: { interval: 0, rotate: 30 },
      data: reportData.budgetVsActual.map((item) => item.category)
    },
    yAxis: { type: "value" },
    series: [
      {
        name: "预算",
        type: "bar",
        data: reportData.budgetVsActual.map((item) =>
          toFixedNumber(item.budget_amount)
        )
      },
      {
        name: "实际支出",
        type: "bar",
        data: reportData.budgetVsActual.map((item) =>
          toFixedNumber(item.actual_amount)
        )
      }
    ]
  });
}

function ensureChart(
  chart: ChartInstance | null,
  element: HTMLDivElement
): ChartInstance {
  return chart ?? echarts.init(element);
}

function resizeCharts(): void {
  cashFlowChart?.resize();
  expenseChart?.resize();
  accountChart?.resize();
  pointChart?.resize();
  activityStatusChart?.resize();
  merchantChart?.resize();
  budgetChart?.resize();
}

function disposeCharts(): void {
  cashFlowChart?.dispose();
  expenseChart?.dispose();
  accountChart?.dispose();
  pointChart?.dispose();
  activityStatusChart?.dispose();
  merchantChart?.dispose();
  budgetChart?.dispose();

  cashFlowChart = null;
  expenseChart = null;
  accountChart = null;
  pointChart = null;
  activityStatusChart = null;
  merchantChart = null;
  budgetChart = null;
}

function formatMoney(value: number): string {
  return Number(value || 0).toFixed(2);
}

function formatPoints(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function toFixedNumber(value: number): number {
  return Number(Number(value || 0).toFixed(2));
}

function getCurrentMonth(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function activityStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    watching: "关注中",
    eligible: "可参加",
    joined: "已参加",
    completed: "已完成",
    skipped: "已跳过",
    expired: "已过期"
  };

  return labels[status] ?? status;
}
</script>

<style scoped>
.reports-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.reports-header {
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

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.chart-card,
.section-card {
  border-radius: 8px;
}

.chart {
  width: 100%;
  height: 320px;
}

.chart-currency {
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 13px;
}

.table-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 16px;
}

.subscription-report-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.8fr);
  gap: 16px;
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

@media (max-width: 1100px) {
  .chart-grid,
  .table-grid,
  .subscription-report-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .reports-header,
  .header-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
