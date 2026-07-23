const products = [
  { key: "a", letter: "A", code: "S040A", label: "A款月曆" },
  { key: "b", letter: "B", code: "S040B", label: "B款月曆" },
  { key: "c", letter: "C", code: "S040C", label: "C款週曆手冊" },
  { key: "d", letter: "D", code: "S040D", label: "D款週曆手冊" },
];

const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#church-search");
const suggestions = document.querySelector("#church-suggestions");
const message = document.querySelector("#lookup-message");
const resultArea = document.querySelector("#result-area");
const recordCount = document.querySelector("#record-count");

let orders = [];
let currentMatches = [];

function normalize(value) {
  return value.trim().toLocaleLowerCase("zh-TW");
}

function setMessage(text = "") {
  message.textContent = text;
  message.hidden = !text;
}

function hideSuggestions() {
  suggestions.hidden = true;
  suggestions.replaceChildren();
  searchInput.setAttribute("aria-expanded", "false");
}

function renderSuggestions() {
  const query = normalize(searchInput.value);
  currentMatches = query
    ? orders
        .filter((order) =>
          order.name.toLocaleLowerCase("zh-TW").includes(query),
        )
        .slice(0, 8)
    : [];

  suggestions.replaceChildren();
  currentMatches.forEach((order) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", "false");

    const name = document.createElement("span");
    name.textContent = order.name;
    const action = document.createElement("small");
    action.textContent = "查看數量";
    button.append(name, action);
    button.addEventListener("click", () => choose(order));
    suggestions.append(button);
  });

  suggestions.hidden = currentMatches.length === 0;
  searchInput.setAttribute(
    "aria-expanded",
    currentMatches.length > 0 ? "true" : "false",
  );
}

function renderPlaceholder() {
  resultArea.innerHTML = `
    <div class="lookup-placeholder">
      <span aria-hidden="true">01—04</span>
      <p>輸入名稱後，即可一次查看 A、B、C、D 四款數量。</p>
    </div>
  `;
}

function renderResult(order) {
  const wrapper = document.createElement("div");
  wrapper.className = "result";
  wrapper.setAttribute("aria-live", "polite");

  const title = document.createElement("div");
  title.className = "result-title";
  const resultLabel = document.createElement("span");
  resultLabel.textContent = "查詢結果";
  const heading = document.createElement("h3");
  heading.textContent = order.name;
  title.append(resultLabel, heading);

  const grid = document.createElement("div");
  grid.className = "product-grid";
  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-topline">
        <span class="product-letter">${product.letter}</span>
        <span class="product-code">${product.code}</span>
      </div>
      <p>${product.label}</p>
      <strong>${Number(order[product.key]).toLocaleString("zh-TW")}<small>份</small></strong>
    `;
    grid.append(card);
  });

  const note = document.createElement("p");
  note.className = "result-note";
  note.textContent = "未訂購的品項顯示為 0；數量依目前彙整資料呈現。";

  const link = document.createElement("a");
  link.className = "continue-link";
  link.href = "#preorder-form";
  link.innerHTML = "繼續填寫預購表單 <span aria-hidden=\"true\">↓</span>";

  wrapper.append(title, grid, note, link);
  resultArea.replaceChildren(wrapper);
}

function choose(order) {
  searchInput.value = order.name;
  setMessage();
  hideSuggestions();
  renderResult(order);
}

searchInput.addEventListener("input", () => {
  setMessage();
  renderPlaceholder();
  renderSuggestions();
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideSuggestions();
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = normalize(searchInput.value);
  const exact = orders.find(
    (order) => order.name.toLocaleLowerCase("zh-TW") === query,
  );
  const result = exact || currentMatches[0];

  if (!query || !result) {
    hideSuggestions();
    renderPlaceholder();
    setMessage(
      query
        ? "查無符合的教會或單位，請換一個關鍵字再試一次。"
        : "請先輸入教會或單位名稱。",
    );
    return;
  }

  choose(result);
});

fetch("./order-data.json")
  .then((response) => {
    if (!response.ok) throw new Error("資料載入失敗");
    return response.json();
  })
  .then((data) => {
    orders = data;
    recordCount.textContent = `${orders.length} 筆資料`;
  })
  .catch(() => {
    recordCount.textContent = "資料暫時無法載入";
    setMessage("訂購資料載入失敗，請稍後重新整理頁面。");
  });
