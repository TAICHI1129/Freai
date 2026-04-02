# Freai: Autonomous AI Agent
Freai（フレアイ）は、DeepSeek APIを活用し、自己決定・実行・反省のループを繰り返す自律型エージェントです。Node.jsによるシステム制御とPythonによるウェブブラウジング機能を組み合わせ、OS（Windows/Ubuntu）を問わずBashコマンドを実行する能力を持ちます。

## 主な機能
自律的ループ: 目標設定から実行、成否判定までをAIが自己完結で行います。

ハイブリッド・ツール実行:

Bash: Windows (PowerShell) と Ubuntu (Bash) を自動判別してコマンドを実行。

Web Scraper: Python (BeautifulSoup) を使用した高度なHTML取得。

ライブ・モニタリング: localhost:3000 でAIの思考プロセスをリアルタイムに監視可能。

永続メモリ: すべての思考と実行結果を memory/ フォルダにタイムスタンプ付きで自動保存。

## セットアップ
1. 依存関係のインストール

Node.js:
```Bash
npm install dotenv openai iconv-lite
```

Python:
```Bash
pip install requests beautifulsoup4
```

## Linux (Ubuntu Server) 向けの準備
Ubuntu環境で実行する場合、以下の設定を推奨します。

1. Pythonコマンドの互換性確保
Ubuntuでは標準で python コマンドが存在しない場合があります。以下のパッケージをインストールすることで、Freai内部の spawn("python", ...) が正常に動作するようになります。

```Bash
sudo apt update
sudo apt install -y python-is-python3
```

2. 環境設定
main.js 内の apiKey を自分の DeepSeek API キーに書き換えてください。

```JavaScript
const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: "YOUR_API_KEY_HERE",
});
```

APIキーをコードに直接書かずに管理する場合、プロジェクトルートに .env ファイルを作成してください。

```.env
"API_KEY=キー"
```

3. ディレクトリ構造の準備
memory フォルダを作成し、ログが Git に混入しないよう設定します。

```Bash
mkdir memory
```

📖 使い方
エージェントを起動します：

```Bash
node main.js
```

起動後、ブラウザで以下のURLを開くと、Freaiの思考と実行結果をリアルタイムで確認できます：
http://localhost:3000

📂 プロジェクト構成
main.js: メインの司令塔。AIとの通信、Bash実行、HTTPサーバーを管理。

system.py: ブラウジング専用ツール。URLからHTMLを抽出してNode.jsに返却。

memory/: AIの全活動ログが保存されるディレクトリ。

freai.html: ブラウザ監視用の動的ダッシュボード。

⚠️ セキュリティ警告
Freaiは bash() コマンドを通じてシステムを直接操作する権限を持っています。 意図しないファイル削除やシステム変更を防ぐため、必ず重要なデータのないサンドボックス環境、または仮想マシン（Docker等）での実行を推奨します。

ライセンス
MIT License