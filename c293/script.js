const revealNodes = document.querySelectorAll(".reveal");
const floatingBuy = document.querySelector(".floating-buy");
const heroBook = document.querySelector(".hero-book");
const hero = document.querySelector(".hero");
const priceCard = document.querySelector("[data-price-card]");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  {
    threshold: 0.16,
    rootMargin: "0px 0px -8% 0px",
  },
);

revealNodes.forEach((node) => revealObserver.observe(node));

const updateFloatingBuy = () => {
  if (!floatingBuy) return;
  floatingBuy.classList.toggle("is-visible", window.scrollY > 420);
};

const updateHeroMotion = () => {
  if (!hero || !heroBook) return;
  const heroHeight = hero.offsetHeight || 1;
  const progress = Math.max(0, Math.min(1, window.scrollY / heroHeight));
  const translateY = progress * 22;
  const rotate = -5 + progress * 4;
  const scale = 1 - progress * 0.04;
  heroBook.style.transform = `translateY(${translateY}px) rotate(${rotate}deg) scale(${scale})`;
};

const initPricing = () => {
  if (!priceCard) return;
  const deadline = priceCard.dataset.deadline;
  if (!deadline) return;

  const deadlineMs = new Date(deadline).getTime();
  if (!Number.isFinite(deadlineMs)) return;

  if (Date.now() > deadlineMs) {
    priceCard.classList.add("is-expired");
  }
};

const onScroll = () => {
  updateFloatingBuy();
  updateHeroMotion();
};

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", updateHeroMotion);

initPricing();
updateFloatingBuy();
updateHeroMotion();
