# 傳教100週年紀念衫意向地圖

公開網址：https://www.philemon.com.tw/shirt/

## 2026-11-08 速度優化

**目前 GitHub 前端已上架；Google Apps Script 新版需由擁有者「建立新版本 → 部署」一次。**

- `index.html` 直接包含可輸入的教會／姓氏、11列完整尺寸表與數量加減，不再等待 Google iframe 產生可見的表單。
- 原始深藍紀念衫照片、藏青底「衣」favicon 保留。
- 首頁直接顯示 OpenStreetMap 16張底圖圖磚與281個已定位臺灣教會點；互動地圖 Leaflet 載入成功後自動取代底圖，不阻擋表單。
- 地圖程式從多個 CDN 取得且獨立載入，移除 HTML 中阻擋主程式的外部 Leaflet 腳本與 Google Fonts 字型樣式表。
- `app.js` 在網頁啟動就綁定尺寸互動、非同步讀取601筆教會、啟動 Google Bridge、讀取公開統計；其中一項慢不阻擋其他項目。
- `Code.gs` 的 `doGet(?mode=bridge&nonce=...)` 提供極小型 HTMLService Bridge，透過 MessageChannel 使用 `google.script.run.submitInterest` 寫入私人 Google 試算表。資料真正寫入成功，網站才顯示成功；未接通或失敗不假裝完成。
- 回覆 token 在送出前保存，以相同 token 重試可覆寫而不重複新增。
- Google 端有效教會 ID 清單快取6小時、公開統計快取12秒；公開網頁約23至33秒輪詢一次並在視窗重新顯示時更新。**這是近即時更新，不是 WebSocket 秒級同步。**
- 回覆資料只保留教會、姓氏、各尺寸與件數；**已登記立即計入**（「排除」不計）。
- 調查截止：2027/12/10 23:59（臺灣時間）；超過100件意向評估再製作。

## Google 擁有者要做的最後一步

1. 在 Apps Script 專案「百週年紀念衫意向調查」開啟「程式碼.gs」。
2. 從 [GitHub Code.gs](https://github.com/philemon86/philemon202603-news/blob/master/shirt/apps-script/Code.gs) 點 **Raw**，複製全部，取代原程式碼，儲存。
3. **部署 → 管理部署作業 → 原有網頁應用程式 → 鉛筆編輯 → 版本選「建立新版本」→ 部署**。沿用原本 `/exec`，`shirt/config.js` 不必改。
4. 從正式網站點選教會、姓氏與數量，提交一筆測試；確認試算表新增後，把測試列的 G 欄改為「排除」。

### 驗收

- 打開網頁不會先看到空白表單，11種尺寸馬上能點選加減。
- 預先可見臺灣地圖圖磚與教會標記，Leaflet 之後載入可縮放。
- 選「內湖」應顯示「內湖教會」。
- Google 寫入成功才顯示「登記成功」，然後背景刷新公開統計。
- 若新版 Bridge 不可用，不可宣稱完成；備用 `/exec?mode=form` 可單獨開啟。

資料表（私人）：https://docs.google.com/spreadsheets/d/1YeD69Wnvbwvf76ouee0qbKuwsMgRM491HlErmONOUXc/edit
