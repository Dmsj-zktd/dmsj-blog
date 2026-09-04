export type ThemeMode = "light" | "dark";

export interface BlogTheme {
  id: string;
  name: string;
  en: string;
  description: string;
  /** 该主题适合最先展示的模式，auto 时随系统 */
  defaultMode: ThemeMode;
  fontClass: "serif" | "sans" | "mono";
}

export const themes: BlogTheme[] = [
  {
    id: "paper",
    name: "纸墨",
    en: "Paper & Ink",
    description: "暖纸底与墨色正文，赭红点缀。借鉴编辑式排印的留白与对比。",
    defaultMode: "light",
    fontClass: "serif",
  },
  {
    id: "gothic",
    name: "铅印",
    en: "Gothic",
    description: "高对比黑白排印，克制、正式，接近印刷品而非网页。",
    defaultMode: "light",
    fontClass: "serif",
  },
  {
    id: "blueprint",
    name: "蓝图",
    en: "Blueprint",
    description: "技术网格与细线表格，单一克制的工程蓝，适合阅读硬件/系统内容。",
    defaultMode: "light",
    fontClass: "sans",
  },
  {
    id: "telegraph",
    name: "电报",
    en: "Telegraph",
    description: "米黄纸面、电报绿与等宽元信息，克制的旧技术浪漫。",
    defaultMode: "light",
    fontClass: "sans",
  },
  {
    id: "terminal",
    name: "终端",
    en: "Terminal",
    description: "深色单色背景，代码优先，适合深夜阅读与工具气质。",
    defaultMode: "dark",
    fontClass: "mono",
  },
];

export const themeIds = themes.map((t) => t.id);

export function isThemeId(value: unknown): value is string {
  return typeof value === "string" && themeIds.includes(value);
}
