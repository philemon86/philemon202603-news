const galleryData = [
  {
    fileName: "PA017333.JPG",
    english: "Paul, a prisoner of Jesus Christ, and Timothy our brother, unto Philemon our dearly beloved, and fellowlabourer,"
  },
  {
    fileName: "PA017280.JPG",
    english: "And to our beloved Apphia, and Archippus our fellowsoldier, and to the church in thy house:"
  },
  {
    fileName: "PA017282.JPG",
    english: "Grace to you, and peace, from God our Father and the Lord Jesus Christ."
  },
  {
    fileName: "PA017286.JPG",
    english: "I thank my God, making mention of thee always in my prayers,"
  },
  {
    fileName: "PA017295.JPG",
    english: "Hearing of thy love and faith, which thou hast toward the Lord Jesus, and toward all saints;"
  },
  {
    fileName: "PA017302.JPG",
    english: "That the communication of thy faith may become effectual by the acknowledging of every good thing which is in you in Christ Jesus."
  },
  {
    fileName: "PA017321.JPG",
    english: "For we have great joy and consolation in thy love, because the bowels of the saints are refreshed by thee, brother."
  },
  {
    fileName: "PA017326.JPG",
    english: "Wherefore, though I might be much bold in Christ to enjoin thee that which is convenient,"
  },
  {
    fileName: "PA017328.JPG",
    english: "Yet for love's sake I rather beseech thee, being such an one as Paul the aged, and now also a prisoner of Jesus Christ."
  },
  {
    fileName: "PA017343.JPG",
    english: "I beseech thee for my son Onesimus, whom I have begotten in my bonds:"
  },
  {
    fileName: "PA017347.JPG",
    english: "Which in time past was to thee unprofitable, but now profitable to thee and to me:"
  },
  {
    fileName: "PA017351.JPG",
    english: "Whom I have sent again: thou therefore receive him, that is, mine own bowels:"
  },
  {
    fileName: "PA017355.JPG",
    english: "Whom I would have retained with me, that in thy stead he might have ministered unto me in the bonds of the gospel:"
  },
  {
    fileName: "PA017358.JPG",
    english: "But without thy mind would I do nothing; that thy benefit should not be as it were of necessity, but willingly."
  },
  {
    fileName: "PA017364.JPG",
    english: "For perhaps he therefore departed for a season, that thou shouldest receive him for ever;"
  },
  {
    fileName: "PA017366.JPG",
    english: "Not now as a servant, but above a servant, a brother beloved, specially to me, but how much more unto thee, both in the flesh, and in the Lord?"
  },
  {
    fileName: "PA017375.JPG",
    english: "If thou count me therefore a partner, receive him as myself."
  },
  {
    fileName: "PA017380.JPG",
    english: "If he hath wronged thee, or oweth thee ought, put that on mine account;"
  },
  {
    fileName: "PA017385.JPG",
    english: "I Paul have written it with mine own hand, I will repay it: albeit I do not say to thee how thou owest unto me even thine own self besides."
  },
  {
    fileName: "PA017393.JPG",
    english: "Yea, brother, let me have joy of thee in the Lord: refresh my bowels in the Lord."
  },
  {
    fileName: "PA017287.JPG",
    english: "Having confidence in thy obedience I wrote unto thee, knowing that thou wilt also do more than I say."
  },
  {
    fileName: "PA017299.JPG",
    english: "But withal prepare me also a lodging: for I trust that through your prayers I shall be given unto you."
  },
  {
    fileName: "PA017330.JPG",
    english: "There salute thee Epaphras, my fellowprisoner in Christ Jesus;"
  },
  {
    fileName: "PA017344.JPG",
    english: "Marcus, Aristarchus, Demas, Lucas, my fellowlabourers."
  },
  {
    fileName: "PA017391.JPG",
    english: "The grace of our Lord Jesus Christ be with your spirit. Amen."
  }
];

const app = document.getElementById("app");
const heroBackground = document.getElementById("hero-background");
const heroQuote = document.getElementById("hero-quote");
const scrollHint = document.getElementById("scroll-hint");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxClose = document.getElementById("lightbox-close");

function photoFull(fileName) {
  return `./assets/photos/full/${fileName}`;
}

function openLightbox(fileName) {
  lightboxImage.src = photoFull(fileName);
  lightboxImage.alt = fileName;
  lightbox.showModal();
}

function buildSlides() {
  const [hero, ...rest] = galleryData;

  heroBackground.style.backgroundImage = `url('${photoFull(hero.fileName)}')`;
  heroQuote.textContent = hero.english;

  rest.forEach((data, index) => {
    const slide = document.createElement("section");
    slide.className = "slide gallery-slide";
    slide.dataset.file = data.fileName;
    slide.dataset.verse = String(index + 2);

    const background = document.createElement("div");
    background.className = "slide-background";
    background.style.backgroundImage = `url('${photoFull(data.fileName)}')`;
    slide.appendChild(background);

    const shade = document.createElement("div");
    shade.className = "slide-shade";
    slide.appendChild(shade);

    const card = document.createElement("button");
    card.className = "witty-card";
    card.type = "button";
    card.dataset.file = data.fileName;

    const cardHead = document.createElement("div");
    cardHead.className = "card-head";

    const title = document.createElement("h3");
    title.textContent = "PHILEMON";
    cardHead.appendChild(title);

    const verseRef = document.createElement("span");
    verseRef.className = "verse-ref";
    verseRef.textContent = `Verse ${index + 2}`;
    cardHead.appendChild(verseRef);

    card.appendChild(cardHead);

    const english = document.createElement("p");
    english.className = "witty-english";
    english.textContent = data.english;
    card.appendChild(english);

    slide.appendChild(card);
    app.appendChild(slide);

    if (index % 5 === 4) {
      slide.classList.add("slide-break");
    }
  });
}

function bindSlideEffects() {
  const slides = document.querySelectorAll(".gallery-slide");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("is-active", entry.isIntersecting && entry.intersectionRatio > 0.55);
    });
  }, {
    threshold: [0.2, 0.55, 0.8]
  });

  slides.forEach((slide) => observer.observe(slide));
}

scrollHint.addEventListener("click", () => {
  const nextSlide = document.getElementById("first-slide").nextElementSibling;
  if (nextSlide) {
    app.scrollTo({ top: nextSlide.offsetTop, behavior: "smooth" });
  }
});

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-file]");
  if (trigger) {
    openLightbox(trigger.dataset.file);
  }
});

lightboxClose.addEventListener("click", () => lightbox.close());

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    lightbox.close();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox.open) {
    lightbox.close();
  }
});

buildSlides();
bindSlideEffects();
