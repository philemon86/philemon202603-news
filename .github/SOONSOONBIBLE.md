# 咻咻查聖經維護

前台仍由 master 的 Deploy Pages 工作流程部署到原網址。原始 bible.csv 不變；core.js 共用於 Web Worker 與匿名統計服務。

## 修改經文

更新 bible.csv 後執行 `node .github/scripts/build_soonsoon_bible_data.mjs`，一併提交 data/manifest.json 與對應經卷 JSON。經文 JSON 以內容雜湊命名，保留穩定全經文 ID。不要直接編輯衍生 JSON。若聖經章節數量改變，也要同步更新統計服務 lib/bible-meta.json 與 core.js。

## 匿名統計服務

Sites 專案 `appgprj_6a9c20ce06a48191a2c6a3686c3ff464`，來源獨立保存於 Sites 的 Git 儲存庫。D1 使用 counts、episodes、dedupe、config、cache 表。管理頁在 `/soonsoonbible/stats/`，伺服器驗證 ADMIN_KEY；金鑰不可放入 Git 或前端。

每日彙總長期保存。短暫操作 ID 不包含使用者 ID、IP 或裝置識別碼；用於避免事件重送、串接單次搜尋與轉換。事件到達时會清理超過兩天的操作 ID。關鍵字會正規化，疑似 email、URL 及長串數字會略去。

複製計數以剪貼簿寫入成功為準，整段複製只計一次操作；每節另有獨立排行。搜尋後轉換只計第一次成功複製。未操作排除最近 30 分鐘的搜尋，且不能視為使用者不滿意。

## GA4

沿用 Property `537269601` 和 Measurement ID `G-ZKC664K4M1`。既有 GitHub Secret `GA4_SERVICE_ACCOUNT_JSON` 經由原 Update SoonSoonBible Rankings 工作流程連接統計服務。

首次連接必須通過 Google 驗證，證明服務帳戶可以讀取這個指定 Property；成功後以 AES-GCM 加密保存，解密金鑰只在 Sites runtime secret。之後不允許未帶 INGEST_KEY 的替換。沒有新增 GA4 Property。管理報表支援任意日期，快取 30 分鐘。服務帳戶金鑰輪替時可用 provision_soonsoon_analytics.py，需另外提供 SOONSOON_ANALYTICS_INGEST_KEY。

事件：bible_search、keyword_search、chapter_view、verse_select、verse_copy、multi_verse_copy、zero_result、search_error、search_action。參數包括 search_id、canonical query、search kind、scope、book、chapter、result_count、copy_format、verse_count、source。GA4 只接收低基數操作參數；搜尋內容與帶查詢字串的 URL 不傳送到 GA4。

管理頁標示 GA4 資料延遲及自新版起累積的精確排行。舊版公開排行榜保留舊 GA4 統計口徑；不等同新的精確匿名資料庫排行。
