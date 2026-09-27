import os, requests
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/Desktop/LanGraph/.env"))
TOKEN = os.getenv("NOTION_TOKEN")
H = {"Authorization": f"Bearer {TOKEN}", "Notion-Version": "2022-06-28"}
API = "https://api.notion.com/v1"

r = requests.post(f"{API}/search", headers=H, json={"page_size": 100}, timeout=30)
print("STATUS", r.status_code)
if r.status_code >= 300:
    print(r.text[:800]); raise SystemExit
data = r.json()
print("visible objects:", len(data.get("results", [])))
for o in data.get("results", []):
    t = o.get("object")
    title = ""
    if t == "page":
        props = o.get("properties", {})
        for v in props.values():
            if v.get("type") == "title":
                title = "".join(x.get("plain_text", "") for x in v.get("title", []))
    elif t == "database":
        title = "".join(x.get("plain_text", "") for x in o.get("title", []))
    print(f"{t:9s} {o['id']}  {title[:70]}")