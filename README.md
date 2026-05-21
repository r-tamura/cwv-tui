# cwv-tui

AWS CloudWatch Logs を読むためのターミナル UI。

- Log Groups の一覧 + インクリメンタル絞り込み
- Log Streams のドリルダウンとイベント表示
- CloudWatch Logs Insights のクエリ実行

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

## キーバインド

| Key | Action |
|---|---|
| `?` | ショートカット一覧を表示 |
| `↑ / ↓` `j / k` | 1 行上下 |
| `Ctrl+D` / `Ctrl+U` | 半画面下 / 上 |
| `Ctrl+F` / `Ctrl+B` | 一画面下 / 上 |
| `gg` / `G` | 先頭 / 末尾へジャンプ |
| `/` | 絞り込みモード |
| `Enter` | 選択 / 実行 |
| `Esc` / `Backspace` | 戻る / 絞り込み解除 |
| `i` | 現在の Log Group で Insights を開く |
| `r` | 再読込 |
| `q` | 終了 |

> 困ったら `?` を押せばそのときのキーマップが一覧表示されます。

## 必要環境

- Node.js **22 LTS** 以上（Node 20 は 2026/4 で EOL）

## 開発

```bash
pnpm install
pnpm dev -- --profile sandbox       # tsx でホットに起動
pnpm test                           # vitest
pnpm typecheck                      # tsc --noEmit
pnpm build                          # tsup
```

## ライセンス

MIT
