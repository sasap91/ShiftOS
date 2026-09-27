"""Create-or-refresh a Notion page from a Markdown file, rate-limit safe.

Unlike push.py --child-of (single un-throttled append) or push.py --mode replace
(archives children one-by-one with no backoff), this throttles every call and
backs off on 429, so long pages publish completely or fail loudly.

Usage:
  python notion/sync_page.py --parent <page-id> --title "..." --source <md>
  python notion/sync_page.py --page-id <id> --source <md>          # refresh in place
"""
from __future__ import annotations

import argparse
import os
import sys
import time

import requests
from dotenv import load_dotenv

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.expanduser("~/Desktop/LanGraph"))

load_dotenv(os.path.expanduser("~/Desktop/LanGraph/.env"))
import sync_to_notion as S  # noqa: E402
import push as P  # noqa: E402  (installs the enhanced rich_text converter on S)

TOKEN = os.getenv("NOTION_TOKEN")
API = "https://api.notion.com/v1"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Notion-Version": "2022-06-28"}
MAX_CHILDREN = 100
THROTTLE = 0.4


def call(method: str, url: str, **kw) -> dict:
    for _ in range(10):
        resp = requests.request(method, url, headers=HEADERS, timeout=30, **kw)
        if resp.status_code == 429:
            retry = float(resp.json().get("additional_data", {}).get("retry_after", 3))
            time.sleep(retry + 0.5)
            continue
        if resp.status_code >= 300:
            raise SystemExit(f"Notion API error {resp.status_code}: {resp.text[:300]}")
        return resp.json()
    raise SystemExit("Notion rate limit not cleared after 10 attempts")


def create_page(parent_id: str, title: str) -> str:
    data = call(
        "POST",
        f"{API}/pages",
        json={"parent": {"page_id": parent_id}, "properties": {"title": [{"text": {"content": title}}]}},
    )
    return data["id"]


def child_ids(page_id: str) -> list[str]:
    ids: list[str] = []
    url = f"{API}/blocks/{page_id}/children?page_size=100"
    while url:
        data = call("GET", url)
        for blk in data.get("results", []):
            if blk.get("type") not in {"child_page", "child_database"}:
                ids.append(blk["id"])
        url = (
            f"{API}/blocks/{page_id}/children?page_size=100&start_cursor={data['next_cursor']}"
            if data.get("has_more")
            else None
        )
        time.sleep(THROTTLE)
    return ids


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--page-id", default=None)
    ap.add_argument("--parent", default=None)
    ap.add_argument("--title", default="Untitled")
    ap.add_argument("--source", required=True)
    args = ap.parse_args()

    if not TOKEN:
        sys.exit("NOTION_TOKEN missing from ~/Desktop/LanGraph/.env")
    if not args.page_id and not args.parent:
        sys.exit("Pass --page-id (refresh) or --parent + --title (create).")

    with open(args.source, encoding="utf-8") as fh:
        md = P.strip_leading_h1(fh.read())
    blocks = S.md_to_blocks(md)
    print(f"Parsed {len(blocks)} blocks from {args.source}")

    page_id = args.page_id or create_page(args.parent, args.title)
    print(f"Page {page_id}")

    ids = child_ids(page_id)
    if ids:
        print(f"Archiving {len(ids)} existing blocks ...")
        for bid in ids:
            call("PATCH", f"{API}/blocks/{bid}", json={"archived": True})
            time.sleep(THROTTLE)

    print(f"Appending {len(blocks)} blocks ...")
    for start in range(0, len(blocks), MAX_CHILDREN):
        call("PATCH", f"{API}/blocks/{page_id}/children", json={"children": blocks[start : start + MAX_CHILDREN]})
        time.sleep(THROTTLE)

    print("Done. Open:", f"https://www.notion.so/{page_id.replace('-', '')}")


if __name__ == "__main__":
    main()