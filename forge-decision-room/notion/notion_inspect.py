import os, sys, requests
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/Desktop/LanGraph/.env"))
TOKEN = os.getenv("NOTION_TOKEN")
PID = sys.argv[1] if len(sys.argv) > 1 else "3e707d7f61be81998e73c305997a6eda"
H = {"Authorization": f"Bearer {TOKEN}", "Notion-Version": "2022-06-28"}
API = "https://api.notion.com/v1"


def get(url):
    r = requests.get(url, headers=H, timeout=30)
    print("STATUS", r.status_code, url)
    if r.status_code >= 300:
        print(r.text[:1200])
        sys.exit(1)
    return r.json()


page = get(f"{API}/pages/{PID}")
title = page.get("properties", {}).get("title", {}).get("title", [])
print("TITLE:", "".join(t.get("plain_text", "") for t in title))
print("URL:", page.get("url"))
print("LAST EDITED:", page.get("last_edited_time"))
print("PARENT:", page.get("parent"))

print("\n--- TOP LEVEL BLOCKS ---")
url = f"{API}/blocks/{PID}/children?page_size=100"
count = 0
while url:
    data = get(url)
    for blk in data.get("results", []):
        t = blk["type"]
        rich = blk.get(t, {}).get("rich_text", [])
        text = "".join(x.get("plain_text", "") for x in rich)[:90]
        child = blk.get(t, {}).get("title", "") if t in ("child_page", "child_database") else ""
        print(f"{count:3d} {blk['id']}  {t:22s} {child}{text}")
        count += 1
    url = (f"{API}/blocks/{PID}/children?page_size=100&start_cursor={data['next_cursor']}"
           if data.get("has_more") else None)
print("total blocks:", count)