const revealNodes = document.querySelectorAll(".reveal");
const floatingBuy = document.querySelector(".floating-buy");
const heroBook = document.querySelector(".hero-book");
const hero = document.querySelector(".hero");
const previewSection = document.querySelector(".preview-section");
const previewStrip = document.querySelector(".preview-strip");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  {
    threshold: 0.14,
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
  const translateY = progress * 18;
  const rotate = -4 + progress * 3;
  const scale = 1 - progress * 0.035;
  heroBook.style.transform = `translateY(${translateY}px) rotate(${rotate}deg) scale(${scale})`;
};

const onScroll = () => {
  updateFloatingBuy();
  updateHeroMotion();
};

const isMobilePreview = () => window.matchMedia("(max-width: 768px)").matches;

let previewToggle = null;
let previewLightbox = null;
let previewLightboxImage = null;

const updatePreviewToggleLabel = () => {
  if (!previewSection || !previewToggle) return;
  const expanded = previewSection.classList.contains("is-expanded");
  previewToggle.textContent = expanded ? "\u6536\u5408\u9810\u89bd" : "\u986f\u793a\u5168\u90e8 40 \u5f35";
  previewToggle.setAttribute("aria-expanded", String(expanded));
};

const closePreviewLightbox = () => {
  if (!previewLightbox || !previewLightboxImage) return;
  previewLightbox.hidden = true;
  previewLightboxImage.src = "";
  previewLightboxImage.alt = "";
  document.body.style.overflow = "";
};

const openPreviewLightbox = (image) => {
  if (!previewLightbox || !previewLightboxImage || isMobilePreview()) return;
  previewLightboxImage.src = image.currentSrc || image.src;
  previewLightboxImage.alt = image.alt || "";
  previewLightbox.hidden = false;
  document.body.style.overflow = "hidden";
};

const setupPreviewGallery = () => {
  if (!previewSection || !previewStrip) return;

  previewToggle = document.createElement("button");
  previewToggle.className = "preview-toggle";
  previewToggle.type = "button";

  const previewActions = document.createElement("div");
  previewActions.className = "preview-actions";
  previewActions.appendChild(previewToggle);
  previewSection.appendChild(previewActions);

  previewLightbox = document.createElement("div");
  previewLightbox.className = "preview-lightbox";
  previewLightbox.hidden = true;
  previewLightbox.innerHTML = `
    <button class="preview-lightbox-close" type="button" aria-label="Close preview">x</button>
    <div class="preview-lightbox-backdrop"></div>
    <figure class="preview-lightbox-figure">
      <img class="preview-lightbox-image" src="" alt="" />
    </figure>
  `;
  document.body.appendChild(previewLightbox);

  previewLightboxImage = previewLightbox.querySelector(".preview-lightbox-image");
  const previewLightboxClose = previewLightbox.querySelector(".preview-lightbox-close");
  const previewLightboxBackdrop = previewLightbox.querySelector(".preview-lightbox-backdrop");

  previewToggle.addEventListener("click", () => {
    previewSection.classList.toggle("is-expanded");
    updatePreviewToggleLabel();
  });

  previewStrip.querySelectorAll(".preview-page img").forEach((image) => {
    image.addEventListener("click", () => openPreviewLightbox(image));
  });

  previewLightboxClose.addEventListener("click", closePreviewLightbox);
  previewLightboxBackdrop.addEventListener("click", closePreviewLightbox);

  updatePreviewToggleLabel();
};

setupPreviewGallery();

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePreviewLightbox();
});

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", () => {
  updateHeroMotion();
  if (isMobilePreview()) closePreviewLightbox();
});

updateFloatingBuy();
updateHeroMotion();
