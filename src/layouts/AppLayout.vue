<template>
  <el-container class="app-shell">
    <el-aside width="248px" class="app-sidebar">
      <div class="brand">
        <div class="brand-mark">PF</div>
        <div>
          <div class="brand-title">Personal Finance</div>
          <div class="brand-subtitle">Manager</div>
        </div>
      </div>

      <el-menu
        router
        :default-active="activePath"
        class="nav-menu"
        background-color="#172033"
        text-color="#cbd5e1"
        active-text-color="#ffffff"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="app-header">
        <div>
          <div class="header-title">{{ currentTitle }}</div>
          <div class="header-subtitle">Windows local desktop finance workspace</div>
        </div>
      </el-header>

      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import {
  Calendar,
  CreditCard,
  DataAnalysis,
  Money,
  Refresh,
  House,
  List,
  Setting,
  Trophy
} from "@element-plus/icons-vue";

const route = useRoute();

const menuItems = [
  { path: "/", label: "Dashboard", icon: House },
  { path: "/accounts", label: "Accounts", icon: CreditCard },
  { path: "/transactions", label: "Transactions", icon: List },
  { path: "/points", label: "Points", icon: Trophy },
  { path: "/activities", label: "Activities", icon: Calendar },
  { path: "/subscriptions", label: "Subscriptions", icon: Refresh },
  { path: "/budgets", label: "Budgets", icon: Money },
  { path: "/reports", label: "Reports", icon: DataAnalysis },
  { path: "/settings", label: "Settings", icon: Setting }
];

const activePath = computed(() => route.path);
const currentTitle = computed(() => {
  const matched = menuItems.find((item) => item.path === route.path);
  return matched?.label ?? "Dashboard";
});
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
}

.app-sidebar {
  background: #172033;
  color: #ffffff;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 72px;
  padding: 0 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-mark {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 8px;
  background: #2f80ed;
  font-size: 14px;
  font-weight: 700;
}

.brand-title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
}

.brand-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: #94a3b8;
}

.nav-menu {
  border-right: 0;
}

.nav-menu :deep(.el-menu-item) {
  height: 48px;
}

.nav-menu :deep(.el-menu-item.is-active) {
  background: #2563eb;
}

.app-header {
  display: flex;
  align-items: center;
  height: 72px;
  padding: 0 28px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.header-title {
  font-size: 20px;
  font-weight: 650;
  color: #111827;
}

.header-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #6b7280;
}

.app-main {
  padding: 28px;
  background: #f4f6f8;
}
</style>
