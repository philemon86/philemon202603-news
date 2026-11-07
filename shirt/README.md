# 百週年紀念衫｜即時意向地圖

正式網址：<https://www.philemon.com.tw/shirt/>

## 已完成

- 地圖前端：`index.html`、`style.css`、`app.js`、`churches.json`、`config.js`。
- 使用者提供的 Polo 衫與尺寸表原圖已嵌入 `index.html`。
- 用 **zalmunna17@gmail.com** 建立獨立 Google 試算表（非舊版預購回覆表），包含「意向回覆」、「管理說明」、「統計儀表板」。
- 試算表：<https://docs.google.com/spreadsheets/d/1YeD69Wnvbwvf76ouee0qbKuwsMgRM491HlErmONOUXc/edit>
- 已產生包含完整表單的單檔 Google Apps Script `Code.gs`（本次對話可下載）。
- 目前未填入 Apps Script URL，因此網站保持「登記尚未開放」，不接受未保存的登記，也不展示虛擬統計。

## 仍需要 Google 帳號本人授權

Google Drive / Sheets 連線不能建立或部署 Apps Script 網頁應用程式。請使用 **zalmunna17@gmail.com**：

1. 開啟 <https://script.new/>，將本對話提供的 **百週年紀念衫_Google後端_單檔_Code.gs** 全文貼進 `Code.gs`，儲存。
2. 右上角「部署」→「新增部署」→類型「網頁應用程式」，選擇「執行身分：我」及「存取權：所有人」，同意 Google 授權並部署。
3. 取得 `https://script.google.com/macros/s/.../exec` 網址。更新此 Repository 的 `shirt/config.js`，將空的 `scriptUrl` 填入該網址，即啟用公開填寫與統計。

不要開啟整份 Google 試算表的「知道連結的任何人都能檢視」權限；只有 Apps Script 受控公開 API 應被分享。匿名意向資料仍可能因姓氏加上教會而間接識別個人，所以公開姓名需由填寫者自行勾選同意。

## 公開統計規則

- 原始意向：待確認 + 已確認，按教會分布顯示，越多件地圖標記顏色越深。
- 已確認件數：僅 H 欄為「已確認」的件數，101 件即達到再製作意向門檻。
- 排除：H 欄設為「排除」，不列入公開地圖與達標。
- 本調查截止日：2027-12-10 23:59（臺灣時間）。
- 尚非正式購買，不收取款項。
