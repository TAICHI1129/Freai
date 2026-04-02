import sys
import requests
from bs4 import BeautifulSoup

def main():
    # 標準入力から一行ずつ読み込み
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        if line == "exit":
            break

        # site(URL) 形式の処理
        if line.startswith("site(") and line.endswith(")"):
            url = line[5:-1]
            try:
                # ユーザーエージェントを設定（拒否されにくくするため）
                headers = {
                    "User-Agent": "Mozilla/5.0 (compatible; FreaiBot/1.0;)"
                }
                res = requests.get(url, headers=headers, timeout=10)
                res.raise_for_status()

                # レスポンスのヘッダーからContent-Typeを取得
                content_type = res.headers.get('Content-Type', '').lower()

                if 'text/html' in content_type:
                    # HTMLの場合はBeautifulSoupでパース
                    # ※AIが読みやすいように、特定のタグ（script, style等）を除去する処理を入れるのもアリです
                    soup = BeautifulSoup(res.text, "html.parser")
                    output = str(soup)
                else:
                    # マークダウンやプレーンテキスト、JSONなどの場合はそのままテキストを出力
                    output = res.text

                # Node.js側が受け取れるよう標準出力へ
                print(output)
                sys.stdout.flush() 

            except Exception as e:
                print(f"ERROR: {e}")
                sys.stdout.flush()

if __name__ == "__main__":
    main()