# 百週年紀念衫｜再製作意向地圖

目標網址：<https://www.philemon.com.tw/shirt/>

## 網頁狀態

前端已建置：`index.html`、`style.css`、`app.js`、`churches.json`、`size-guide.html`、`config.js`。教會清單共有 601 筆，部分座標為概略位置。

**注意：必須部署 Google Apps Script 後端並填入 `config.js` 的 `scriptUrl`，頁面才會開放登記與顯示即時統計。** 在此之前不會使用假數字。

## 進行 Google 後端部署

本對話提供的「百週年紀念衫_即時意向地圖_網站與Google後端.zip」含：
- `shirt/apps-script/Code.gs`：建立內部 Google 試算表、匿名表單接收、審核、公開統計 API
- `shirt/apps-script/Form.html`：互動填寫表單
- 完整安裝步驟 `shirt/README.md`

請使用 `zalmunna17@gmail.com` 登入 <https://script.google.com>、建立專案並貼上兩個程式碼檔案。執行 `setupOnce()`，授權後取得新建試算表網址；部署類型選「網頁應用程式」、執行身分選「我」、誰可以存取選「所有人」。把 `/exec` URL 填入 `config.js`，即可啟用。

## 統計／隱私

- 只填姓氏（可匿名）、稱謂、教會、各尺寸件數，不要求完整姓名、地址、電話或電子郵件。
- 公開名單中的姓氏會經同意且審核後才出現；在小型教會仍可能間接識別身分。
- 提交後的意向件數可在地圖近即時顯示；只有後臺試算表 H 欄選「已確認」的件數計入超過 100 件的製作門檻。
- 不要求登入無法完全防止惡意多次送出；達標數必須經人工核對。
- 截止日 2027-12-10 23:59 臺灣時間；不收費、不構成正式訂單。
