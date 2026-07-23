const products = [
  { key: "a", letter: "A", code: "S040A", label: "A款月曆" },
  { key: "b", letter: "B", code: "S040B", label: "B款月曆" },
  { key: "c", letter: "C", code: "S040C", label: "C款週曆手冊" },
  { key: "d", letter: "D", code: "S040D", label: "D款週曆手冊" },
];

const searchInput = document.querySelector("#church-search");
const message = document.querySelector("#lookup-message");
const resultArea = document.querySelector("#result-area");
const recordCount = document.querySelector("#record-count");

let orders = [];

function normalizeSearch(value) {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("zh-TW")
    .replaceAll("台", "臺")
    .replace(/\s+/g, "");
}

function setMessage(text = "") {
  message.textContent = text;
  message.hidden = !text;
}

function renderPlaceholder() {
  resultArea.innerHTML = `
    <div class="lookup-placeholder">
      <span aria-hidden="true">A—D</span>
      <p>輸入名稱關鍵字，即可查看四款商品的訂購數量。</p>
    </div>
  `;
}

function createChurchResult(order) {
  const article = document.createElement("article");
  article.className = "church-result";

  const heading = document.createElement("h3");
  heading.textContent = order.name;

  const grid = document.createElement("div");
  grid.className = "quantity-grid";
  products.forEach((product) => {
    const item = document.createElement("div");
    item.className = "quantity-item";
    item.innerHTML = `
      <span><b>${product.letter}</b>${product.label}</span>
      <strong>${Number(order[product.key]).toLocaleString("zh-TW")}<small>份</small></strong>
    `;
    grid.append(item);
  });

  article.append(heading, grid);
  return article;
}

function renderResults() {
  const query = normalizeSearch(searchInput.value);
  setMessage();

  if (!query) {
    renderPlaceholder();
    return;
  }

  const matches = orders.filter((order) =>
    [order.name, order.simplified].some((name) =>
      normalizeSearch(name).includes(query),
    ),
  );

  if (matches.length === 0) {
    renderPlaceholder();
    setMessage("查無符合的教會或祈禱所，請換一個關鍵字再試一次。");
    return;
  }

  const visibleMatches = matches.slice(0, 24);
  const wrapper = document.createElement("div");
  wrapper.className = "result";
  wrapper.setAttribute("aria-live", "polite");

  const summary = document.createElement("div");
  summary.className = "result-summary";
  const count = document.createElement("strong");
  count.textContent = `找到 ${matches.length} 筆結果`;
  summary.append(count);

  if (matches.length > visibleMatches.length) {
    const hint = document.createElement("span");
    hint.textContent = `目前顯示前 ${visibleMatches.length} 筆，請再多輸入一個字縮小範圍。`;
    summary.append(hint);
  }

  const list = document.createElement("div");
  list.className = "church-results";
  visibleMatches.forEach((order) => list.append(createChurchResult(order)));

  const note = document.createElement("p");
  note.className = "result-note";
  note.textContent = "未訂購的品項顯示為 0；數量依目前彙整資料呈現。";

  const link = document.createElement("a");
  link.className = "continue-link";
  link.href = "#preorder-form";
  link.innerHTML = "繼續填寫預購表單 <span aria-hidden=\"true\">↓</span>";

  wrapper.append(summary, list, note, link);
  resultArea.replaceChildren(wrapper);
}

searchInput.addEventListener("input", renderResults);

fetch("./order-data.json")
  .then((response) => {
    if (!response.ok) throw new Error("資料載入失敗");
    return response.json();
  })
  .then((data) => {
    orders = data;
    recordCount.textContent = `${orders.length} 間教會／祈禱所`;
    renderResults();
  })
  .catch(() => {
    recordCount.textContent = "資料暫時無法載入";
    setMessage("訂購資料載入失敗，請稍後重新整理頁面。");
  });
