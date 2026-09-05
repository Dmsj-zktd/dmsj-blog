import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";

import App from "./App.vue";
import ArticlesView from "./views/ArticlesView.vue";
import AuditView from "./views/AuditView.vue";
import DashboardView from "./views/DashboardView.vue";
import LoginView from "./views/LoginView.vue";
import "./styles.css";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/dashboard" },
    { path: "/login", component: LoginView },
    { path: "/dashboard", component: DashboardView },
    { path: "/articles", component: ArticlesView },
    { path: "/audit", component: AuditView },
  ],
});

createApp(App).use(router).mount("#app");
