import json
import os
from datetime import datetime, timedelta, timezone

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account


PROPERTY_ID = os.environ["GA4_PROPERTY_ID"]
RANKINGS_OUTPUT_PATH = os.environ.get("RANKINGS_OUTPUT_PATH", "soonsoonbible/rankings.json")
VISITOR_COUNT_OUTPUT_PATH = os.environ.get("VISITOR_COUNT_OUTPUT_PATH", "soonsoonbible/visitor-count.json")
LOOKBACK_DAYS = os.environ.get("GA4_LOOKBACK_DAYS", "30")
VISITOR_COUNT_START_DATE = os.environ.get("GA4_VISITOR_COUNT_START_DATE", "2026-05-12")
QUALIFIED_VISITOR_START_DATE = os.environ.get("GA4_QUALIFIED_VISITOR_START_DATE", "2026-07-15")
SOONSOON_PAGE_PATH = os.environ.get("GA4_SOONSOON_PAGE_PATH", "/soonsoonbible/")
SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]


def build_access_token():
    info = json.loads(os.environ["GA4_SERVICE_ACCOUNT_JSON"])
    credentials = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    credentials.refresh(Request())
    return credentials.token


def run_report(token, dimensions, metrics, event_name=None, limit=5, date_ranges=None, dimension_filter=None):
    payload = {
        "dateRanges": date_ranges or [{"startDate": f"{LOOKBACK_DAYS}daysAgo", "endDate": "today"}],
        "dimensions": [{"name": name} for name in dimensions],
        "metrics": [{"name": name} for name in metrics],
        "limit": limit,
        "orderBys": [{"metric": {"metricName": metrics[0]}, "desc": True}],
    }

    filters = []
    if event_name:
        filters.append(
            {
                "filter": {
                    "fieldName": "eventName",
                    "stringFilter": {
                        "matchType": "EXACT",
                        "value": event_name,
                    },
                }
            }
        )

    if dimension_filter:
        filters.append(dimension_filter)

    if len(filters) == 1:
        payload["dimensionFilter"] = filters[0]
    elif len(filters) > 1:
        payload["dimensionFilter"] = {"andGroup": {"expressions": filters}}

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


def extract_metric_value(report, metric_index=0):
    rows = report.get("rows", [])
    if not rows:
        return 0
    return int(float(rows[0]["metricValues"][metric_index]["value"]))


def build_string_filter(field_name, value):
    return {
        "filter": {
            "fieldName": field_name,
            "stringFilter": {
                "matchType": "EXACT",
                "value": value,
            },
        }
    }


def day_before(date_text):
    parts = [int(part) for part in date_text.split("-")]
    dt = datetime(parts[0], parts[1], parts[2], tzinfo=timezone.utc)
    previous = dt - timedelta(days=1)
    return previous.date().isoformat()


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
    visitor_report = run_report(
        token,
        dimensions=["eventName"],
        metrics=["totalUsers"],
        event_name="qualified_visitor_counted",
        limit=1,
        date_ranges=[{"startDate": QUALIFIED_VISITOR_START_DATE, "endDate": "today"}],
    )
    baseline_visitor_report = run_report(
        token,
        dimensions=["pagePathPlusQueryString"],
        metrics=["totalUsers"],
        event_name="page_view",
        limit=1,
        date_ranges=[{"startDate": VISITOR_COUNT_START_DATE, "endDate": day_before(QUALIFIED_VISITOR_START_DATE)}],
        dimension_filter=build_string_filter("pagePathPlusQueryString", SOONSOON_PAGE_PATH),
    )

    generated_at = datetime.now(timezone.utc).isoformat()

    rankings = {
        "updatedAt": generated_at,
        "dateRangeLabel": f"最近 {LOOKBACK_DAYS} 天",
        "keywordSearchTop5": map_rows(keyword_report),
        "chapterViewTop5": map_rows(chapter_report),
        "verseCopyTop5": map_rows(verse_report),
    }

    baseline_value = extract_metric_value(baseline_visitor_report)
    qualified_value = extract_metric_value(visitor_report)

    visitor_count = {
        "updatedAt": generated_at,
        "startDate": VISITOR_COUNT_START_DATE,
        "qualifiedStartDate": QUALIFIED_VISITOR_START_DATE,
        "label": "使用人數",
        "baselineValue": baseline_value,
        "qualifiedValue": qualified_value,
        "value": baseline_value + qualified_value,
    }

    with open(RANKINGS_OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(rankings, f, ensure_ascii=True, indent=2)
        f.write("\n")

    with open(VISITOR_COUNT_OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(visitor_count, f, ensure_ascii=True, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
