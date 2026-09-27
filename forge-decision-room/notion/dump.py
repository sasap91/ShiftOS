import os, sys, requests, time
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/Desktop/LanGraph/.env"))
H = {"Authorization": f"Bearer {os.getenv('NOTION_TOKEN')}", "Notion-Version": "2022-06-28"}
API = "https://api.notion.com/v1"
PID = sys.argv[1]
MAXDEPTH = int(sys.argv[2]) if len(sys.argv) > 2 else 3


def kids(block_id):
    url = f"{API}/blocks/{block_id}/children?page_size=100"
    out = []
    while url:
        r = requests.get(url, headers=H, timeout=30)
        if r.status_code >= 300:
            print("ERR", r.status_code, r.text[:120]); return out
        d = r.json()
        out += d.get("results", [])
        url = (f"{API}/blocks/{block_id}/children?page_size=100&start_cursor={d['next_cursor']}" if d.get("has_more") else None)
        time.sleep(0.35)
    return out


def text_of(block):
    t = block["type"]
    payload = block.get(t, {})
    rich = payload.get("rich_text", [])
    s = "".join(x.get("plain_text", "") for x in rich)
    if t in ("child_page", "child_database"):
        return f"[{t}] {payload.get('title','')}"
    if t == "table_row":
        cells = payload.get("cells", [])
        return " | ".join("".join(x.get("plain_text", "") for x in c) for c in cells)
    if t == "table":
        return f"[table {payload.get('table_width')} cols]"
    return s


def dump(block_id, depth=0):
    for b in kids(block_id):
        t = b["type"]
        s = text_of(b)
        if s or t in ("divider", "child_page", "child_database", "table"):
            print("  " * depth + f"<{t}> " + (s if t != "divider" else "———"))
        if depth < MAXDEPTH and t in ("table", "column_list", "column", "toggle", "callout"):
            dump(b["id"], depth + 1)


page = requests.get(f"{API}/pages/{PID}", headers=H, timeout=30).json()
title = ""
for v in page.get("properties", {}).values():
    if v.get("type") == "title":
        title = "".join(x.get("plain_text", "") for x in v["title"])
print("TITLE:", title)
print("URL:", page.get("url"))
print("=" * 70)
dump(PID)