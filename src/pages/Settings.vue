<template>
  <section v-loading="statsLoading" class="settings-page">
    <div class="settings-header">
      <div>
        <h1 class="page-title">Settings</h1>
        <p class="page-description">本地数据管理、导出与备份</p>
      </div>

      <el-button type="primary" :loading="statsLoading" @click="loadStats">
        刷新
      </el-button>
    </div>

    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="section-header">
          <span>数据库信息</span>
          <el-tag effect="plain">{{ appDataInfo.databaseName }}</el-tag>
        </div>
      </template>

      <el-descriptions :column="3" border>
        <el-descriptions-item label="数据库名称">
          {{ appDataInfo.databaseName }}
        </el-descriptions-item>
        <el-descriptions-item label="账户数量">
          {{ stats.accountCount }}
        </el-descriptions-item>
        <el-descriptions-item label="流水数量">
          {{ stats.transactionCount }}
        </el-descriptions-item>
        <el-descriptions-item label="积分账户数量">
          {{ stats.pointProgramCount }}
        </el-descriptions-item>
        <el-descriptions-item label="积分流水数量">
          {{ stats.pointTransactionCount }}
        </el-descriptions-item>
        <el-descriptions-item label="活动数量">
          {{ stats.activityCount }}
        </el-descriptions-item>
        <el-descriptions-item label="启用账户数量">
          {{ stats.activeAccountCount }}
        </el-descriptions-item>
        <el-descriptions-item label="启用积分账户数量">
          {{ stats.activePointProgramCount }}
        </el-descriptions-item>
        <el-descriptions-item label="存储说明" :span="3">
          {{ appDataInfo.note }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="section-header">
          <span>币种与汇率设置</span>
          <el-button type="primary" @click="openRateDialog()">新增汇率</el-button>
        </div>
      </template>

      <el-alert
        title="汇率为手动维护，不是实时汇率；Dashboard / Reports 的跨币种金额会换算到基础币种；如果缺少某个币种到基础币种的汇率，汇总会报错，避免错误计算。"
        type="info"
        show-icon
        :closable="false"
        class="currency-alert"
      />

      <div class="base-currency-row">
        <span class="field-label">基础币种</span>
        <el-select v-model="baseCurrencyForm.currency" class="currency-select">
          <el-option
            v-for="currency in supportedCurrencies"
            :key="currency"
            :label="currency"
            :value="currency"
          />
        </el-select>
        <el-button
          type="primary"
          :loading="savingBaseCurrency"
          @click="saveBaseCurrency"
        >
          保存基础币种
        </el-button>
      </div>

      <el-table :data="exchangeRates" stripe>
        <el-table-column prop="from_currency" label="from_currency" width="130" />
        <el-table-column prop="to_currency" label="to_currency" width="130" />
        <el-table-column prop="rate" label="rate" width="140" align="right" />
        <el-table-column prop="note" label="note" min-width="180">
          <template #default="{ row }">
            {{ row.note || "-" }}
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="updated_at" min-width="210" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openRateDialog(row)">
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="section-card" shadow="never">
      <template #header>导出与备份</template>

      <div class="export-actions">
        <el-button
          type="primary"
          :loading="exportingKey === 'backup'"
          @click="exportBackup"
        >
          导出完整 JSON 备份
        </el-button>

        <el-button
          v-for="item in tableExports"
          :key="item.tableName"
          :loading="exportingKey === item.tableName"
          @click="exportCsv(item.tableName)"
        >
          导出 {{ item.label }} CSV
        </el-button>
      </div>
    </el-card>

    <el-alert
      title="安全说明"
      type="info"
      show-icon
      :closable="false"
      class="safety-alert"
    >
      <ul class="safety-list">
        <li>当前应用为本地单机应用，数据存储在本机应用数据目录。</li>
        <li>请定期导出 JSON 备份。</li>
        <li>JSON 备份是逻辑备份，不是原始 SQLite 文件复制。</li>
        <li>本阶段暂不实现自动恢复，避免误覆盖数据库。</li>
      </ul>
    </el-alert>

    <el-card class="section-card danger-card" shadow="never">
      <template #header>危险操作</template>
      <div class="danger-content">
        <div>
          <div class="danger-title">清空所有数据</div>
          <div class="danger-description">
            危险操作将在后续版本实现，并需要多重确认。
          </div>
        </div>
        <el-button type="danger" disabled>清空所有数据</el-button>
      </div>
    </el-card>
    <el-dialog v-model="rateDialogVisible" title="汇率设置" width="520px">
      <el-form label-width="120px">
        <el-form-item label="from_currency" required>
          <el-select
            v-model="rateForm.from_currency"
            class="dialog-input"
            :disabled="isLockedSameCurrencyRate"
          >
            <el-option
              v-for="currency in supportedCurrencies"
              :key="currency"
              :label="currency"
              :value="currency"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="to_currency" required>
          <el-select
            v-model="rateForm.to_currency"
            class="dialog-input"
            :disabled="isLockedSameCurrencyRate"
          >
            <el-option
              v-for="currency in supportedCurrencies"
              :key="currency"
              :label="currency"
              :value="currency"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="rate" required>
          <el-input-number
            v-model="rateForm.rate"
            class="dialog-input"
            :min="0.000001"
            :precision="6"
            :step="0.01"
            :disabled="isSameCurrencyRate"
          />
        </el-form-item>
        <el-form-item label="note">
          <el-input v-model="rateForm.note" class="dialog-input" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="rateDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="savingRate"
          @click="saveExchangeRate"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import {
  createBackupJson,
  createTableCsv,
  getAppDataInfo,
  getDatabaseStats
} from "../services/settingsService";
import {
  getBaseCurrency,
  listExchangeRates,
  setBaseCurrency,
  upsertExchangeRate
} from "../services/currencyService";
import { saveTextFile } from "../services/fileExportService";
import type {
  BaseCurrency,
  ExchangeRate,
  ExchangeRateInput
} from "../types/currency";
import type { DatabaseStats, TableExportName } from "../types/settings";

const statsLoading = ref(false);
const exportingKey = ref<string | null>(null);
const savingBaseCurrency = ref(false);
const savingRate = ref(false);
const rateDialogVisible = ref(false);
const isLockedSameCurrencyRate = ref(false);
const exchangeRates = ref<ExchangeRate[]>([]);
const supportedCurrencies: BaseCurrency[] = [
  "CNY",
  "USD",
  "JPY",
  "EUR",
  "GBP",
  "HKD"
];

const baseCurrencyForm = reactive({
  currency: "CNY"
});

const rateForm = reactive<ExchangeRateInput>({
  from_currency: "CNY",
  to_currency: "USD",
  rate: 0.14,
  note: ""
});

const isSameCurrencyRate = computed(
  () => rateForm.from_currency === rateForm.to_currency
);

const stats = reactive<DatabaseStats>({
  accountCount: 0,
  transactionCount: 0,
  pointProgramCount: 0,
  pointTransactionCount: 0,
  activityCount: 0,
  activeAccountCount: 0,
  activePointProgramCount: 0
});

const appDataInfo = reactive({
  databaseName: "finance.db",
  note: "数据库由 Tauri SQL 插件存放在应用数据目录中。"
});

const tableExports: Array<{ tableName: TableExportName; label: string }> = [
  { tableName: "accounts", label: "accounts" },
  { tableName: "transactions", label: "transactions" },
  { tableName: "point_programs", label: "point_programs" },
  { tableName: "point_transactions", label: "point_transactions" },
  { tableName: "activities", label: "activities" }
];

onMounted(() => {
  void loadStats();
});

async function loadStats(): Promise<void> {
  statsLoading.value = true;

  try {
    const [
      nextStats,
      nextAppDataInfo,
      nextBaseCurrency,
      nextExchangeRates
    ] = await Promise.all([
      getDatabaseStats(),
      getAppDataInfo(),
      getBaseCurrency(),
      listExchangeRates()
    ]);
    Object.assign(stats, nextStats);
    Object.assign(appDataInfo, nextAppDataInfo);
    baseCurrencyForm.currency = nextBaseCurrency;
    exchangeRates.value = nextExchangeRates;
  } catch (caughtError) {
    ElMessage.error(getErrorMessage(caughtError));
  } finally {
    statsLoading.value = false;
  }
}

async function saveBaseCurrency(): Promise<void> {
  savingBaseCurrency.value = true;

  try {
    await setBaseCurrency(baseCurrencyForm.currency);
    ElMessage.success("基础币种已保存，Dashboard / Reports 会按该币种汇总");
  } catch (caughtError) {
    ElMessage.error(getErrorMessage(caughtError));
  } finally {
    savingBaseCurrency.value = false;
  }
}

function openRateDialog(rate?: ExchangeRate): void {
  if (rate) {
    isLockedSameCurrencyRate.value = rate.from_currency === rate.to_currency;
    Object.assign(rateForm, {
      from_currency: rate.from_currency,
      to_currency: rate.to_currency,
      rate: rate.from_currency === rate.to_currency ? 1 : Number(rate.rate),
      note: rate.note ?? ""
    });
  } else {
    isLockedSameCurrencyRate.value = false;
    Object.assign(rateForm, {
      from_currency: "CNY",
      to_currency:
        baseCurrencyForm.currency === "CNY" ? "USD" : baseCurrencyForm.currency,
      rate: 1,
      note: ""
    });
  }

  rateDialogVisible.value = true;
}

async function saveExchangeRate(): Promise<void> {
  savingRate.value = true;

  try {
    await upsertExchangeRate({
      ...rateForm,
      rate: isSameCurrencyRate.value ? 1 : Number(rateForm.rate)
    });
    exchangeRates.value = await listExchangeRates();
    rateDialogVisible.value = false;
    ElMessage.success("汇率已保存");
  } catch (caughtError) {
    ElMessage.error(getErrorMessage(caughtError));
  } finally {
    savingRate.value = false;
  }
}

async function exportBackup(): Promise<void> {
  exportingKey.value = "backup";

  try {
    const content = await createBackupJson();
    const savedPath = await saveTextFile(
      `personal-finance-backup-${formatTimestamp()}.json`,
      content
    );
    handleExportResult(savedPath);
  } catch (caughtError) {
    ElMessage.error(getErrorMessage(caughtError));
  } finally {
    exportingKey.value = null;
  }
}

async function exportCsv(tableName: TableExportName): Promise<void> {
  exportingKey.value = tableName;

  try {
    const content = await createTableCsv(tableName);
    const savedPath = await saveTextFile(
      `${fileNamePrefix(tableName)}-${formatTimestamp()}.csv`,
      content
    );
    handleExportResult(savedPath);
  } catch (caughtError) {
    ElMessage.error(getErrorMessage(caughtError));
  } finally {
    exportingKey.value = null;
  }
}

function handleExportResult(savedPath: string | null): void {
  if (!savedPath) {
    ElMessage.info("已取消导出");
    return;
  }

  ElMessage.success("导出成功");
}

function fileNamePrefix(tableName: TableExportName): string {
  const names: Record<TableExportName, string> = {
    accounts: "accounts",
    transactions: "transactions",
    point_programs: "point-programs",
    point_transactions: "point-transactions",
    activities: "activities"
  };

  return names[tableName];
}

function formatTimestamp(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function getErrorMessage(caughtError: unknown): string {
  return caughtError instanceof Error ? caughtError.message : String(caughtError);
}
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-header,
.section-header,
.danger-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.section-card {
  border-radius: 8px;
}

.export-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.currency-alert {
  margin-bottom: 16px;
}

.base-currency-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.field-label {
  font-weight: 650;
}

.currency-select,
.dialog-input {
  width: 220px;
}

.safety-alert :deep(.el-alert__content) {
  width: 100%;
}

.safety-list {
  margin: 8px 0 0;
  padding-left: 18px;
  line-height: 1.8;
}

.danger-card {
  border-color: #fecaca;
}

.danger-title {
  font-weight: 650;
  color: #991b1b;
}

.danger-description {
  margin-top: 4px;
  color: #6b7280;
}

@media (max-width: 780px) {
  .settings-header,
  .danger-content {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
