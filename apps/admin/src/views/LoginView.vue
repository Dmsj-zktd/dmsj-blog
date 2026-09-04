<script setup lang="ts">
import { ref } from "vue";

import { post } from "../api";

const error = ref("");
const busy = ref(false);

const queryError = new URLSearchParams(window.location.search).get("error");
if (queryError) {
  const messages: Record<string, string> = {
    denied: "该 GitHub 账号不在白名单中。",
    oauth_failed: "GitHub 授权失败，请重试。",
    bad_state: "登录状态无效，请重新发起登录。",
  };
  error.value = messages[queryError] ?? "登录失败，请重试。";
}

async function login() {
  busy.value = true;
  error.value = "";
  try {
    const response = await post<{ url: string }>("/api/auth/login-start", {
      turnstileToken: "",
    });
    window.location.href = response.url;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1>DMSJ Blog 管理后台</h1>
      <p class="muted">仅允许已授权的 GitHub 账号登录</p>
      <button class="btn btn-primary" type="button" :disabled="busy" @click="login">
        {{ busy ? "跳转中…" : "使用 GitHub 登录" }}
      </button>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>
