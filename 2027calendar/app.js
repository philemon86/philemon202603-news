const statusApiUrl =
  "https://philemon-2027-calendar.ppss10103s.chatgpt.site/api/order-status";
const earlyBirdDeadline = new Date("2026-09-10T23:59:59+08:00").getTime();

const previousProducts = [
  { key: "a", label: "A款月曆" },
  { key: "b", label: "B款月曆" },
  { key: "c", label: "C款週曆手冊" },
  { key: "d", label: "D款週曆手冊" },
];

const currentProducts = [
  { key: "calendarA", letter: "A", label: "2027月曆 A款" },
  { key: "calendarB", letter: "B", label: "2027月曆 B款" },
  { key: "weeklyClassic", letter: "C", label: "週曆手冊・經典款" },
  { key: "weeklyTrack", letter: "D", label: "週曆手冊・跑道款" },
  { key: "testimony", letter: "E", label: "臺灣傳教100周年見證集" },
];

const searchInput = document.querySelector("#church-search");
const resultArea = document.querySelector("#result-area");
const recordCount = document.querySelector("#record-count");
const statusInput = document.querySelector("#status-search");
const statusResult = document.querySelector("#status-result");
const countdown = document.querySelector("#countdown");
const countdownExpired = document.querySelector("#countdown-expired");

let orders = [];
let statusTimer;
let statusController;

function normalizeSearch(value) {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("zh-TW")
    .replaceAll("台", "臺")
    .replace(/\s+/g, "");
}

function formatTime(value) {
  return String(value).padStart(2, "0");
}

function updateCountdown() {
  const remaining = Math.max(0, earlyBirdDeadline - Date.now());

  if (remaining === 0) {
    countdown.hidden = true;
    countdownExpired.hidden = false;
    return;
  }

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);

  document.querySelector("#countdown-days").textContent = days;
  document.querySelector("#countdown-hours").textContent = formatTime(hours);
  document.querySelector("#countdown-minutes").textContent =
    formatTime(minutes);
  document.querySelector("#countdown-seconds").textContent =
    formatTime(seconds);
}

function renderStatusPanel(status, text, extraClass = "") {
  resultArea.innerHTML = `
    <div class="status-panel ${extraClass}">
      <small>[ STATUS: ${status} ]</small>
      <p>${text}</p>
    </div>
  `;
}

function createQuantityGrid(order, products, className) {
  const grid = document.createElement("div");
  grid.className = `quantity-grid ${className}`;

  products.forEach((product) => {
    const item = document.createElement("div");
    item.className = "quantity-item";

    const label = document.createElement("span");
    if (product.letter) {
      const letter = document.createElement("b");
      letter.textContent = product.letter;
      label.append(letter, product.label);
    } else {
      label.textContent = product.label;
    }

    const quantity = document.createElement("strong");
    quantity.textContent = Number(order[product.key] ?? 0).toLocaleString(
      "zh-TW",
    );
    const unit = document.createElement("small");
    unit.textContent = "份";
    quantity.append(unit);

    item.append(label, quantity);
    grid.append(item);
  });

  return grid;
}

function renderPreviousResults() {
  const query = normalizeSearch(searchInput.value);
  const queryLength = Array.from(query).length;

  if (queryLength < 2) {
    renderStatusPanel(
      "READY",
      queryLength === 1
        ? "請再輸入一個字，即可開始查詢。"
        : "請輸入至少兩個字，查看四款商品的去年訂購量。",
      "status-ready",
    );
    return;
  }

  const matches = orders.filter((order) =>
    [order.name, order.simplified].some((name) =>
      normalizeSearch(name).includes(query),
    ),
  );

  if (matches.length === 0) {
    renderStatusPanel(
      "NO MATCH",
      "查無符合的教會或祈禱所，請換一個關鍵字再試一次。",
      "status-warning",
    );
    return;
  }

  const visibleMatches = matches.slice(0, 24);
  const wrapper = document.createElement("div");
  wrapper.className = "results";
  wrapper.setAttribute("aria-live", "polite");

  const summary = document.createElement("div");
  summary.className = "result-summary";
  const count = document.createElement("strong");
  count.textContent = `找到 ${matches.length} 筆結果`;
  summary.append(count);

  if (matches.length > visibleMatches.length) {
    const hint = document.createElement("span");
    hint.textContent = `顯示前 ${visibleMatches.length} 筆，請多輸入一字縮小範圍`;
    summary.append(hint);
  }

  const list = document.createElement("div");
  list.className = "church-results";
  visibleMatches.forEach((order) => {
    const article = document.createElement("article");
    article.className = "church-result";
    const heading = document.createElement("h3");
    heading.textContent = order.name;
    article.append(
      heading,
      createQuantityGrid(order, previousProducts, "previous-grid"),
    );
    list.append(article);
  });

  const note = document.createElement("p");
  note.className = "fine-print";
  note.textContent = "未訂購品項顯示為 0；數量依去年彙整資料呈現。";
  wrapper.append(summary, list, note);
  resultArea.replaceChildren(wrapper);
}

