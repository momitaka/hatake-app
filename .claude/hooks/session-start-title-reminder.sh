#!/bin/bash
# SessionStart hook: セッションタイトル提案を忘れないためのリマインダーをClaudeのコンテキストに注入する。
# CLAUDE.mdに手順は書いてあるが、Claudeが毎回自発的に思い出せる保証がないため、
# harness側から機械的に強制する（記憶ではなく仕組みで担保する）。
MESSAGE='このセッション開始時、まずチャット冒頭で1行、セッションタイトルの提案を提示すること。手順: (1) 開発ログDB（データソースID: 724aa09b-932b-4384-85d2-d699dbce8230）を「日付」降順で1件取得し、そのセッション番号+1をゼロ埋め3桁で採番する。(2) 本題に対応するNotionタスク管理DBの管理番号（TSK-N）が既にある場合は含める。(3) `#NNN タイトル(TSK-N)` の形式（該当タスクが無ければ(TSK-N)は省略）で1行提示する。他の作業より先に、必ず最初に行うこと。'

python3 - "$MESSAGE" <<'PYEOF'
import json, sys
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": sys.argv[1]
    }
}))
PYEOF
