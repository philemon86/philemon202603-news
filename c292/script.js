const revealNodes = document.querySelectorAll(".reveal");
const floatingBuy = document.querySelector(".floating-buy");
const heroBook = document.querySelector(".hero-book");
const hero = document.querySelector(".hero");

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
  const translateY = progress * 24;
  const rotate = -7 + progress * 4;
  const scale = 1 - progress * 0.04;
  heroBook.style.transform = `translateY(${translateY}px) rotate(${rotate}deg) scale(${scale})`;
};

const carouselRoot = document.querySelector("[data-carousel]");
let activeSlides = [];
let currentIndex = 0;
let autoTimer = null;

const collectActiveSlides = () => {
  activeSlides = [...document.querySelectorAll("[data-slide]")];
};

const renderDots = () => {
  if (!carouselRoot) return;
  const dotsRoot = carouselRoot.querySelector("[data-dots]");
  if (!dotsRoot) return;

  dotsRoot.innerHTML = "";
  activeSlides.forEach((_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "promo-dot";
    button.setAttribute("aria-label", `切換到第 ${index + 1} 張`);
    button.addEventListener("click", () => {
      showSlide(index);
      restartAuto();
    });
    dotsRoot.appendChild(button);
  });
};

const showSlide = (index) => {
  if (!carouselRoot || !activeSlides.length) return;
  currentIndex = ((index % activeSlides.length) + activeSlides.length) % activeSlides.length;

  activeSlides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === currentIndex);
  });

  carouselRoot.querySelectorAll(".promo-dot").forEach((dot, dotIndex) => {
    dot.classList.toggle("is-active", dotIndex === currentIndex);
  });
};

const restartAuto = () => {
  if (autoTimer) window.clearInterval(autoTimer);
  if (activeSlides.length <= 1) return;

  autoTimer = window.setInterval(() => {
    showSlide(currentIndex + 1);
  }, 5000);
};

const initCarousel = () => {
  if (!carouselRoot) return;
  collectActiveSlides();
  if (!activeSlides.length) return;

  renderDots();
  showSlide(0);
  restartAuto();

  const prevButton = carouselRoot.querySelector("[data-prev]");
  const nextButton = carouselRoot.querySelector("[data-next]");

  prevButton?.addEventListener("click", () => {
    showSlide(currentIndex - 1);
    restartAuto();
  });

  nextButton?.addEventListener("click", () => {
    showSlide(currentIndex + 1);
    restartAuto();
  });

  activeSlides.forEach((slide, slideIndex) => {
    slide.addEventListener("click", () => {
      showSlide(slideIndex + 1);
      restartAuto();
    });
  });
};

const pdfViewer = document.querySelector("[data-pdf-viewer]");

const initPdfViewer = () => {
  if (!pdfViewer) return;

  const totalPages = 40;
  const imageBaseUrl = "./assets/pdf-cards/page-";
  const imageExtension = ".jpg";
  const image = pdfViewer.querySelector("[data-pdf-img]");
  const loader = pdfViewer.querySelector("[data-pdf-loader]");
  const loaderText = loader?.querySelector("span");
  const pageDisplay = document.querySelector("[data-current-page]");
  const prevButtons = [
    pdfViewer.querySelector("[data-pdf-prev]"),
    document.querySelector("[data-pdf-prev-btn]"),
  ].filter(Boolean);
  const nextButtons = [
    pdfViewer.querySelector("[data-pdf-next]"),
    document.querySelector("[data-pdf-next-btn]"),
  ].filter(Boolean);
  const cache = new Map();
  let currentPage = 1;
  let requestedPage = 0;

  const imageUrl = (pageNumber) => {
    const pageLabel = String(pageNumber).padStart(3, "0");
    return `${imageBaseUrl}${pageLabel}${imageExtension}`;
  };

  const showLoader = (message = "正在開啟精彩章節...") => {
    if (!loader) return;
    if (loaderText) loaderText.textContent = message;
    loader.classList.remove("is-hidden");
  };

  const hideLoader = () => {
    if (!loader) return;
    loader.classList.add("is-hidden");
  };

  const preloadPage = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages || cache.has(pageNumber)) return;
    const preloadedImage = new Image();
    preloadedImage.decoding = "async";
    preloadedImage.src = imageUrl(pageNumber);
    cache.set(pageNumber, preloadedImage);
  };

  const updateControls = () => {
    if (pageDisplay) pageDisplay.textContent = currentPage;
    prevButtons.forEach((button) => {
      button.classList.toggle("is-disabled", currentPage === 1);
      button.setAttribute("aria-disabled", String(currentPage === 1));
    });
    nextButtons.forEach((button) => {
      button.classList.toggle("is-disabled", currentPage === totalPages);
      button.setAttribute("aria-disabled", String(currentPage === totalPages));
    });
  };

  const updatePage = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages || pageNumber === requestedPage) return;

    requestedPage = pageNumber;
    showLoader();

    const nextImage = new Image();
    nextImage.decoding = "async";
    nextImage.onload = () => {
      if (requestedPage !== pageNumber) return;
      image.src = imageUrl(pageNumber);
      image.alt = `使徒行傳釋義試讀第 ${pageNumber} 頁`;
      currentPage = pageNumber;
      requestedPage = 0;
      updateControls();
      hideLoader();
      preloadPage(currentPage - 1);
      preloadPage(currentPage + 1);
    };
    nextImage.onerror = () => {
      if (requestedPage !== pageNumber) return;
      requestedPage = 0;
      showLoader("內容準備中，請稍後再試");
    };
    nextImage.src = imageUrl(pageNumber);
    cache.set(pageNumber, nextImage);
  };

  const prevPage = () => updatePage(currentPage - 1);
  const nextPage = () => updatePage(currentPage + 1);

  prevButtons.forEach((button) => button.addEventListener("click", prevPage));
  nextButtons.forEach((button) => button.addEventListener("click", nextPage));

  pdfViewer.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      prevPage();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      nextPage();
    }
  });

  pdfViewer.tabIndex = 0;
  updateControls();
  updatePage(1);
};

const onScroll = () => {
  updateFloatingBuy();
  updateHeroMotion();
};

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", updateHeroMotion);

initCarousel();
initPdfViewer();
updateFloatingBuy();
updateHeroMotion();
