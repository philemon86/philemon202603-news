import json
import os
from datetime import datetime, timezone

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account


PROPERTY_ID = os.environ["GA4_PROPERTY_ID"]
OUTPUT_PATH = os.environ.get("RANKINGS_OUTPUT_PATH", "soonsoonbible/rankings.json")
LOOKBACK_DAYS = os.environ.get("GA4_LOOKBACK_DAYS", "30")
SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]


def build_access_token():
    info = json.loads(os.environ["GA4_SERVICE_ACCOUNT_JSON"])
    credentials = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    credentials.refresh(Request())
    return credentials.token


def run_report(token, dimensions, metrics, event_name=None, limit=5):
    payload = {
        "dateRanges": [{"startDate": f"{LOOKBACK_DAYS}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": name} for name in dimensions],
        "metrics": [{"name": name} for name in metrics],
        "limit": limit,
        "orderBys": [{"metric": {"metricName": metrics[0]}, "desc": True}],
    }

    if event_name:
        payload["dimensionFilter"] = {
            "filter": {
                "fieldName": "eventName",
                "stringFilter": {
                    "matchType": "EXACT",
                    "value": event_name,
                },
            }
        }

    response = requests.post(
        f"https://analyticsdata.googleapis.com/v1beta/properties/{PROPERTY_ID}:runReport",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def map_rows(report, label_index=0, metric_index=0):
    items = []
    for row in report.get("rows", []):
        label = row["dimensionValues"][label_index]["value"].strip()
        if not label or label == "(not set)":
            continue

        value = int(float(row["metricValues"][metric_index]["value"]))
        items.append({"label": label, "value": value})
    return items


def main():
    token = build_access_token()

    keyword_report = run_report(
        token,
        dimensions=["customEvent:keyword_query"],
        metrics=["eventCount"],
        event_name="keyword_search",
    )
    chapter_report = run_report(
        token,
        dimensions=["customEvent:chapter_label"],
        metrics=["eventCount"],
        event_name="chapter_view",
    )
    verse_report = run_report(
        token,
        dimensions=["customEvent:verse_label"],
        metrics=["eventCount"],
        event_name="verse_copy",
    )

    rankings = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "dateRangeLabel": f"最近 {LOOKBACK_DAYS} 天",
        "keywordSearchTop5": map_rows(keyword_report),
        "chapterViewTop5": map_rows(chapter_report),
        "verseCopyTop5": map_rows(verse_report),
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(rankings, f, ensure_ascii=True, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
