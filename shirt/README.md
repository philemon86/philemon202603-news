# 傳教100週年紀念衫｜教會登記統計表

網址：https://www.philemon.com.tw/shirt/

## 2026-11-08 調整

- 預設顯示**統計表**：各教會名稱與合計件數，依件數排序，無公開姓氏、回覆代碼或個別紀錄。按「查看地圖」才載入互動地圖，減少首頁負擔。
- 上方顯示「目前有 X 人訂購 X 件」。**人數技術定義為有效且未排除的不同回覆代碼數**，不代表已驗證的真實個人數或正式付費訂單。
- 登記只填教會、姓氏（私人資料、不公開）及尺寸件數。姓氏僅供書房內部整理、查詢同姓登記參考，不做身分認證，也不能以此確保一人只登記一次。
- **截止日期：2026/12/10 23:59（Asia/Taipei）**。101件意向為再製作評估門檻。
- 新 Google API `publicStats_()` 僅回傳 `total`、`people`、`churches` 與 `updatedAt`，不再包含 `recent` 或 `surname`。新快取鍵為 `shirt_public_v3`。
- 管理試算表仍保持非公開，異常回覆可在 G 欄標「排除」。

## 必須進行的 Apps Script 版本更新（隱私重要）

GitHub 網頁已更新；**原 Google Apps Script 部署仍可能使用舊版 `publicStats_()`，它會將姓氏回傳給網路請求者。** 單純在前端隱藏姓氏，無法防止舊公開端點暴露資料。

1. 使用 `zalmunna17@gmail.com` 開啟已存在的 Apps Script 專案「百週年紀念衫意向調查」。
2. 複製 [新版 Code.gs](https://github.com/philemon86/philemon202603-news/blob/master/shirt/apps-script/Code.gs) 的 Raw 全文，取代原「程式碼.gs」，儲存。
3. 「部署 → 管理部署作業 → 原部署 → 鉛筆編輯 → 建立新版本 → 部署」。沿用原 `/exec`，GitHub `shirt/config.js` 不用更動。
4. 驗證公開 JSONP 回傳只有 `total/people/churches/updatedAt`，並測試送出1件、管理試算表回覆筆數與上方統計一致。測試資料改「排除」。

管理試算表：https://docs.google.com/spreadsheets/d/1YeD69Wnvbwvf76ouee0qbKuwsMgRM491HlErmONOUXc/edit
