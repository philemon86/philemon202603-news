const content = window.rebuildTempleContent;

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function setText(selector, text) {
  const node = qs(selector);
  if (node) node.textContent = text;
}

function paragraphList(items) {
  return items.map((item) => `<p>${item}</p>`).join("");
}

function createExpandable(target, data, label) {
  const node = qs(target);
  if (!node) return;

  const buttonId = `${target.replace("#", "")}-button`;
  const bodyId = `${target.replace("#", "")}-body`;
  node.innerHTML = `
    <div class="summary-text">
      <h3>${data.title || label}</h3>
      <p>${data.summary}</p>
    </div>
    <div id="${bodyId}" class="expanded-body" role="region" aria-labelledby="${buttonId}">
      ${paragraphList(data.body)}
    </div>
    <button id="${buttonId}" class="text-button" type="button" aria-expanded="false" aria-controls="${bodyId}">
      ${label}
    </button>
  `;

  const button = qs("button", node);
  const body = qs(".expanded-body", node);
  button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    body.style.display = expanded ? "none" : "block";
    button.textContent = expanded ? label : "收合內容";
  });
}

function createAccordion(target, items) {
  const node = qs(target);
  if (!node) return;

  node.innerHTML = items.map((item, index) => {
    const buttonId = `${target.replace("#", "")}-trigger-${index}`;
    const panelId = `${target.replace("#", "")}-panel-${index}`;
    return `
      <article class="accordion-item">
        <button id="${buttonId}" class="accordion-trigger" type="button" aria-expanded="false" aria-controls="${panelId}">
          <span>${item.title}</span>
        </button>
        <div id="${panelId}" class="accordion-content" role="region" aria-labelledby="${buttonId}">
          ${paragraphList(item.content)}
        </div>
      </article>
    `;
  }).join("");

  qsa(".accordion-trigger", node).forEach((button) => {
    button.addEventListener("click", () => {
      const panel = qs(`#${button.getAttribute("aria-controls")}`);
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      panel.style.display = expanded ? "none" : "block";
    });
  });
}

function createDialogueBubble(target, speaker, message) {
  const node = qs(target);
  if (!node) return;

  node.innerHTML = `
    <div class="dialogue-bubble" role="note" aria-label="${speaker}的信息摘要">
      <span class="dialogue-speaker">${speaker}</span>
      <p>${message}</p>
    </div>
  `;
}

function createCards() {
  const message = content.haggaiDialogue || content.haggaiCards.map((card) => `${card.title}：${card.caption}`).join("；");
  createDialogueBubble("#haggai-cards", "哈該書說", message);
}

function createVisionPoints() {
  const points = qs("#vision-points");
  const panel = qs("#vision-panel");
  if (!points || !panel) return;

  const positions = [
    [9, 54], [21, 30], [34, 67], [47, 42],
    [58, 18], [68, 61], [81, 36], [90, 72]
  ];

  points.innerHTML = content.zechariahVisionPoints.map((point, index) => `
    <button
      class="vision-point${index === 0 ? " is-active" : ""}"
      type="button"
      style="left:${positions[index][0]}%; top:${positions[index][1]}%;"
      data-word="${point.word}"
      aria-label="${point.word}：${point.title}"
      data-index="${index}">
    </button>
  `).join("");

  function render(index) {
    const point = content.zechariahVisionPoints[index];
    panel.innerHTML = `<h3>${point.title}</h3><p>${point.text}</p>`;
    qsa(".vision-point", points).forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.index) === index);
    });
  }

  qsa(".vision-point", points).forEach((button) => {
    button.addEventListener("click", () => render(Number(button.dataset.index)));
    button.addEventListener("mouseenter", () => render(Number(button.dataset.index)));
  });

  render(0);
}

function createZechariahTabs() {
  const tabs = qs("#zechariah-tabs");
  if (tabs) tabs.innerHTML = "";

  const message = content.zechariahDialogue || content.zechariahModules.map((item) => `${item.title}：${item.content}`).join("；");
  createDialogueBubble("#zechariah-content", "撒迦利亞書說", message);
}

function createBookInfo() {
  const node = qs("#book-info-list");
  if (!node) return;

  node.innerHTML = Object.entries(content.bookInfo).map(([key, value]) => `
    <dt>${key}</dt>
    <dd>${value}</dd>
  `).join("");
}

