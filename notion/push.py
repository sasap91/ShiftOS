"""Push a Markdown doc to Notion: create a child page under a parent, or refresh a page.

Reuses the markdown -> Notion block converter from ~/Desktop/LanGraph/sync_to_notion.py,
with a small non-invasive enhancement: inline *italics* are rendered as Notion italics
(the upstream converter only handles bold/code/links).

Usage:
  # Create a child page under a parent page
  python notion/push.py --child-of <parent-page-id> --title "..." --source <md>

  # Refresh an existing page in place
  python notion/push.py --page-id <id> --source <md> --mode replace
"""
from __future__ import annotations

import argparse
import os
import re
import sys

from dotenv import load_dotenv

LANGRAPH = os.path.expanduser("~/Desktop/LanGraph")
sys.path.insert(0, LANGRAPH)
load_dotenv(os.path.join(LANGRAPH, ".env"))

import sync_to_notion as S  # noqa: E402

# --- enhanced inline converter (adds *italic* support) ---------------------- #
_INLINE = re.compile(
    r"(\*\*.+?\*\*)"            # bold
    r"|(`[^`]+`)"              # inline code
    r"|(\[[^\]]+\]\([^)]+\))"  # link
    r"|(\*[^*\n]+?\*)"         # italic
)


def rich_text(text: str) -> list:
    out: list = []
    pos = 0
    for m in _INLINE.finditer(text):
        if m.start() > pos:
            out += S._plain(text[pos : m.start()])
        tok = m.group(0)
        if tok.startswith("**"):
            out.append(S._text(tok[2:-2], bold=True))
        elif tok.startswith("`"):
            out.append(S._text(tok[1:-1], code=True))
        elif tok.startswith("["):
            lm = re.match(r"\[([^\]]+)\]\(([^)]+)\)", tok)
            label, url = lm.group(1), lm.group(2)
            out.append(S._text(label, link=url) if url.startswith(("http://", "https://")) else S._text(label))
        else:  # *italic*
            t = S._text(tok[1:-1])
            t["annotations"]["italic"] = True
            out.append(t)
        pos = m.end()
    if pos < len(text):
        out += S._plain(text[pos:])
    return out or S._plain("")


S.rich_text = rich_text  # md_to_blocks resolves this at call time


def strip_leading_h1(md: str) -> str:
    lines = md.splitlines()
    while lines and not lines[0].strip():
        lines.pop(0)
    if lines and re.match(r"^#\s+", lines[0]):
        lines.pop(0)
    while lines and not lines[0].strip():
        lines.pop(0)
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--page-id", default=None)
    ap.add_argument("--child-of", default=None)
    ap.add_argument("--title", default="Untitled")
    ap.add_argument("--source", required=True)
    ap.add_argument("--mode", choices=["append", "replace"], default="append")
    ap.add_argument("--keep-title", action="store_true", help="Keep a leading H1 in the body.")
    args = ap.parse_args()

    token = os.getenv("NOTION_TOKEN")
    if not token:
        sys.exit("NOTION_TOKEN missing from ~/Desktop/LanGraph/.env")

    with open(args.source, encoding="utf-8") as fh:
        md = fh.read()
    if not args.keep_title:
        md = strip_leading_h1(md)

    blocks = S.md_to_blocks(md)
    print(f"Parsed {len(blocks)} blocks from {args.source}")

    if args.child_of:
        print(f"Creating child page under {args.child_of} ...")
        page_id = S.create_page(token, args.child_of, args.title)
    elif args.page_id:
        page_id = args.page_id
        if args.mode == "replace":
            print("Archiving existing content blocks ...")
            S.clear_page(token, page_id)
        else:
            blocks = [{"object": "block", "type": "divider", "divider": {}}] + blocks
    else:
        sys.exit("Pass either --page-id or --child-of.")

    print(f"Appending {len(blocks)} blocks to {page_id} ...")
    S.append_blocks(token, page_id, blocks)
    print("Done. Open:", f"https://www.notion.so/{page_id.replace('-', '')}")


if __name__ == "__main__":
    main()