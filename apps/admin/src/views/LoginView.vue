<script setup lang="ts">
import { onMounted, ref } from "vue";

import { get, post } from "../api";

const error = ref("");
const busy = ref(false);
const turnstileToken = ref("");
const turnstileBox = ref<HTMLElement | null>(null);
const turnstileRequired = ref(false);

interface AuthConfig {
  turnstile: { enabled: boolean; siteKey: string | null };
}

onMounted(async () => {
  try {
    const config = await get<AuthConfig>("/api/auth/config");
    if (!config.turnstile.enabled || !config.turnstile.siteKey || !turnstileBox.value) return;
    turnstileRequired.value = true;
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => {
      const turnstile = (window as unknown as {
        turnstile?: {
          render: (
            target: HTMLElement,
            options: Record<string, unknown>,
          ) => string;
        };
      }).turnstile;
      turnstile?.render(turnstileBox.value as HTMLElement, {
        sitekey: config.turnstile.siteKey,
        callback: (token: string) => {
          turnstileToken.value = token;
        },
        "expired-callback": () => {
          turnstileToken.value = "";
        },
      });
    };
    document.head.appendChild(script);
  } catch {
    turnstileRequired.value = false;
  }
});

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
      turnstileToken: turnstileToken.value,
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
      <div v-if="turnstileRequired" ref="turnstileBox" class="turnstile-box"></div>
      <p v-if="turnstileRequired" class="muted">请先完成人机验证，再发起 GitHub 授权。</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>
