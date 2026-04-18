const revealNodes = document.querySelectorAll(".reveal");
const floatingBuy = document.querySelector(".floating-buy");
const hero = document.querySelector(".hero");
const book = document.querySelector(".book-motion");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.18,
    rootMargin: "0px 0px -8% 0px",
  },
);

revealNodes.forEach((node) => revealObserver.observe(node));

const updateFloatingBuy = () => {
  const trigger = window.scrollY > Math.min(window.innerHeight * 0.6, 420);
  floatingBuy.classList.toggle("is-visible", trigger);
};

const updateHeroMotion = () => {
  if (!hero || !book) return;

  const heroHeight = hero.offsetHeight || 1;
  const progress = Math.max(0, Math.min(1, window.scrollY / heroHeight));
  const translateY = progress * 36;
  const rotate = -10 + progress * 5;
  const scale = 1 - progress * 0.04;

  book.style.transform = `translateY(${translateY}px) rotate(${rotate}deg) scale(${scale})`;
};

const onScroll = () => {
  updateFloatingBuy();
  updateHeroMotion();
};

const scrollToHashTarget = () => {
  const hash = decodeURIComponent(window.location.hash);
  const focusId = new URLSearchParams(window.location.search).get("focus");
  const target = focusId
    ? document.getElementById(focusId)
    : hash
      ? document.querySelector(hash)
      : null;
  if (!target) return;

  window.setTimeout(() => {
    target.scrollIntoView({
      block: "start",
      behavior: "auto",
    });
  }, 120);
};

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", updateHeroMotion);
window.addEventListener("load", scrollToHashTarget);

updateFloatingBuy();
updateHeroMotion();
