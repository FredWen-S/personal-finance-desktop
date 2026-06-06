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
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import {
  createBackupJson,
  createTableCsv,
  getAppDataInfo,
  getDatabaseStats
} from "../services/settingsService";
import { saveTextFile } from "../services/fileExportService";
import type { DatabaseStats, TableExportName } from "../types/settings";

const statsLoading = ref(false);
const exportingKey = ref<string | null>(null);

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
    const [nextStats, nextAppDataInfo] = await Promise.all([
      getDatabaseStats(),
      getAppDataInfo()
    ]);
    Object.assign(stats, nextStats);
    Object.assign(appDataInfo, nextAppDataInfo);
  } catch (caughtError) {
    ElMessage.error(getErrorMessage(caughtError));
  } finally {
    statsLoading.value = false;
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
