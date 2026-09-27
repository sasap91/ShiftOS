"""Dump a Notion page (recursively) as readable text.

Usage: python3 dump_page.py <page-id-or-url|search:"query">
"""
import os, sys, requests
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/Desktop/LanGraph/.env"))
TOKEN = os.getenv("NOTION_TOKEN")
H = {"Authorization": f"Bearer {TOKEN}", "Notion-Version": "2022-06-28"}
API = "https://api.notion.com/v1"


def rt(rich):
    return "".join(x.get("plain_text", "") for x in rich)


def blocks(bid, depth=0, out=None):
    if out is None:
        out = []
    url = f"{API}/blocks/{bid}/children?page_size=100"
    while url:
        r = requests.get(url, headers=H, timeout=30)
        if r.status_code >= 300:
            out.append("  " * depth + f"[ERR {r.status_code}] {r.text[:120]}")
            break
        d = r.json()
        for b in d["results"]:
            t = b["type"]
            o = b.get(t, {})
            txt = rt(o.get("rich_text", []))
            if t == "child_page":
                out.append("  " * depth + f"### {o.get('title','')}")
            elif t in ("heading_1", "heading_2", "heading_3"):
                out.append("  " * depth + "#" * int(t[-1]) + " " + txt)
            elif t == "bulleted_list_item":
                out.append("  " * depth + "- " + txt)
            elif t == "numbered_list_item":
                out.append("  " * depth + "1. " + txt)
            elif t == "to_do":
                out.append("  " * depth + f"[{'x' if o.get('checked') else ' '}] " + txt)
            elif t == "code":
                out.append("  " * depth + "```\n" + txt + "\n```")
            elif t == "divider":
                out.append("  " * depth + "---")
            elif t in ("paragraph", "quote", "callout"):
                if txt:
                    out.append("  " * depth + txt)
            elif t == "table_row":
                cells = ["".join(x.get("plain_text", "") for x in c) for c in o.get("cells", [])]
                out.append("  " * depth + " | ".join(cells))
            elif t in ("column_list", "column", "toggle", "synced_block", "template", "table"):
                pass
            else:
                if txt:
                    out.append("  " * depth + f"[{t}] " + txt)
            if b.get("has_children"):
                blocks(b["id"], depth + 1, out)
        url = (f"{API}/blocks/{bid}/children?page_size=100&start_cursor={d['next_cursor']}"
               if d.get("has_more") else None)
    return out


def resolve(arg):
    if arg.startswith("search:"):
        q = arg.split(":", 1)[1]
        r = requests.post(f"{API}/search", headers=H, json={"query": q, "page_size": 10}, timeout=30)
        res = r.json().get("results", [])
        if not res:
            print("no results for", q)
            sys.exit(1)
        return res[0]["id"]
    return arg


if __name__ == "__main__":
    pid = resolve(sys.argv[1] if len(sys.argv) > 1 else "3e107d7f-61be-81d6-a9be-ff34c0fa9bce")
    pg = requests.get(f"{API}/pages/{pid}", headers=H, timeout=30).json()
    print("TITLE:", rt(pg.get("properties", {}).get("title", {}).get("title", [])))
    print("URL:", pg.get("url"))
    print("=" * 70)
    for line in blocks(pid):
        print(line)