const dangerousPrefix = /^[=+\-@]/;

export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  const significant = text.trimStart().replaceAll("\0", "");
  if (dangerousPrefix.test(significant)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvCell).join(","));
  }
  return lines.join("\r\n");
}
