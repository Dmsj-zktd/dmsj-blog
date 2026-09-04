import { describe, expect, it } from "vitest";

import { csvCell, toCsv } from "../functions/_shared/csv";
import { parseClient } from "../functions/_shared/analytics";

describe("CSV 安全导出", () => {
  it("以 = + - @ 开头的单元格加单引号防公式注入", () => {
    expect(csvCell("=cmd()")).toBe("'=cmd()");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("包含逗号/引号/换行时正确转义", () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("生成带 BOM 前无需，但行尾为 CRLF", () => {
    const csv = toCsv(["a", "b"], [[1, 2], [3, 4]]);
    expect(csv).toContain("\r\n");
    expect(csv.split("\r\n")).toHaveLength(3);
  });
});

describe("UA 解析（隐私友好的本地实现）", () => {
  it("识别常见浏览器/OS/设备", () => {
    const desktop = parseClient(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    );
    expect(desktop).toEqual({ browser: "Chrome", os: "Windows", device: "desktop" });

    const phone = parseClient(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
    );
    expect(phone.browser).toBe("Safari");
    expect(phone.device).toBe("mobile");
    expect(phone.os).toBe("iOS");
  });

  it("未知 UA 返回 unknown 而不是抛错", () => {
    expect(parseClient("")).toEqual({
      browser: "unknown",
      os: "unknown",
      device: "desktop",
    });
  });
});
