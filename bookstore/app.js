const galleryData = [
  {
    fileName: "PA017333.JPG",
    chinese: "為基督耶穌被囚的保羅，同兄弟提摩太寫信給我們所親愛的同工腓利門。",
    english: "Paul, a prisoner of Jesus Christ, and Timothy our brother, unto Philemon our dearly beloved, and fellowlabourer,"
  },
  {
    fileName: "PA017280.JPG",
    chinese: "和妹子亞腓亞，並與我們一同當兵的亞基布，以及在你家中的教會。",
    english: "And to our beloved Apphia, and Archippus our fellowsoldier, and to the church in thy house:"
  },
  {
    fileName: "PA017282.JPG",
    chinese: "願恩惠、平安從神我們的父和主耶穌基督歸與你們。",
    english: "Grace to you, and peace, from God our Father and the Lord Jesus Christ."
  },
  {
    fileName: "PA017286.JPG",
    chinese: "我禱告的時候提到你，常為你感謝我的神。",
    english: "I thank my God, making mention of thee always in my prayers,"
  },
  {
    fileName: "PA017295.JPG",
    chinese: "因聽說你的愛心與信心，是向著主耶穌和眾聖徒的。",
    english: "Hearing of thy love and faith, which thou hast toward the Lord Jesus, and toward all saints;"
  },
  {
    fileName: "PA017302.JPG",
    chinese: "願你因認識基督裡一切美善的事，讓你信心所產生的交通更有功效。",
    english: "That the communication of thy faith may become effectual by the acknowledging of every good thing which is in you in Christ Jesus."
  },
  {
    fileName: "PA017321.JPG",
    chinese: "兄弟啊，我因你的愛心得著大喜樂和安慰，因眾聖徒的心從你得了暢快。",
    english: "For we have great joy and consolation in thy love, because the bowels of the saints are refreshed by thee, brother."
  },
  {
    fileName: "PA017326.JPG",
    chinese: "我雖然靠著基督能放膽吩咐你合宜的事，",
    english: "Wherefore, though I might be much bold in Christ to enjoin thee that which is convenient,"
  },
  {
    fileName: "PA017328.JPG",
    chinese: "然而像我這有年紀、如今又為基督耶穌被囚的保羅，寧可憑著愛心求你。",
    english: "Yet for love's sake I rather beseech thee, being such an one as Paul the aged, and now also a prisoner of Jesus Christ."
  },
  {
    fileName: "PA017343.JPG",
    chinese: "就是為我在捆鎖中所生的兒子阿尼西母求你。",
    english: "I beseech thee for my son Onesimus, whom I have begotten in my bonds:"
  },
  {
    fileName: "PA017347.JPG",
    chinese: "他從前與你沒有益處，但如今與你我都有益處。",
    english: "Which in time past was to thee unprofitable, but now profitable to thee and to me:"
  },
  {
    fileName: "PA017351.JPG",
    chinese: "我現在打發他親自回你那裡去；他是我心上的人。",
    english: "Whom I have sent again: thou therefore receive him, that is, mine own bowels:"
  },
  {
    fileName: "PA017355.JPG",
    chinese: "我本來有意把他留在我這裡，讓他在我為福音所受的捆鎖中替你服事我。",
    english: "Whom I would have retained with me, that in thy stead he might have ministered unto me in the bonds of the gospel:"
  },
  {
    fileName: "PA017358.JPG",
    chinese: "但不知道你的意思，我就不願意這樣做，免得你的善行像是出於勉強，乃是出於甘心。",
    english: "But without thy mind would I do nothing; that thy benefit should not be as it were of necessity, but willingly."
  },
  {
    fileName: "PA017364.JPG",
    chinese: "他暫時離開你，或者正是要使你永遠得著他。",
    english: "For perhaps he therefore departed for a season, that thou shouldest receive him for ever;"
  },
  {
    fileName: "PA017366.JPG",
    chinese: "不再是奴僕，乃是高過奴僕，是親愛的弟兄；於我實在如此，何況於你呢？這不拘是按肉身說，還是在主裡說。",
    english: "Not now as a servant, but above a servant, a brother beloved, specially to me, but how much more unto thee, both in the flesh, and in the Lord?"
  },
  {
    fileName: "PA017375.JPG",
    chinese: "你若以我為同伴，就收納他，如同收納我一樣。",
    english: "If thou count me therefore a partner, receive him as myself."
  },
  {
    fileName: "PA017380.JPG",
    chinese: "他若虧負你，或欠你甚麼，都歸在我的帳上。",
    english: "If he hath wronged thee, or oweth thee ought, put that on mine account;"
  },
  {
    fileName: "PA017385.JPG",
    chinese: "我保羅親筆寫下：我必償還。只是不用對你說，連你自己也是欠了我的。",
    english: "I Paul have written it with mine own hand, I will repay it: albeit I do not say to thee how thou owest unto me even thine own self besides."
  },
  {
    fileName: "PA017393.JPG",
    chinese: "弟兄啊，望你使我在主裡因你得快樂，並使我的心在基督裡得暢快。",
    english: "Yea, brother, let me have joy of thee in the Lord: refresh my bowels in the Lord."
  },
  {
    fileName: "PA017287.JPG",
    chinese: "我寫信給你，深信你必順服，並且知道你所要做的必過於我所說的。",
    english: "Having confidence in thy obedience I wrote unto thee, knowing that thou wilt also do more than I say."
  },
  {
    fileName: "PA017299.JPG",
    chinese: "此外，也請你為我預備住處，因我盼望藉著你們的禱告，必蒙恩到你們那裡去。",
    english: "But withal prepare me also a lodging: for I trust that through your prayers I shall be given unto you."
  },
  {
    fileName: "PA017330.JPG",
    chinese: "在基督耶穌裡與我同坐監的以巴弗問你安。",
    english: "There salute thee Epaphras, my fellowprisoner in Christ Jesus;"
  },
  {
    fileName: "PA017344.JPG",
    chinese: "馬可、亞里達古、底馬、路加，就是我的同工，也都問你安。",
    english: "Marcus, Aristarchus, Demas, Lucas, my fellowlabourers."
  },
  {
    fileName: "PA017391.JPG",
    chinese: "願我們主耶穌基督的恩常在你們心裡。阿們。",
    english: "The grace of our Lord Jesus Christ be with your spirit. Amen."
  }
];

