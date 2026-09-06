"""Transfer the existing GA4 read-only service account to the site's encrypted store.

Run only through the manual workflow. Never print credentials, tokens, or request bodies.
The analytics Worker encrypts the credential with a separately stored runtime AES key.
"""
import json
import os
import urllib.request

payload = os.environ['GA4_SERVICE_ACCOUNT_JSON'].encode('utf-8')
info = json.loads(payload)
assert info.get('type') == 'service_account'
request = urllib.request.Request(
    'https://soonsoon-bible-analytics.ppss10103s.chatgpt.site/api/provision',
    data=payload,
    headers={'Content-Type': 'application/json',
             'Authorization': 'Bearer ' + os.environ['SOONSOON_ANALYTICS_INGEST_KEY']},
    method='POST',
)
with urllib.request.urlopen(request, timeout=60) as response:
    result = json.load(response)
assert result.get('connected') is True
print('Existing GA4 service account connected. No credential values were logged.')
