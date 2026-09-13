"""Refresh only public music aggregates using the repository's existing GA4 secret."""
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account


def report_payload(days):
    def exact(field, value):
        return {"filter": {"fieldName": field, "stringFilter": {"matchType": "EXACT", "value": value}}}
    return {"dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "yesterday"}],
            "dimensions": [{"name": "customEvent:song_id"}], "metrics": [{"name": "eventCount"}],
            "dimensionFilter": {"andGroup": {"expressions": [exact("eventName", "music_preview"), exact("hostName", "philemon.com.tw"), exact("pagePath", "/music/")]}},
            "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}], "limit": "1000"}


def aggregate(report, known):
    totals = {}
    for row in report.get("rows", []):
        song_id = row.get("dimensionValues", [{}])[0].get("value")
        raw = row.get("metricValues", [{}])[0].get("value", "")
        if song_id not in known or not re.fullmatch(r"\d+", str(raw)):
            continue
        count = int(raw)
        if count > 0:
            totals[song_id] = totals.get(song_id, 0) + count
    return [{"id": key, "count": count} for key, count in sorted(totals.items(), key=lambda item: (-item[1], item[0]))]


def refresh_music_rankings():
    property_id = os.environ["GA4_PROPERTY_ID"]
    if not re.fullmatch(r"\d+", property_id):
        raise RuntimeError("Invalid GA4 property ID")
    info = json.loads(os.environ["GA4_SERVICE_ACCOUNT_JSON"])
    def token(scope):
        credential = service_account.Credentials.from_service_account_info(info, scopes=[scope])
        credential.refresh(Request())
        return credential.token
    read_token = token("https://www.googleapis.com/auth/analytics.readonly")
    read_headers = {"Authorization": "Bearer " + read_token, "Content-Type": "application/json"}
    def call(method, url, headers=read_headers, **kwargs):
        response = requests.request(method, url, headers=headers, timeout=35, **kwargs)
        if not response.ok:
            # Never include response bodies, private account fields, tokens or credentials in logs.
            raise RuntimeError(f"GA4 music request returned HTTP {response.status_code}")
        return response.json()
    admin = f"https://analyticsadmin.googleapis.com/v1beta/properties/{property_id}"
    streams = call("GET", admin + "/dataStreams?pageSize=200").get("dataStreams", [])
    if not any(s.get("webStreamData", {}).get("measurementId") == "G-JD1JHF86H1" for s in streams):
        raise RuntimeError("GA4 property does not match the music measurement ID")
    metadata = call("GET", f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}/metadata")
    if not any(d.get("apiName") == "customEvent:song_id" for d in metadata.get("dimensions", [])):
        dimensions = call("GET", admin + "/customDimensions?pageSize=200").get("customDimensions", [])
        if not any(d.get("parameterName") == "song_id" and d.get("scope") == "EVENT" for d in dimensions):
            edit_token = token("https://www.googleapis.com/auth/analytics.edit")
            call("POST", admin + "/customDimensions", headers={"Authorization": "Bearer " + edit_token, "Content-Type": "application/json"}, json={"parameterName": "song_id", "displayName": "Music song ID", "description": "Original score ID for music_preview events", "scope": "EVENT"})
            print("Music song_id custom dimension registered.")
    text = Path("music/data.js").read_text(encoding="utf-8-sig").strip()
    songs = json.loads(text.removeprefix("window.SCORES=").removesuffix(";"))
    known = {s["id"] for s in songs}
    updated = datetime.now(timezone.utc).isoformat()
    periods = {}
    for days in (7, 30, 90):
        result = call("POST", f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport", json=report_payload(days))
        periods[str(days)] = {"status": "ready", "source": "ga4", "days": days, "updatedAt": updated, "through": "yesterday", "rows": aggregate(result, known)}
    output = Path("music/rankings.json")
    temporary = output.with_suffix(".json.tmp")
    temporary.write_text(json.dumps({"source": "ga4", "updatedAt": updated, "periods": periods}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(output)
    print("Music rankings refreshed for 7, 30 and 90 days.")
    return output
