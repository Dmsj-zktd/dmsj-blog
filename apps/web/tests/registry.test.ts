import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { frontierTopics } from "@dmsj/content-model";
import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "../src/lib/structured-data";
import { contentModules } from "../src/site/content-registry";
import { appearanceModes, isAppearanceMode } from "../src/site/themes";

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
  it("外观模式包含跟随系统、浅色和深色", () => {
    expect(appearanceModes.map((mode) => mode.id)).toEqual(["auto", "light", "dark"]);
  });

  it("拒绝未注册的外观值", () => {
    expect(isAppearanceMode("dark")).toBe(true);
    expect(isAppearanceMode("random")).toBe(false);
  });
});

describe("前沿注册表", () => {
  it("包含十项主题并保持编号唯一", () => {
    expect(frontierTopics).toHaveLength(10);
    expect(new Set(frontierTopics.map((topic) => topic.rank)).size).toBe(10);
    expect(frontierTopics.every((topic) => topic.sources.length >= 2)).toBe(true);
  });
});

describe("结构化数据序列化", () => {
  it("prevents frontmatter text from closing the JSON-LD script element", () => {
    const value = { title: "</script><img src=x onerror=alert(1)>", note: "\u2028line" };
    const serialized = serializeJsonLd(value);
    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("\u2028");
    expect(JSON.parse(serialized)).toEqual(value);
  });
});
