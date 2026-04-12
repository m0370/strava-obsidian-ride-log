/**
 * Strava API wrapper — activity list and detail.
 * Rate limit: 100 req/15min, 1000 req/day
 */

import { getAccessToken } from "./auth";

const BASE = "https://www.strava.com/api/v3";
const RATE_DELAY_MS = 350;

const CYCLING_TYPES = new Set([
  "Ride",
  "VirtualRide",
  "EBikeRide",
  "MountainBikeRide",
  "GravelRide",
]);

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export interface Activity {
  id: number;
  name: string;
  sport_type: string;
  start_date_local: string; // ISO 8601, local time
  distance: number;              // meters
  moving_time: number;           // seconds
  elapsed_time: number;          // seconds
  total_elevation_gain: number;  // meters
  average_speed: number;         // m/s
  max_speed: number;             // m/s
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
  average_watts?: number;
  max_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  description?: string;
  kudos_count: number;
  achievement_count: number;
}

async function apiGet<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 429) {
    throw new Error("Strava APIのレート制限に達しました。数分後に再試行してください。");
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strava API ${res.status}: ${body.slice(0, 300)}`);
  }

  return res.json() as Promise<T>;
}

/**
 * アクティビティ一覧を取得（サイクリング種別のみフィルタ）
 */
export async function getActivities(opts: {
  page?: number;
  perPage?: number;
  after?: Date;
  before?: Date;
} = {}): Promise<Activity[]> {
  const params = new URLSearchParams({
    page: String(opts.page || 1),
    per_page: String(opts.perPage || 30),
  });
  if (opts.after) params.set("after", String(Math.floor(opts.after.getTime() / 1000)));
  if (opts.before) params.set("before", String(Math.floor(opts.before.getTime() / 1000)));

  const activities = await apiGet<Activity[]>(`/athlete/activities?${params}`);
  return activities.filter((a) => CYCLING_TYPES.has(a.sport_type));
}

/**
 * 特定アクティビティの詳細を取得
 */
export async function getActivity(id: number): Promise<Activity> {
  return apiGet<Activity>(`/activities/${id}`);
}

/**
 * 日付範囲内の全アクティビティを取得（ページネーション対応）
 */
export async function getActivitiesInRange(after: Date, before: Date): Promise<Activity[]> {
  const all: Activity[] = [];
  let page = 1;

  while (true) {
    const batch = await getActivities({ page, perPage: 100, after, before });
    all.push(...batch);
    if (batch.length < 100) break;
    page++;
    await sleep(RATE_DELAY_MS);
  }

  return all;
}
