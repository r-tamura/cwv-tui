# cwv-tui

[![ci](https://github.com/r-tamura/cwv-tui/actions/workflows/ci.yml/badge.svg)](https://github.com/r-tamura/cwv-tui/actions/workflows/ci.yml)

AWS CloudWatch を読むためのオンコール向けターミナル UI。

- **Dashboard** — YAML 設定で定義したメトリクスを ASCII チャートで一覧、30 秒ごとに自動更新
- **Alarms** — アラーム状態の一覧 + 全モード共通の「赤いものは何件？」バナー
- **Logs** — Log Groups / Streams / Events
- **Logs Insights** — 複数行クエリエディタ + 時間範囲ピッカー
- **Live Tail** — Log Group のリアルタイム追従

## 使い方

```bash
# GitHub から直接実行（npm publish していなくても動く）
npx github:r-tamura/cwv-tui

# プロファイル / リージョン指定
npx github:r-tamura/cwv-tui --profile sandbox --region ap-northeast-1

# タグ指定
npx github:r-tamura/cwv-tui#v0.1.0
```

> 初回起動時は `prepare` スクリプトでビルドが走るため 10〜15 秒ほどかかります。2回目以降は npx キャッシュが効きます。

## 認証

AWS SDK v3 の標準クレデンシャルチェーンを使用します:

1. `--profile <name>` / `--region <name>` CLI フラグ
2. `AWS_PROFILE` / `AWS_REGION` 環境変数
3. `~/.aws/credentials`, `~/.aws/config`
4. EC2/ECS/EKS のロール

## Dashboard 設定 (任意)

`~/.config/cwv-tui/dashboards.yaml` を作成すると、起動時に Dashboard モードがランディング画面になります。設定ファイルが無い場合は v0.2 と同じ Logs-only モードで起動します。

```yaml
defaultDashboard: lambda-prod
dashboards:
  lambda-prod:
    title: Lambda Production
    charts:
      - title: Errors
        namespace: AWS/Lambda
        metric: Errors
        dimensions: { FunctionName: foo-api }
        stat: Sum
        height: 8
        logGroups: [/aws/lambda/foo-api]  # Enter でこの Log Group の Insights へ
      - title: Duration p99
        namespace: AWS/Lambda
        metric: Duration
        dimensions: { FunctionName: foo-api }
        stat: p99
        height: 8
        logGroups: [/aws/lambda/foo-api]
```

`--config <path>` または `$CWV_TUI_CONFIG` で別の設定ファイルを指定できます。

## キーバインド

| Key | Action |
|---|---|
| `?` | ショートカット一覧を表示 |
| `Tab` / `Shift+Tab` | トップレベルモード切替 (Dashboard / Alarms / Logs) |
| `↑ / ↓` `j / k` | 1 行上下 |
| `Ctrl+D` / `Ctrl+U` | 半画面下 / 上 |
| `Ctrl+F` / `Ctrl+B` | 一画面下 / 上 |
| `gg` / `G` | 先頭 / 末尾へジャンプ |
| `/` | 絞り込みモード |
| `Enter` | 選択 / 実行 |
| `Esc` / `Backspace` | 戻る / 絞り込み解除 |
| `i` | 現在の Log Group で Insights を開く |
| `t` | Log Groups: Live Tail / Dashboard・Insights: 時間範囲を変更 (15m / 1h / 6h / 24h / 7d) |
| `Enter` (Insights 編集中) | クエリに改行を挿入 |
| `Ctrl+R` (Insights 編集中) | クエリを実行 |
| `p` (Dashboard) | 自動リフレッシュを一時停止 / 再開 |
| `d` (Dashboard) | 複数ダッシュボード切替 |
| `r` | 再読込 |
| `q` | 終了 |

> 困ったら `?` を押せばそのときのキーマップが一覧表示されます。

## 必要環境

- Node.js **22 LTS** 以上（Node 20 は 2026/4 で EOL）

## 開発

```bash
pnpm install
pnpm dev -- --profile sandbox       # tsx でホットに起動
pnpm demo -- --profile sandbox      # examples/dashboards.yaml 付きで起動 (Dashboard モードのスモーク用)
pnpm test                           # vitest
pnpm typecheck                      # tsc --noEmit
pnpm build                          # tsup
```

`pnpm demo` で読まれる `examples/dashboards.yaml` は Lambda / API Gateway のテンプレ。チャートの `dimensions` を自分の環境のリソース名に書き換えれば即座にデータが流れます (書き換えなくても画面構成は確認可能)。

## ライセンス

MIT
