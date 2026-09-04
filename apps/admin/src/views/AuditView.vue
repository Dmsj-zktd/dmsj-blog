<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";

import { get, type AuditResponse } from "../api";

function iso(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const range = reactive({ from: iso(6), to: iso(0) });
const rows = ref<AuditResponse["rows"]>([]);
const error = ref("");

async function load() {
  const params = new URLSearchParams({ from: range.from, to: range.to, page: "1", pageSize: "100" });
  try {
    const response = await get<AuditResponse>(`/api/admin/audit-logs?${params}`);
    rows.value = response.rows;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

function fmt(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", { hour12: false });
}

onMounted(load);
</script>

<template>
  <section>
    <h1 class="page-title">审计日志</h1>
    <div class="panel">
      <div class="form-row">
        <div class="field">
          <label for="audit-from">开始日期</label>
          <input id="audit-from" v-model="range.from" type="date" />
        </div>
        <div class="field">
          <label for="audit-to">结束日期</label>
          <input id="audit-to" v-model="range.to" type="date" />
        </div>
        <button class="btn btn-primary" type="button" @click="load">查询</button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
    <div class="panel">
      <table class="table">
        <thead>
          <tr>
            <th>时间</th>
            <th>账号</th>
            <th>操作</th>
            <th>资源</th>
            <th>结果</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="`${row.ts}-${row.action}-${row.resourceId}`">
            <td class="mono">{{ fmt(row.ts) }}</td>
            <td class="mono">{{ row.actor }}</td>
            <td>{{ row.action }}</td>
            <td class="mono">{{ row.resource }} {{ row.resourceId ? `· ${row.resourceId}` : "" }}</td>
            <td>{{ row.success ? "成功" : "失败" }}</td>
          </tr>
          <tr v-if="!rows.length"><td colspan="5" class="muted">暂无记录</td></tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
