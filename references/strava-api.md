# Strava API リファレンス

## 認証

- OAuth2, Authorization Code フロー
- Authorization URL: `https://www.strava.com/oauth/authorize`
- Token URL: `https://www.strava.com/oauth/token`
- Scope: `read,activity:read_all`
- Callback Domain: `localhost`（開発用）

## ベースURL

```
https://www.strava.com/api/v3
```

## レート制限

- 100 リクエスト / 15分
- 1000 リクエスト / 日
- 429 が返ったら待機が必要

## 主要エンドポイント

### アクティビティ一覧

```
GET /athlete/activities
```

クエリパラメータ:
- `page` — ページ番号（デフォルト1）
- `per_page` — 1ページあたりの件数（デフォルト30, 最大200）
- `after` — Unix timestamp（この時刻以降）
- `before` — Unix timestamp（この時刻以前）

レスポンス: Activity オブジェクトの配列（詳細取得と比較して一部フィールド省略あり）

### アクティビティ詳細

```
GET /activities/{id}
```

レスポンスの主要フィールド:
- `id` — アクティビティID
- `name` — アクティビティ名
- `sport_type` — 種別（Ride, VirtualRide, EBikeRide, MountainBikeRide, GravelRide 等）
- `start_date_local` — 開始時刻（ローカル時間, ISO 8601）
- `distance` — 距離 (m)
- `moving_time` — 走行時間（停止除く, 秒）
- `elapsed_time` — 経過時間（秒）
- `total_elevation_gain` — 獲得標高 (m)
- `average_speed` — 平均速度 (m/s)
- `max_speed` — 最高速度 (m/s)
- `average_heartrate` — 平均心拍数 (bpm)
- `max_heartrate` — 最高心拍数 (bpm)
- `calories` — 消費カロリー (kcal)
- `average_watts` — 平均パワー (W)
- `max_watts` — 最高パワー (W)
- `weighted_average_watts` — 正規化パワー (W)
- `kilojoules` — 仕事量 (kJ)
- `description` — 説明文
- `kudos_count` — クドス数
- `achievement_count` — 達成数

## サイクリング種別

| sport_type | 説明 |
|---|---|
| Ride | ロードサイクリング（通常） |
| VirtualRide | バーチャルライド（Zwift等） |
| EBikeRide | Eバイク |
| MountainBikeRide | マウンテンバイク |
| GravelRide | グラベルライド |

## 速度換算

- `average_speed` は m/s → km/h に変換: `speed_kmh = speed_mps * 3.6`
