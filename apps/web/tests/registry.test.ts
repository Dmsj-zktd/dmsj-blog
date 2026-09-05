import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { contentModules } from "../src/site/content-registry";
import { themes } from "../src/site/themes";

describe("内容模块注册表", () => {
  it("所有注册模块都有对应内容目录", () => {
    for (const module of contentModules) {
      const dir = resolve(process.cwd(), "content", module.key);
      expect(existsSync(dir), `缺少 content/${module.key}/`).toBe(true);
    }
  });

  it("key 唯一且排序稳定", () => {
    const keys = contentModules.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
    const orders = contentModules.map((m) => m.order);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });
});

describe("主题注册", () => {
  it("主题 id 唯一且包含 5 套", () => {
    const ids = themes.map((theme) => theme.id);
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
  });

  it("每套主题都有明暗两种 token 所需的 fontClass", () => {
    for (const theme of themes) {
      expect(["serif", "sans", "mono"]).toContain(theme.fontClass);
    }
  });
});
