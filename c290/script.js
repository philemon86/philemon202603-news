const revealNodes = document.querySelectorAll(".reveal");
const floatingBuy = document.querySelector(".floating-buy");
const hero = document.querySelector(".hero");
const bookFloat = document.querySelector(".book-float");
const oceans = document.querySelectorAll(".ocean");

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
  if (!hero || !bookFloat) return;

  const heroHeight = hero.offsetHeight || 1;
  const progress = Math.max(0, Math.min(1, window.scrollY / heroHeight));
  const translateY = progress * 26;
  const rotate = -8 + progress * 4;
  const scale = 1 - progress * 0.05;

  bookFloat.style.transform = `translateY(${translateY}px) rotate(${rotate}deg) scale(${scale})`;
};

const updateOceanParallax = () => {
  oceans.forEach((ocean, index) => {
    const speed = (index + 1) * 0.12;
    ocean.style.transform = `translate3d(${window.scrollY * speed * -0.06}px, ${window.scrollY * speed * 0.04}px, 0)`;
  });
};

const onScroll = () => {
  updateFloatingBuy();
  updateHeroMotion();
  updateOceanParallax();
};

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", updateHeroMotion);

updateFloatingBuy();
updateHeroMotion();
updateOceanParallax();
