# Homepage Editing Notes

`index.html` must be edited as UTF-8.

Rules for future edits:

1. Only make minimal targeted edits to links/cards/buttons that need updating.
2. Do not rewrite the whole file through tools/workflows that may re-encode Traditional Chinese text.
3. Before editing, verify the file renders correct Chinese with a UTF-8 read.
4. After editing, verify these strings still display correctly:
   - `腓利門電子報`
   - `腓利門出版品`
   - `最新一期電子報`
   - `Latest Issues`
5. When syncing from a known-good copy, prefer raw file copy over text transcoding.
6. If a clean deploy clone exists, use it as the source of truth for homepage publishing.

Recommended workflow:

1. Read with UTF-8.
2. Patch only the needed lines.
3. Re-read with UTF-8.
4. Confirm homepage Chinese text is still intact.
5. Then deploy.
