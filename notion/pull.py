"""Pull a Notion page to markdown-ish text for reading/merging.

Usage: python notion/pull.py <page-id> [outfile]
Prints full rich_text (no truncation) and expands table rows.
"""
import os
import sys
import time

import requests
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/Desktop/LanGraph/.env"))
H = {"Authorization": f"Bearer {os.getenv('NOTION_TOKEN')}", "Notion-Version": "2022-06-28"}
API = "https://api.notion.com/v1"


def get(url):
    for _ in range(6):
        r = requests.get(url, headers=H, timeout=30)
        if r.status_code == 429:
            time.sleep(float(r.json().get("additional_data", {}).get("retry_after", 3)) + 0.5)
            continue
        if r.status_code >= 300:
            return None
        return r.json()
    return None


def rich(payload):
    return "".join(x.get("plain_text", "") for x in payload.get("rich_text", []))


def render(block):
    t = block["type"]
    p = block.get(t, {})
    if t == "table_row":
        return "| " + " | ".join("".join(x.get("plain_text", "") for x in c) for c in p.get("cells", [])) + " |"
    if t == "child_page":
        return f"[child_page] {p.get('title','')}"
    if t in ("divider",):
        return "---"
    if t.startswith("heading"):
        return "#" * int(t[-1]) + " " + rich(p)
    if t == "bulleted_list_item":
        return "- " + rich(p)
    if t == "numbered_list_item":
        return "1. " + rich(p)
    if t == "quote":
        return "> " + rich(p)
    if t == "code":
        return "```\n" + rich(p) + "\n```"
    if t == "to_do":
        return ("[x] " if p.get("checked") else "[ ] ") + rich(p)
    return rich(p)


def main():
    pid = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else None
    lines, url = [], f"{API}/blocks/{pid}/children?page_size=100"
    while url:
        d = get(url)
        if not d:
            break
        for b in d.get("results", []):
            lines.append(render(b))
        url = (
            f"{API}/blocks/{pid}/children?page_size=100&start_cursor={d['next_cursor']}"
            if d.get("has_more")
            else None
        )
        time.sleep(0.25)
    text = "\n".join(lines)
    if out:
        open(out, "w", encoding="utf-8").write(text)
        print(f"wrote {len(lines)} blocks -> {out}")
    else:
        print(text)


if __name__ == "__main__":
    main()