#!/usr/bin/env bun
/**
 * ride-log CLI — Strava からライドログを取得してObsidianノートを生成
 *
 * Usage:
 *   bun run strava.ts auth                           # 初回OAuth2認証
 *   bun run strava.ts list [--count N]               # アクティビティ一覧
 *   bun run strava.ts latest                         # 最新ライドのノート生成
 *   bun run strava.ts activity <id>                  # 特定アクティビティ
 *   bun run strava.ts range --after DATE --before DATE  # 日付範囲一括取得
 */

import { runAuthFlow } from "./lib/auth";
import { getActivities, getActivity, getActivitiesInRange } from "./lib/api";
import { saveNote } from "./lib/format";

const args = process.argv.slice(2);
const command = args[0];

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      result[key] = args[i + 1] || "true";
      i++;
    }
  }
  return result;
}

function formatActivityLine(a: { id: number; name: string; start_date_local: string; distance: number; sport_type: string }): string {
  const date = a.start_date_local.substring(0, 10);
  const km = (Math.round(a.distance / 10) / 100).toFixed(1);
  return `${date}  ${km.padStart(7)} km  ${a.name}  (ID: ${a.id})`;
}

async function main() {
  switch (command) {
    case "auth": {
      await runAuthFlow();
      break;
    }

    case "list": {
      const opts = parseArgs(args.slice(1));
      const count = parseInt(opts["count"] || "10");
      console.log(`最新 ${count} 件のサイクリングアクティビティ:\n`);
      const activities = await getActivities({ perPage: count });
      if (activities.length === 0) {
        console.log("サイクリングアクティビティが見つかりませんでした。");
      } else {
        for (const a of activities) {
          console.log(formatActivityLine(a));
        }
      }
      break;
    }

    case "latest": {
      console.log("最新のサイクリングアクティビティを取得中...");
      const activities = await getActivities({ perPage: 10 });
      if (activities.length === 0) {
        console.error("サイクリングアクティビティが見つかりませんでした。");
        process.exit(1);
      }
      const latest = activities[0];
      console.log(`取得: ${latest.name} (${latest.start_date_local.substring(0, 10)})`);

      // 詳細データを取得（calories等が一覧では含まれない場合がある）
      const detail = await getActivity(latest.id);
      const result = saveNote(detail);
      console.log(`\nノートを保存しました: ${result.filepath}`);
      break;
    }

    case "activity": {
      const id = parseInt(args[1]);
      if (!id) {
        console.error("使用法: bun run strava.ts activity <strava_id>");
        process.exit(1);
      }
      console.log(`アクティビティ ${id} を取得中...`);
      const activity = await getActivity(id);
      console.log(`取得: ${activity.name} (${activity.start_date_local.substring(0, 10)})`);
      const result = saveNote(activity);
      console.log(`\nノートを保存しました: ${result.filepath}`);
      break;
    }

    case "range": {
      const opts = parseArgs(args.slice(1));
      if (!opts["after"] || !opts["before"]) {
        console.error("使用法: bun run strava.ts range --after YYYY-MM-DD --before YYYY-MM-DD");
        process.exit(1);
      }
      const after = new Date(opts["after"]);
      const before = new Date(opts["before"]);
      // before を当日の末尾に設定
      before.setHours(23, 59, 59, 999);

      console.log(`${opts["after"]} 〜 ${opts["before"]} のアクティビティを取得中...`);
      const activities = await getActivitiesInRange(after, before);

      if (activities.length === 0) {
        console.log("指定期間にサイクリングアクティビティが見つかりませんでした。");
        break;
      }

      console.log(`${activities.length} 件のアクティビティを取得。ノートを生成中...\n`);
      for (const a of activities) {
        // 詳細データを取得
        const detail = await getActivity(a.id);
        const result = saveNote(detail);
        console.log(`  保存: ${result.filename}`);
      }
      console.log(`\n完了: ${activities.length} 件のノートを 51_Rides/ridelog/ に保存しました。`);
      break;
    }

    default: {
      console.log(`
ride-log — Strava ライドログ → Obsidian ノート生成

使用法:
  bun run strava.ts auth                              初回OAuth2認証
  bun run strava.ts list [--count N]                  アクティビティ一覧（デフォルト10件）
  bun run strava.ts latest                            最新ライドのノートを生成
  bun run strava.ts activity <strava_id>              特定アクティビティのノートを生成
  bun run strava.ts range --after DATE --before DATE  日付範囲一括生成（DATE: YYYY-MM-DD）

例:
  bun run strava.ts latest
  bun run strava.ts range --after 2025-10-17 --before 2025-10-20
  bun run strava.ts list --count 20

初回セットアップ:
  1. https://www.strava.com/settings/api でアプリ登録
  2. ~/.config/env/global.env に追記:
       STRAVA_CLIENT_ID=xxxxxx
       STRAVA_CLIENT_SECRET=xxxxxxxxxxxxxxxx
  3. bun run strava.ts auth
`);
    }
  }
}

main().catch((err) => {
  console.error(`エラー: ${err.message}`);
  process.exit(1);
});
