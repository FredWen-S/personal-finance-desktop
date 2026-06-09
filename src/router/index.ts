import { createRouter, createWebHashHistory, type RouteRecordRaw } from "vue-router";
import Dashboard from "../pages/Dashboard.vue";
import Accounts from "../pages/Accounts.vue";
import Transactions from "../pages/Transactions.vue";
import Points from "../pages/Points.vue";
import Activities from "../pages/Activities.vue";
import Subscriptions from "../pages/Subscriptions.vue";
import Budgets from "../pages/Budgets.vue";
import Reports from "../pages/Reports.vue";
import Settings from "../pages/Settings.vue";

const routes: RouteRecordRaw[] = [
  { path: "/", name: "Dashboard", component: Dashboard },
  { path: "/accounts", name: "Accounts", component: Accounts },
  { path: "/transactions", name: "Transactions", component: Transactions },
  { path: "/points", name: "Points", component: Points },
  { path: "/activities", name: "Activities", component: Activities },
  { path: "/subscriptions", name: "Subscriptions", component: Subscriptions },
  { path: "/budgets", name: "Budgets", component: Budgets },
  { path: "/reports", name: "Reports", component: Reports },
  { path: "/settings", name: "Settings", component: Settings }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
