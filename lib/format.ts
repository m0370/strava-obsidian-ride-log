/**
 * Obsidianノート生成 — Strava アクティビティ → Markdown
 * 保存先: 51_Rides/ridelog/YYYY-MM-DD_アクティビティ名.md
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type { Activity } from "./api";

// VAULT_ROOT 環境変数で上書き可能。未設定時は .claude/skills/ride-log/lib/ から4階層上を使用
const VAULT_ROOT = process.env.VAULT_ROOT ?? join(import.meta.dir, "../../../..");
const RIDES_DIR = join(VAULT_ROOT, process.env.RIDES_SUBDIR ?? "51_Rides/ridelog");

function secToHMS(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function mpsToKmh(mps: number): number {
  return Math.round(mps * 3.6 * 10) / 10;
}

function toKm(m: number): number {
  return Math.round(m / 10) / 100;
}

function sportTypeToTag(sportType: string): string {
  const map: Record<string, string> = {
    Ride: "サイクリング",
    VirtualRide: "バーチャルライド",
    EBikeRide: "Eバイク",
    MountainBikeRide: "MTB",
    GravelRide: "グラベル",
  };
  return map[sportType] || "サイクリング";
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[\/\\:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 60);
}

export interface NoteResult {
  content: string;
  filename: string;
  filepath: string;
}

export function generateNote(activity: Activity): NoteResult {
  const date = activity.start_date_local.substring(0, 10);
  const distKm = toKm(activity.distance);
  const elevM = Math.round(activity.total_elevation_gain);
  const avgKmh = mpsToKmh(activity.average_speed);
  const maxKmh = mpsToKmh(activity.max_speed);
  const movingTime = secToHMS(activity.moving_time);
  const elapsedTime = secToHMS(activity.elapsed_time);
  const sportTag = sportTypeToTag(activity.sport_type);

  // フロントマター（daily-note-writing形式準拠: インライン配列、date最後）
  const fmParts: string[] = [
    `title: "${activity.name}"`,
    `tags: ["${sportTag}", "Strava"]`,
    `strava_id: ${activity.id}`,
    `distance_km: ${distKm}`,
    `elapsed_time: "${elapsedTime}"`,
    `moving_time: "${movingTime}"`,
    `elevation_gain_m: ${elevM}`,
    `avg_speed_kmh: ${avgKmh}`,
    `max_speed_kmh: ${maxKmh}`,
  ];

  if (activity.average_heartrate) fmParts.push(`avg_heartrate: ${Math.round(activity.average_heartrate)}`);
  if (activity.max_heartrate) fmParts.push(`max_heartrate: ${Math.round(activity.max_heartrate)}`);
  if (activity.calories) fmParts.push(`calories: ${Math.round(activity.calories)}`);
  if (activity.average_watts) fmParts.push(`avg_watts: ${Math.round(activity.average_watts)}`);
  if (activity.kilojoules) fmParts.push(`kilojoules: ${Math.round(activity.kilojoules)}`);

  fmParts.push(`date: ${date}`);

  // サマリーテーブル
  const rows: [string, string][] = [
    ["距離", `${distKm} km`],
    ["走行時間（停止除く）", movingTime],
    ["経過時間", elapsedTime],
    ["獲得標高", `${elevM} m`],
    ["平均速度", `${avgKmh} km/h`],
    ["最高速度", `${maxKmh} km/h`],
  ];

  if (activity.average_heartrate) rows.push(["平均心拍数", `${Math.round(activity.average_heartrate)} bpm`]);
  if (activity.max_heartrate) rows.push(["最高心拍数", `${Math.round(activity.max_heartrate)} bpm`]);
  if (activity.calories) rows.push(["消費カロリー", `${Math.round(activity.calories)} kcal`]);
  if (activity.average_watts) rows.push(["平均パワー", `${Math.round(activity.average_watts)} W`]);
  if (activity.kilojoules) rows.push(["仕事量", `${Math.round(activity.kilojoules)} kJ`]);
  if (activity.achievement_count > 0) rows.push(["達成数", `${activity.achievement_count} 件`]);

  const tableRows = rows.map(([k, v]) => `| ${k} | ${v} |`).join("\n");

  const descSection = activity.description?.trim()
    ? `\n## メモ\n\n${activity.description.trim()}\n`
    : "";

  const content = `---
${fmParts.join("\n")}
---

# ${activity.name}

## 走行サマリー

| 項目 | 値 |
|---|---|
${tableRows}

[Stravaで見る](https://www.strava.com/activities/${activity.id})
${descSection}`;

  const safeName = sanitizeFilename(activity.name);
  const filename = `${date}_${safeName}.md`;
  const filepath = join(RIDES_DIR, filename);

  return { content, filename, filepath };
}

export function saveNote(activity: Activity): NoteResult {
  const result = generateNote(activity);
  if (!existsSync(RIDES_DIR)) {
    mkdirSync(RIDES_DIR, { recursive: true });
  }
  writeFileSync(result.filepath, result.content, "utf-8");
  return result;
}
