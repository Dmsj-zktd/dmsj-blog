<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";

import {
  del,
  get,
  post,
  put,
  type ArticlesResponse,
  type DraftListItem,
  type PublishedFile,
} from "../api";

const tabs = ["published", "drafts"] as const;
const activeTab = ref<(typeof tabs)[number]>("published");
const published = ref<PublishedFile[]>([]);
const draftRows = ref<DraftListItem[]>([]);
const error = ref("");
const notice = ref("");

// 草稿表单 / 编辑器状态
const editingRaw = ref(false);
const rawPath = ref("");
const rawSha = ref("");
const rawContent = ref("");

const form = reactive({
  id: "",
  domain: "algorithms",
  dirsText: "",
  slug: "",
  title: "",
  description: "",
  tagsText: "",
  series: "",
  body: "",
});

function dirsOf() {
  return form.dirsText
    .split(/[,\/]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
}

function tagsOf() {
  return form.tagsText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function resetForm() {
  Object.assign(form, {
    id: "",
    domain: "algorithms",
    dirsText: "",
    slug: "",
    title: "",
    description: "",
    tagsText: "",
    series: "",
    body: "",
  });
}

async function load() {
  const data = await get<ArticlesResponse>("/api/admin/articles");
  published.value = data.published;
  draftRows.value = data.drafts;
}

function humanPath(path: string): string {
  return path.replace(/^content\//, "").replace(/\.(md|mdx)$/, "");
}

async function newDraft() {
  resetForm();
  activeTab.value = "drafts";
  editingRaw.value = false;
}

async function editDraft(row: DraftListItem) {
  const detail = await get<DraftListItem & { body: string }>(`/api/admin/drafts/${row.id}`);
  Object.assign(form, {
    id: detail.id,
    domain: detail.domain,
    dirsText: detail.dirs.join("/"),
    slug: detail.slug,
    title: detail.title,
    description: detail.description,
    tagsText: detail.tags.join(", "),
    series: detail.series ?? "",
    body: detail.body,
  });
  editingRaw.value = false;
}

async function saveDraft() {
  error.value = "";
  notice.value = "";
  try {
    await post("/api/admin/drafts", {
      id: form.id || undefined,
      domain: form.domain,
      dirs: dirsOf(),
      slug: form.slug.trim() || form.title.toLowerCase().replace(/[^\w-]+/g, "-"),
      title: form.title.trim(),
      description: form.description.trim(),
      tags: tagsOf(),
      series: form.series.trim() || undefined,
      body: form.body,
    });
    notice.value = "草稿已保存到 D1（发布前不会进入公开仓库）";
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

async function publishDraft(row: DraftListItem) {
  if (!window.confirm(`确认发布《${row.title}》？将直接提交到 GitHub main 分支。`)) return;
  try {
    const result = await post<{ path: string }>(`/api/admin/drafts/${row.id}/publish`);
    notice.value = `已发布：${result.path}（等待 Pages 重建）`;
    resetForm();
    await load();
    activeTab.value = "published";
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

async function deleteDraft(row: DraftListItem) {
  if (!window.confirm(`删除草稿《${row.title}》？`)) return;
  await del(`/api/admin/drafts/${row.id}`);
  await load();
}

async function editPublished(file: PublishedFile) {
  const result = await get<{ path: string; content: string }>(
    `/api/admin/article?path=${encodeURIComponent(file.path)}`,
  );
  rawPath.value = result.path;
  rawSha.value = file.sha;
  rawContent.value = result.content;
  editingRaw.value = true;
  activeTab.value = "published";
}

async function savePublished() {
  error.value = "";
  try {
    await put("/api/admin/raw-article", {
      path: rawPath.value,
      sha: rawSha.value || undefined,
      content: rawContent.value,
    });
    notice.value = "已提交到 GitHub main（等待 Pages 重建）";
    editingRaw.value = false;
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

async function deletePublished(file: PublishedFile) {
  if (!window.confirm(`删除已发布文件 ${file.path}？该操作不可撤销。`)) return;
  await del(`/api/admin/article?path=${encodeURIComponent(file.path)}`);
  await load();
}

onMounted(async () => {
  try {
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
});
</script>

<template>
  <section>
    <h1 class="page-title">文章管理</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="notice" class="muted">{{ notice }}</p>

    <div class="panel">
      <div class="form-row">
        <button
          v-for="tab in tabs"
          :key="tab"
          class="btn"
          :class="{ 'btn-primary': activeTab === tab }"
          type="button"
          @click="activeTab = tab"
        >
          {{ tab === "published" ? `已发布 (${published.length})` : `草稿 (${draftRows.length})` }}
        </button>
        <button class="btn" type="button" @click="newDraft">+ 新建草稿</button>
      </div>
    </div>

    <div v-if="activeTab === 'published' && !editingRaw" class="panel">
      <table class="table">
        <thead><tr><th>文件</th><th>大小</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="file in published" :key="file.path">
            <td class="mono">{{ humanPath(file.path) }}</td>
            <td>{{ Math.ceil(file.size / 1024) }} KB</td>
            <td>
              <button class="btn" type="button" @click="editPublished(file)">编辑</button>
              <button class="btn btn-danger" type="button" @click="deletePublished(file)">删除</button>
            </td>
          </tr>
          <tr v-if="!published.length"><td colspan="3" class="muted">还没有已发布文章</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'published' && editingRaw" class="panel">
      <h2>编辑已发布文件</h2>
      <p class="mono">{{ rawPath }}</p>
      <div class="field">
        <label for="raw-content">Markdown（含 frontmatter）</label>
        <textarea id="raw-content" v-model="rawContent"></textarea>
      </div>
      <button class="btn btn-primary" type="button" @click="savePublished">提交到 GitHub</button>
      <button class="btn" type="button" @click="editingRaw = false">取消</button>
    </div>

    <div v-if="activeTab === 'drafts'" class="panel">
      <h2>{{ form.id ? "编辑草稿" : "新建草稿" }}</h2>
      <div class="field">
        <label for="d-title">标题</label>
        <input id="d-title" v-model="form.title" />
      </div>
      <div class="field">
        <label for="d-desc">摘要</label>
        <input id="d-desc" v-model="form.description" />
      </div>
      <div class="form-row">
        <div class="field" style="flex: 1">
          <label for="d-domain">内容域</label>
          <select id="d-domain" v-model="form.domain">
            <option value="algorithms">算法心得</option>
            <option value="embedded">嵌入式经验</option>
            <option value="llm-agent">LLM / Agent</option>
            <option value="projects">项目展示</option>
            <option value="thoughts">随想杂谈</option>
          </select>
        </div>
        <div class="field" style="flex: 1">
          <label for="d-slug">Slug</label>
          <input id="d-slug" v-model="form.slug" placeholder="留空则按标题生成" />
        </div>
      </div>
      <div class="field">
        <label for="d-dirs">目录路径（可选，如 rtos/mcu，/ 或 , 分隔）</label>
        <input id="d-dirs" v-model="form.dirsText" />
      </div>
      <div class="field">
        <label for="d-tags">标签（逗号分隔）</label>
        <input id="d-tags" v-model="form.tagsText" />
      </div>
      <div class="field">
        <label for="d-series">系列（可选）</label>
        <input id="d-series" v-model="form.series" />
      </div>
      <div class="field">
        <label for="d-body">Markdown 正文</label>
        <textarea id="d-body" v-model="form.body"></textarea>
      </div>
      <button class="btn btn-primary" type="button" @click="saveDraft">保存草稿</button>
      <button v-if="form.id" class="btn" type="button" @click="publishDraft(draftRows.find((r) => r.id === form.id)!)">
        发布
      </button>
    </div>

    <div v-if="activeTab === 'drafts'" class="panel">
      <h2>已有草稿</h2>
      <table class="table">
        <thead><tr><th>标题</th><th>域</th><th>更新时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="row in draftRows" :key="row.id">
            <td>{{ row.title }}</td>
            <td class="mono">{{ row.domain }}</td>
            <td>{{ new Date(row.updatedAt).toLocaleString("zh-CN", { hour12: false }) }}</td>
            <td>
              <button class="btn" type="button" @click="editDraft(row)">编辑</button>
              <button class="btn btn-primary" type="button" @click="publishDraft(row)">发布</button>
              <button class="btn btn-danger" type="button" @click="deleteDraft(row)">删除</button>
            </td>
          </tr>
          <tr v-if="!draftRows.length"><td colspan="4" class="muted">暂无草稿</td></tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
