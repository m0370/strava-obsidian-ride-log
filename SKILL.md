---
name: ride-log
description: >
  Stravaからサイクリングのライドログを取得し、Obsidian Vaultにノートとして保存するスキル。
  Use when: (1) user says "ride-log", "ライドログ", "ライド記録", "ライド保存", "サイクリングログ",
  "ビワイチログ", "Stravaから取得", (2) user wants to save cycling activity to vault,
  (3) user says "最新のライドを保存", "Stravaのデータ", "ライドをノートに".
  NOT for: general fitness tracking, non-cycling activities.
---

# ride-log

StravaからサイクリングのアクティビティデータをAPI経由で取得し、Obsidian Vault の `51_Rides/ridelog/` にMarkdownノートとして保存するスキル。

## 保存先

```
51_Rides/ridelog/YYYY-MM-DD_アクティビティ名.md
```

## CLIコマンド

全コマンドはこのスキルディレクトリで実行:

```bash
cd .claude/skills/ride-log
```

### 認証（初回のみ）

```bash
bun run strava.ts auth
```

ブラウザでStravaのOAuth2認証ページを開き、認証後にトークンを `data/token.json` に保存。

### アクティビティ一覧

```bash
bun run strava.ts list [--count N]
```

最新N件のサイクリングアクティビティを一覧表示（デフォルト10件）。

### 最新ライドを保存

```bash
bun run strava.ts latest
```

直近のサイクリングアクティビティを取得してノートを生成。

### 特定のアクティビティを保存

```bash
bun run strava.ts activity <strava_id>
```

StravaのアクティビティIDを指定してノートを生成。

### 日付範囲一括保存（過去ログ取得）

```bash
bun run strava.ts range --after YYYY-MM-DD --before YYYY-MM-DD
```

例（ビワイチ2025の記録を取得）:

```bash
bun run strava.ts range --after 2025-10-17 --before 2025-10-20
```

## 生成されるノートのフォーマット

```markdown
---
title: "ビワイチ Day1 山科→長浜"
tags: ["サイクリング", "Strava"]
strava_id: 12345678901
distance_km: 128.5
elapsed_time: "6:32:15"
moving_time: "5:48:30"
elevation_gain_m: 845
avg_speed_kmh: 22.1
max_speed_kmh: 48.3
avg_heartrate: 142
max_heartrate: 178
calories: 2850
date: 2026-04-25
---

# ビワイチ Day1 山科→長浜

## 走行サマリー

| 項目 | 値 |
|---|---|
| 距離 | 128.5 km |
...

[Stravaで見る](https://www.strava.com/activities/12345678901)
```

## 初回セットアップ

1. [Strava Developers](https://www.strava.com/settings/api) でアプリを登録
   - Authorization Callback Domain: `localhost`
   - Category: Other
2. `~/.config/env/global.env` に追記:
   ```
   STRAVA_CLIENT_ID=xxxxxx
   STRAVA_CLIENT_SECRET=xxxxxxxxxxxxxxxx
   ```
3. 初回認証:
   ```bash
   cd .claude/skills/ride-log
   bun run strava.ts auth
   ```

## Agentとして使う場合の指示

ユーザーがライドログ保存を依頼したとき:

1. `bun run strava.ts list --count 5` でアクティビティ一覧を確認
2. どのアクティビティを保存するか確認（または `latest` / `range` を使用）
3. 対象を取得して `51_Rides/ridelog/` にノートを生成
4. 生成したノートのパスをユーザーに報告

## ファイル構成

```
.claude/skills/ride-log/
├── SKILL.md              このファイル
├── strava.ts             CLIエントリポイント
├── lib/
│   ├── auth.ts           OAuth2認証・トークン管理
│   ├── api.ts            Strava APIラッパー
│   └── format.ts         Obsidianノート生成
├── data/
│   └── token.json        トークン保存（.gitignore対象）
└── references/
    └── strava-api.md     APIリファレンス
```
