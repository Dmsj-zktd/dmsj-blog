<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { del, type MeResponse, type SessionUser } from "./api";

const route = useRoute();
const router = useRouter();
const user = ref<SessionUser | null>(null);
const checking = ref(true);

const isLogin = computed(() => route.path === "/login");

async function checkAuth() {
  checking.value = true;
  try {
    const response = await fetch("/api/auth/me", { credentials: "same-origin" });
    const data = (await response.json()) as MeResponse;
    user.value = data.user;
    if (!data.user && !isLogin.value) {
      await router.replace("/login");
    }
  } catch {
    await router.replace("/login");
  } finally {
    checking.value = false;
  }
}

async function logout() {
  await del("/api/auth/logout");
  await router.replace("/login");
}

onMounted(() => {
  checkAuth();
});
</script>

<template>
  <div v-if="checking" class="login-page"><div>检查登录状态…</div></div>
  <LoginView v-else-if="isLogin" />
  <div v-else class="admin-shell">
    <aside class="admin-aside">
      <div class="admin-brand">DMSJ · 管理</div>
      <nav class="admin-nav">
        <RouterLink to="/dashboard">访客统计</RouterLink>
        <RouterLink to="/articles">文章管理</RouterLink>
        <RouterLink to="/audit">审计日志</RouterLink>
        <button type="button" @click="logout">退出登录</button>
      </nav>
    </aside>
    <main class="admin-main">
      <RouterView />
    </main>
  </div>
</template>
