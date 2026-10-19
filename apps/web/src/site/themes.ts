export type ThemeMode = "auto" | "light" | "dark";

export interface AppearanceOption {
  id: ThemeMode;
  label: string;
  description: string;
}

export const appearanceModes: AppearanceOption[] = [
  { id: "auto", label: "跟随系统", description: "根据设备明暗偏好自动切换" },
  { id: "light", label: "纸面", description: "冷调纸面与石墨墨色" },
  { id: "dark", label: "示波器", description: "深色仪表界面" },
];

export const appearanceModeIds = appearanceModes.map((mode) => mode.id);

export function isAppearanceMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && appearanceModeIds.includes(value as ThemeMode);
}
