const revealNodes = document.querySelectorAll(".reveal");
const floatingBuy = document.querySelector(".floating-buy");
const heroBook = document.querySelector(".hero-book");
const hero = document.querySelector(".hero");

const showRevealNode = (node) => {
  node.classList.add("is-visible");
};

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        showRevealNode(entry.target);
        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.05,
      rootMargin: "0px 0px 18% 0px",
    },
  );

  revealNodes.forEach((node) => revealObserver.observe(node));
} else {
  revealNodes.forEach(showRevealNode);
}

const updateFloatingBuy = () => {
  if (!floatingBuy) return;
  floatingBuy.classList.toggle("is-visible", window.scrollY > 420);
};

const updateHeroMotion = () => {
  if (!hero || !heroBook) return;
  const heroHeight = hero.offsetHeight || 1;
  const progress = Math.max(0, Math.min(1, window.scrollY / heroHeight));
  const translateY = progress * 24;
  const rotate = -4 + progress * 2;
  const scale = 1 - progress * 0.03;
  heroBook.style.transform = `translateY(${translateY}px) rotate(${rotate}deg) scale(${scale})`;
};

const applyDynamicPricing = () => {
  const deadline = new Date("2026-09-30T23:59:59+08:00");
  const now = new Date();
  const isLimitedOffer = now <= deadline;

  const currentPrice = isLimitedOffer ? "NT$198" : "NT$225";
  const badge = isLimitedOffer ? "79折限時特價" : "恢復特價 NT$225";
  const note = isLimitedOffer
    ? "優惠至 2026/09/30 止。"
    : "目前特價 NT$225。";

  document.querySelectorAll("[data-price-current]").forEach((node) => {
    node.textContent = currentPrice;
  });

  const badgeNode = document.querySelector("[data-price-badge]");
  if (badgeNode) badgeNode.textContent = badge;

  const noteNode = document.querySelector("[data-price-note]");
  if (noteNode) noteNode.textContent = note;
};

const onScroll = () => {
  updateFloatingBuy();
  updateHeroMotion();
};

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", updateHeroMotion);

applyDynamicPricing();
updateFloatingBuy();
updateHeroMotion();