const app = document.getElementById("app");
const heroBackground = document.getElementById("hero-background");
const heroQuote = document.getElementById("hero-quote");
const scrollHint = document.getElementById("scroll-hint");
const loadingScreen = document.getElementById("loading-screen");
const loadingBarFill = document.getElementById("loading-bar-fill");
const loadingProgress = document.getElementById("loading-progress");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxClose = document.getElementById("lightbox-close");
const mobileViewport = window.matchMedia("(max-width: 768px)");

function photoFull(fileName) {
  return `./assets/photos/full/${fileName}`;
}

function photoSlide(fileName) {
  return `./assets/photos/slide/${fileName}`;
}

function openLightbox(fileName) {
  lightboxImage.src = photoFull(fileName);
  lightboxImage.alt = fileName;
  lightbox.showModal();
}

function preloadHeroImage() {
  const hero = galleryData[0];

  loadingBarFill.style.width = "12%";
  loadingProgress.textContent = "Loading...";

  return new Promise((resolve) => {
    const image = new Image();
    const done = () => {
      loadingBarFill.style.width = "100%";
      loadingProgress.textContent = "100%";
      resolve();
    };

    image.onload = done;
    image.onerror = done;
    image.src = photoSlide(hero.fileName);
  });
}

function preloadRemainingSlides() {
  const files = galleryData.slice(1).map((item) => item.fileName);
  let loaded = 0;

  const loadNext = () => {
    if (loaded >= files.length) {
      return;
    }

    const image = new Image();
    image.onload = image.onerror = () => {
      loaded += 1;
      loadNext();
    };
    image.src = photoSlide(files[loaded]);
  };

  loadNext();
}

function buildSlides() {
  const [hero, ...rest] = galleryData;

  heroBackground.style.backgroundImage = `url('${photoSlide(hero.fileName)}')`;
  heroQuote.textContent = "Philemon Bookroom";
  heroQuote.closest(".witty-text").hidden = false;

  rest.forEach((data, index) => {
    const slide = document.createElement("section");
    slide.className = "slide gallery-slide";
    slide.dataset.file = data.fileName;
    slide.dataset.verse = String(index + 2);

    const background = document.createElement("div");
    background.className = "slide-background";
    background.style.backgroundImage = `url('${photoSlide(data.fileName)}')`;
    slide.appendChild(background);

    const shade = document.createElement("div");
    shade.className = "slide-shade";
    slide.appendChild(shade);

    const subtitle = document.createElement("div");
    subtitle.className = "subtitle-overlay";

    const verses = index === 0
      ? [
          { verse: 1, chinese: hero.chinese, english: hero.english },
          { verse: 2, chinese: data.chinese, english: data.english }
        ]
      : [
          { verse: index + 2, chinese: data.chinese, english: data.english }
        ];

    verses.forEach((verseData) => {
      const verseGroup = document.createElement("div");
      verseGroup.className = "subtitle-verse";

      const subtitleRef = document.createElement("div");
      subtitleRef.className = "subtitle-ref";
      subtitleRef.textContent = `PHILEMON ${verseData.verse}`;
      verseGroup.appendChild(subtitleRef);

      const chinese = document.createElement("p");
      chinese.className = "subtitle-line subtitle-zh";
      chinese.textContent = verseData.chinese;
      verseGroup.appendChild(chinese);

      const subtitleEnglish = document.createElement("p");
      subtitleEnglish.className = "subtitle-line subtitle-en";
      subtitleEnglish.textContent = verseData.english;
      verseGroup.appendChild(subtitleEnglish);

      subtitle.appendChild(verseGroup);
    });

    slide.appendChild(subtitle);
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
    app.scrollTo({ left: nextSlide.offsetLeft, behavior: "smooth" });
  }
});

document.addEventListener("click", (event) => {
  if (!mobileViewport.matches) {
    return;
  }

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

preloadHeroImage().then(() => {
  buildSlides();
  bindSlideEffects();
  document.body.classList.remove("is-loading");
  loadingScreen.classList.add("is-hidden");
  window.setTimeout(preloadRemainingSlides, 120);
});
