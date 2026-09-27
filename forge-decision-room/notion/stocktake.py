"""Live FORGE stock-take: list child pages under a parent with last-edited + block counts.

Usage:
  python notion/stocktake.py <parent-page-id>
Lists child pages (recursively one level) and top-level block counts.
"""
import os
import sys
import time

import requests
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/Desktop/LanGraph/.env"))
TOKEN = os.getenv("NOTION_TOKEN")
H = {"Authorization": f"Bearer {TOKEN}", "Notion-Version": "2022-06-28"}
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


def children(block_id):
    out, url = [], f"{API}/blocks/{block_id}/children?page_size=100"
    while url:
        d = get(url)
        if not d:
            break
        out += d.get("results", [])
        url = (
            f"{API}/blocks/{block_id}/children?page_size=100&start_cursor={d['next_cursor']}"
            if d.get("has_more")
            else None
        )
        time.sleep(0.35)
    return out


def title_of(page_id):
    p = get(f"{API}/pages/{page_id}")
    if not p:
        return "(no access)", None
    t = ""
    for v in p.get("properties", {}).values():
        if v.get("type") == "title":
            t = "".join(x.get("plain_text", "") for x in v.get("title", []))
    return t, p.get("last_edited_time")


def count_blocks(page_id):
    n, url = 0, f"{API}/blocks/{page_id}/children?page_size=100"
    while url:
        d = get(url)
        if not d:
            break
        n += len(d.get("results", []))
        url = (
            f"{API}/blocks/{page_id}/children?page_size=100&start_cursor={d['next_cursor']}"
            if d.get("has_more")
            else None
        )
        time.sleep(0.2)
    return n


def main():
    parent = sys.argv[1]
    rows = []
    for blk in children(parent):
        if blk.get("type") != "child_page":
            continue
        cid = blk["id"]
        title = blk["child_page"]["title"]
        meta = get(f"{API}/pages/{cid}")
        edited = meta.get("last_edited_time") if meta else None
        rows.append((edited or "?", title, cid, count_blocks(cid)))
    rows.sort()
    print(f"{'LAST EDITED':22} {'BLOCKS':>6}  {'PAGE ID':36} TITLE")
    for edited, title, cid, n in rows:
        print(f"{edited:22} {n:6d}  {cid:36} {title}")


if __name__ == "__main__":
    main()