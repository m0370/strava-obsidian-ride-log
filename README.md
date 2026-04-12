# strava-obsidian-ride-log

Strava のサイクリングアクティビティを API 経由で取得し、Obsidian Vault に Markdown ノートとして保存する CLI ツールです。[Claude Code](https://claude.ai/code) の Skill として動作します。

## 機能

- 最新ライドのノートを1コマンドで生成
- アクティビティID指定・日付範囲での一括取得
- 心拍数・カロリー・パワー（ワット）など詳細データも取得
- Obsidian の frontmatter 形式で出力（Dataview での集計が可能）

## 必要なもの

- [Bun](https://bun.sh/) v1.0 以上
- Strava アカウント + API アプリ登録

## セットアップ

### 1. Strava API アプリを登録

[Strava Developers](https://www.strava.com/settings/api) でアプリを作成します。

- **Authorization Callback Domain**: `localhost`
- **Category**: Other

Client ID と Client Secret をメモしておきます。

### 2. 認証情報を設定

環境変数として認証情報を設定します。

```bash
export STRAVA_CLIENT_ID=your_client_id
export STRAVA_CLIENT_SECRET=your_client_secret
```

永続化する場合は `~/.config/env/global.env` などに記述してください。

```
STRAVA_CLIENT_ID=123456
STRAVA_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxx
```

### 3. 初回 OAuth2 認証

```bash
bun run strava.ts auth
```

ブラウザで Strava 認証画面が開きます。許可すると `data/token.json` にトークンが保存されます。以降の期限切れは自動でリフレッシュされます。

## 使い方

```bash
# 最新ライドのノートを生成
bun run strava.ts latest

# 特定アクティビティ（ID指定）
bun run strava.ts activity 12345678901

# 日付範囲で一括取得
bun run strava.ts range --after 2025-10-17 --before 2025-10-20

# アクティビティ一覧を表示
bun run strava.ts list [--count N]
```

## 出力先の設定

デフォルトでは `.claude/skills/ride-log/` から4階層上の `51_Rides/ridelog/` にノートを生成します。Obsidian Vault の構成に合わせて環境変数で変更できます。

```bash
export VAULT_ROOT=/path/to/your/obsidian-vault
export RIDES_SUBDIR=MyRides          # デフォルト: 51_Rides/ridelog
```

## 生成されるノートの形式

```markdown
---
title: "しまなみ海道 尾道→今治"
tags: ["サイクリング", "Strava"]
strava_id: 12345678901
distance_km: 71.3
elapsed_time: "4:12:08"
moving_time: "3:31:45"
elevation_gain_m: 912
avg_speed_kmh: 20.2
max_speed_kmh: 52.7
avg_heartrate: 148
max_heartrate: 182
calories: 1740
date: 2026-04-25
---

# しまなみ海道 尾道→今治

## 走行サマリー

| 項目 | 値 |
|---|---|
| 距離 | 71.3 km |
| 走行時間（停止除く） | 3:31:45 |
...

[Stravaで見る](https://www.strava.com/activities/12345678901)
```

## Claude Code Skill として使う

このリポジトリを Obsidian Vault の `.claude/skills/ride-log/` に配置すると、Claude Code から直接操作できます。`SKILL.md` に記載されたトリガーワード（「ライドログ」「最新のライドを保存して」等）で自動実行されます。

## ファイル構成

```
.
├── strava.ts          # CLI エントリポイント
├── lib/
│   ├── auth.ts        # OAuth2 認証・トークン管理
│   ├── api.ts         # Strava API ラッパー
│   └── format.ts      # Obsidian ノート生成
├── data/
│   └── token.json     # トークン保存（.gitignore 対象）
├── references/
│   └── strava-api.md  # Strava API リファレンス
└── SKILL.md           # Claude Code Skill 定義
```

## ライセンス

MIT
