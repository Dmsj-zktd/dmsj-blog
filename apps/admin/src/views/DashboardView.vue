<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";

import { get, type BreakdownResponse, type OverviewResponse } from "../api";

const today = new Date();
function iso(offsetDays: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

const range = reactive({ from: iso(29), to: iso(0) });
const group = ref("path");
const q = ref("");
const overview = ref<OverviewResponse | null>(null);
const breakdown = ref<BreakdownResponse | null>(null);
const error = ref("");

const groupOptions = [
  { value: "path", label: "页面路径" },
  { value: "referrer", label: "来源站" },
  { value: "country", label: "地区" },
  { value: "browser", label: "浏览器" },
  { value: "os", label: "操作系统" },
  { value: "device", label: "设备" },
];

const maxDaily = computed(() =>
  Math.max(1, ...(overview.value?.daily.map((d) => d.views) ?? [1])),
);

const chartPoints = computed(() => {
  const daily = overview.value?.daily ?? [];
  const width = 720;
  const height = 160;
  if (daily.length === 0) return "";
  return daily
    .map((row, index) => {
      const x = (index / Math.max(daily.length - 1, 1)) * width;
      const y = height - (row.views / maxDaily.value) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
});

async function load() {
  error.value = "";
  if (!range.from || !range.to) return;
  const params = new URLSearchParams({ from: range.from, to: range.to });
  try {
    overview.value = await get<OverviewResponse>(
      `/api/admin/analytics/overview?${params}`,
    );
    await loadBreakdown(1);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

async function loadBreakdown(page = 1) {
  const params = new URLSearchParams({
    from: range.from,
    to: range.to,
    group: group.value,
    q: q.value,
    page: String(page),
    pageSize: "20",
  });
  breakdown.value = await get<BreakdownResponse>(
    `/api/admin/analytics/breakdown?${params}`,
  );
}

function exportCsv() {
  const params = new URLSearchParams({
    from: range.from,
    to: range.to,
    group: group.value,
    q: q.value,
    format: "csv",
  });
  window.location.assign(`/api/admin/analytics/breakdown?${params}`);
}

onMounted(load);
</script>

<template>
  <section>
    <h1 class="page-title">访客统计</h1>
    <div class="panel">
      <div class="form-row">
        <div class="field">
          <label for="from">开始日期</label>
          <input id="from" v-model="range.from" type="date" />
        </div>
        <div class="field">
          <label for="to">结束日期</label>
          <input id="to" v-model="range.to" type="date" />
        </div>
        <button class="btn btn-primary" type="button" @click="load">查询</button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <template v-if="overview">
      <div class="stats-grid">
        <div class="stat">
          <strong>{{ overview.totalViews.toLocaleString("zh-CN") }}</strong>
          <span>浏览量（估算）</span>
        </div>
        <div class="stat">
          <strong>{{ overview.uniqueVisitors.toLocaleString("zh-CN") }}</strong>
          <span>独立访客（估算）</span>
        </div>
        <div class="stat">
          <strong>{{ overview.daily.length }}</strong>
          <span>覆盖天数</span>
        </div>
      </div>

      <div class="panel">
        <h2>每日趋势</h2>
        <svg
          v-if="overview.daily.length"
          viewBox="0 0 720 170"
          preserveAspectRatio="none"
          style="width: 100%; height: 170px"
          role="img"
          aria-label="每日浏览量趋势"
        >
          <polyline :points="chartPoints" fill="none" stroke="var(--accent)" stroke-width="2" />
        </svg>
        <p v-else class="muted">所选区间暂无数据。</p>
      </div>

      <div class="panel">
        <div class="form-row">
          <div class="field">
            <label for="group">分组维度</label>
            <select id="group" v-model="group" @change="loadBreakdown(1)">
              <option v-for="option in groupOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div class="field">
            <label for="q">路径关键字</label>
            <input id="q" v-model="q" placeholder="如 /embedded" @change="loadBreakdown(1)" />
          </div>
          <button class="btn" type="button" @click="exportCsv">导出 CSV</button>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>维度值</th>
              <th>浏览量</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in breakdown?.rows" :key="row.key">
              <td class="muted">{{ index + 1 }}</td>
              <td class="mono">{{ row.key || "(空)" }}</td>
              <td>{{ row.views.toLocaleString("zh-CN") }}</td>
            </tr>
            <tr v-if="!breakdown?.rows.length">
              <td colspan="3" class="muted">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