function renderOrderStatus(type, payload = null) {
  statusResult.replaceChildren();

  if (type === "idle") {
    const queryLength = Array.from(
      normalizeSearch(statusInput.value),
    ).length;
    statusResult.innerHTML = `
      <div class="status-panel status-ready">
        <small>[ STATUS: WAITING ]</small>
        <p>${
          queryLength > 0
            ? "請再輸入一個字，即可開始模糊搜尋。"
            : "請輸入至少兩個字，系統會顯示可能的名稱。"
        }</p>
      </div>
    `;
    return;
  }

  if (type === "suggestions") {
    const suggestions = payload ?? [];
    const panel = document.createElement("div");
    panel.className = "status-panel status-suggestions";
    panel.setAttribute("role", "status");
    const label = document.createElement("small");
    label.textContent = "[ STATUS: MATCHES ]";
    const copy = document.createElement("p");
    copy.textContent = suggestions.length
      ? "找到以下可能名稱，請選擇一間："
      : "找不到可能名稱，請再輸入更多關鍵字。";
    panel.append(label, copy);

    if (suggestions.length) {
      const list = document.createElement("div");
      list.className = "suggestion-list";
      suggestions.forEach((order) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = order.name;
        button.addEventListener("click", () => {
          statusInput.value = order.name;
          handleStatusInput();
        });
        list.append(button);
      });
      panel.append(list);
    }

    statusResult.append(panel);
    return;
  }

  if (type === "loading") {
    statusResult.innerHTML = `
      <div class="status-panel status-loading" role="status">
        <small>[ STATUS: CHECKING ]</small>
        <p>正在核對預購回覆…</p>
      </div>
    `;
    return;
  }

  if (type === "not-found") {
    statusResult.innerHTML = `
      <div class="status-panel status-warning" role="status">
        <small>[ STATUS: NOT FOUND ]</small>
        <h3>你尚未訂購，請盡速下訂</h3>
        <p>請確認名稱是否與表單填寫內容完全相同。</p>
        <a class="text-link" href="#preorder-form">前往填寫預購表單 ↓</a>
      </div>
    `;
    return;
  }

  if (type === "error") {
    statusResult.innerHTML = `
      <div class="status-panel status-warning" role="status">
        <small>[ STATUS: TEMPORARILY UNAVAILABLE ]</small>
        <p>目前暫時無法查詢，請稍後再試。</p>
      </div>
    `;
    return;
  }

  const success = document.createElement("div");
  success.className = "order-success";
  success.setAttribute("aria-live", "polite");

  const heading = document.createElement("div");
  heading.className = "success-heading";
  const headingCopy = document.createElement("div");
  const status = document.createElement("small");
  status.textContent = "[ STATUS: CONFIRMED ]";
  const title = document.createElement("h3");
  title.textContent = "你已經預購成功";
  headingCopy.append(status, title);
  const church = document.createElement("strong");
  church.textContent = payload.name;
  heading.append(headingCopy, church);

  success.append(
    heading,
    createQuantityGrid(
      payload.quantities,
      currentProducts,
      "current-grid",
    ),
  );
  statusResult.append(success);
}

function hasCompleteChurchName(value) {
  return /(教會|教会|祈禱所|祈祷所)$/u.test(value.trim());
}

function handleStatusInput() {
  window.clearTimeout(statusTimer);
  if (statusController) statusController.abort();

  const rawQuery = statusInput.value.trim();
  const normalizedQuery = normalizeSearch(rawQuery);

  if (Array.from(normalizedQuery).length < 2) {
    renderOrderStatus("idle");
    return;
  }

  const suggestions = orders
    .filter((order) =>
      [order.name, order.simplified].some((name) =>
        normalizeSearch(name).includes(normalizedQuery),
      ),
    )
    .slice(0, 8);
  const exactChurch = orders.find((order) =>
    [order.name, order.simplified].some(
      (name) => normalizeSearch(name) === normalizedQuery,
    ),
  );
  const church =
    exactChurch?.name ??
    (suggestions.length === 1
      ? suggestions[0].name
      : suggestions.length === 0 && hasCompleteChurchName(rawQuery)
        ? rawQuery
        : null);

  if (!church) {
    renderOrderStatus("suggestions", suggestions);
    return;
  }

  statusTimer = window.setTimeout(async () => {
    statusController = new AbortController();
    renderOrderStatus("loading");

    try {
      const response = await fetch(statusApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ church }),
        cache: "no-store",
        signal: statusController.signal,
      });

      if (!response.ok) throw new Error("lookup_failed");
      const payload = await response.json();

      if (!payload.found) {
        renderOrderStatus("not-found");
        return;
      }

      renderOrderStatus("success", payload);
    } catch (error) {
      if (error.name !== "AbortError") renderOrderStatus("error");
    }
  }, 700);
}

searchInput.addEventListener("input", renderPreviousResults);
statusInput.addEventListener("input", handleStatusInput);

updateCountdown();
window.setInterval(updateCountdown, 1000);

fetch("./order-data.json")
  .then((response) => {
    if (!response.ok) throw new Error("資料載入失敗");
    return response.json();
  })
  .then((data) => {
    orders = data;
    recordCount.textContent = `${orders.length} RECORDS`;
    renderPreviousResults();
  })
  .catch(() => {
    recordCount.textContent = "DATA UNAVAILABLE";
    renderStatusPanel(
      "TEMPORARILY UNAVAILABLE",
      "去年訂購資料暫時無法載入，請稍後重新整理。",
      "status-warning",
    );
  });
