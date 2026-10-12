# 心事失物招領處

《我的心哪，你為何憂悶？》單頁式書籍介紹網站。純 HTML、CSS、JavaScript，沒有安裝或建置步驟。

## 部署

將此資料夾以小寫名稱 `c297` 放到網站根目錄，網址為 `https://www.philemon.com.tw/c297/`。所有頁面資源使用相對路徑，可在子目錄中部署。GitHub Pages 使用 `philemon86/philemon202603-news` 的 `master` 分支，經既有 Deploy Pages workflow 發布。網域沿用既有設定，已確認 www 網址回傳 HTTP 200。

本機預覽：在 C297 的上一層執行 `python -m http.server 4173`，開啟 `http://localhost:4173/C297/`。

## 內容與資產

- `assets/C297-1.png` 為使用者提供的原始圖片，以位元組相同的檔案直接使用；沒有裁切、重繪或改字。
- 購買連結為 `https://www.pbooks.com.tw/products/c297`。
- 定價 300 與特價 270 共用同一個 `.amount` 字級。
- 文案以使用者提供內容為準；003–007 拾獲地點為配合失物招領概念的情境文案。
- Google Fonts 載入 Noto Sans TC 與 Noto Serif TC，網路不可用時使用本機中文字型。
- 支援手機、桌面、鍵盤導覽、減少動態效果偏好及停用 JavaScript 時的完整閱讀。
- 僅有頁面錨點、漸入及小幅漂浮，沒有測驗、帳戶、聊天室或追蹤程式。