function createToc() {
  const node = qs("#toc-accordion");
  if (!node) return;

  node.innerHTML = content.toc.map((item, index) => {
    const buttonId = `toc-trigger-${index}`;
    const panelId = `toc-panel-${index}`;
    return `
      <article class="toc-item">
        <button id="${buttonId}" class="toc-trigger" type="button" aria-expanded="false" aria-controls="${panelId}">
          <span>${item.title}</span>
        </button>
        <div id="${panelId}" class="toc-content" role="region" aria-labelledby="${buttonId}">
          <ul>${item.children.map((child) => `<li>${child}</li>`).join("")}</ul>
        </div>
      </article>
    `;
  }).join("");

  qsa(".toc-trigger", node).forEach((button) => {
    button.addEventListener("click", () => {
      const panel = qs(`#${button.getAttribute("aria-controls")}`);
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      panel.style.display = expanded ? "none" : "block";
    });
  });
}

function createRuins() {
  const node = qs("#ruins-field");
  if (!node) return;

  const dots = [
    [12, 76], [19, 42], [25, 66], [34, 22], [38, 84],
    [47, 52], [56, 36], [62, 71], [73, 27], [82, 60],
    [88, 44], [69, 86], [29, 31], [51, 78]
  ];
  node.innerHTML = dots.map(([left, top]) => `<span class="ruin-dot" style="left:${left}%;top:${top}%"></span>`).join("");
}

function observeSections() {
  const items = qsa(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  }, { threshold: 0.25 });

  items.forEach((item) => observer.observe(item));
}

function updateReadingProgress() {
  const bar = qs("#reading-progress-bar");
  if (!bar) return;

  const max = document.documentElement.scrollHeight - window.innerHeight;
  const progress = max > 0 ? window.scrollY / max : 0;
  bar.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
}

function updateParallax() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const scrollY = window.scrollY;
  const book = qs(".floating-book-large");
  const shadow = qs(".floating-shadow");
  if (book) book.style.setProperty("--book-y", `${Math.min(42, scrollY * .035)}px`);
  if (shadow) shadow.style.setProperty("--shadow-y", `${Math.min(18, scrollY * .018)}px`);

  const ruinSection = qs("#desolation");
  if (ruinSection) {
    const rect = ruinSection.getBoundingClientRect();
    const ratio = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
    qsa(".ruin-dot").forEach((dot, index) => {
      const speed = 10 + (index % 5) * 7;
      dot.style.setProperty("--ruin-y", `${Math.max(-18, Math.min(34, ratio * speed))}px`);
    });
  }

  const visionSection = qs("#visions");
  if (visionSection) {
    const rect = visionSection.getBoundingClientRect();
    const ratio = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
    qsa(".vision-point").forEach((point, index) => {
      const speed = 8 + (index % 4) * 6;
      point.style.setProperty("--vision-y", `${Math.max(-32, Math.min(18, -ratio * speed))}px`);
    });
  }
}

function setupMagneticButtons() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  qsa(".magnetic-btn").forEach((button) => {
    button.addEventListener("mousemove", (event) => {
      const rect = button.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * .22;
      const y = (event.clientY - rect.top - rect.height / 2) * .34;
      button.style.setProperty("--magnet-x", `${x}px`);
      button.style.setProperty("--magnet-y", `${y}px`);
    });

    button.addEventListener("mouseleave", () => {
      button.style.setProperty("--magnet-x", "0px");
      button.style.setProperty("--magnet-y", "0px");
    });
  });
}

function setupScrollEffects() {
  let ticking = false;

  function requestTick() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      updateReadingProgress();
      updateParallax();
      ticking = false;
    });
  }

  updateReadingProgress();
  updateParallax();
  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", requestTick);
}

function init() {
  setText("#hero-title", content.hero.title);
  setText("#hero-subtitle", content.hero.subtitle);
  if (qs("#primary-cta")) qs("#primary-cta").href = content.excerpts.purchaseUrl;
  if (qs("#primary-cta-top")) qs("#primary-cta-top").href = content.excerpts.purchaseUrl;

  createRuins();
  createExpandable("#desolation-reading", content.sections.desolation, "深入閱讀");
  createExpandable("#publisher-preface", content.prefaces.publisher, "展開出版序");
  createExpandable("#author-preface", content.prefaces.author, "展開作者序");
  createAccordion("#overview-accordion", content.overview);
  createCards();
  createVisionPoints();
  createZechariahTabs();
  createBookInfo();
  createToc();
  observeSections();
  setupMagneticButtons();
  setupScrollEffects();
}

init();
