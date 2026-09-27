"""Rate-limit-safe refresh of a Notion page from a Markdown file.

push.py --mode replace archives children one-by-one without backoff and hits
Notion's 429 rate limit on long pages, leaving the page partially cleared.
This wrapper reuses push.py's markdown converter but adds a delay + retry on
every call, so a refresh either completes or fails loudly without leaving the
page half-empty.

Usage:
  python notion/refresh_page.py --page-id <id> --source <md>
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
THROTTLE = 0.4  # seconds between mutating calls


def call(method: str, url: str, **kw) -> dict:
    """HTTP call with 429 backoff and loud failure on any other error."""
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
    ap.add_argument("--page-id", required=True)
    ap.add_argument("--source", required=True)
    args = ap.parse_args()

    if not TOKEN:
        sys.exit("NOTION_TOKEN missing from ~/Desktop/LanGraph/.env")

    with open(args.source, encoding="utf-8") as fh:
        md = P.strip_leading_h1(fh.read())
    blocks = S.md_to_blocks(md)
    print(f"Parsed {len(blocks)} blocks from {args.source}")

    ids = child_ids(args.page_id)
    print(f"Archiving {len(ids)} existing content blocks ...")
    for bid in ids:
        call("PATCH", f"{API}/blocks/{bid}", json={"archived": True})
        time.sleep(THROTTLE)

    print(f"Appending {len(blocks)} blocks ...")
    for start in range(0, len(blocks), MAX_CHILDREN):
        batch = blocks[start : start + MAX_CHILDREN]
        call("PATCH", f"{API}/blocks/{args.page_id}/children", json={"children": batch})
        time.sleep(THROTTLE)

    print("Done. Open:", f"https://www.notion.so/{args.page_id.replace('-', '')}")


if __name__ == "__main__":
    main()