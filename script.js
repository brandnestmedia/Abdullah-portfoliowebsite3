/* =========================================
   SMOOTH (INERTIAL) SCROLL + ANCHORS
========================================= */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const maxScroll = () => document.documentElement.scrollHeight - innerHeight;

let current = scrollY;
let target = scrollY;
let ticking = false;

function loop() {
  current += (target - current) * 0.09;
  if (Math.abs(target - current) < 0.4) {
    current = target;
    ticking = false;
  }
  scrollTo(0, current);
  if (ticking) requestAnimationFrame(loop);
}

function go(y) {
  if (!ticking) current = scrollY;
  target = Math.max(0, Math.min(y, maxScroll()));
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(loop);
  }
}

if (!reduceMotion) {

  addEventListener("wheel", event => {
    if (event.ctrlKey || event.deltaY === 0) return;
    event.preventDefault();
    let dy = event.deltaY;
    if (event.deltaMode === 1) dy *= 32;
    if (event.deltaMode === 2) dy *= innerHeight;
    go((ticking ? target : scrollY) + dy);
  }, { passive: false });

  addEventListener("scroll", () => {
    if (!ticking) current = target = scrollY;
  }, { passive: true });

}

document.querySelectorAll('a[href^="#"]').forEach(link => {

  link.addEventListener("click", event => {

    const id = link.getAttribute("href");
    const el = id === "#top" ? null : document.querySelector(id);
    if (id !== "#top" && !el) return;

    event.preventDefault();

    const y = el ? el.getBoundingClientRect().top + scrollY : 0;
    reduceMotion ? scrollTo(0, y) : go(y);

  });

});


/* =========================================
   ONLY ONE VIDEO PLAYS AT A TIME
========================================= */

const videos = document.querySelectorAll("video");

videos.forEach(video => {

  video.addEventListener("play", () => {

    videos.forEach(otherVideo => {

      if (otherVideo !== video) {
        otherVideo.pause();
      }

    });

  });

});


/* =========================================
   SCROLL REVEAL
========================================= */

const revealElements = document.querySelectorAll(
  ".project, .service, .about-content, .contact"
);

const revealObserver = new IntersectionObserver(
  entries => {

    entries.forEach(entry => {

      if (!entry.isIntersecting) return;

      requestAnimationFrame(() => requestAnimationFrame(() => {
        entry.target.classList.add("show");
      }));

      revealObserver.unobserve(entry.target);

    });

  },
  {
    threshold: 0.08
  }
);

revealElements.forEach(element => {
  element.classList.add("reveal");
  revealObserver.observe(element);
});


/* =========================================
   CUSTOM CURSOR
========================================= */

const cursor = document.querySelector(".cursor");
const follower = document.querySelector(".cursor-follower");

if (cursor && follower) {

  let mouseX = 0;
  let mouseY = 0;

  let followerX = 0;
  let followerY = 0;


  document.addEventListener("mousemove", event => {

    mouseX = event.clientX;
    mouseY = event.clientY;

    cursor.style.left = `${mouseX}px`;
    cursor.style.top = `${mouseY}px`;

  });


  function animateFollower() {

    followerX += (mouseX - followerX) * 0.12;
    followerY += (mouseY - followerY) * 0.12;

    follower.style.left = `${followerX}px`;
    follower.style.top = `${followerY}px`;

    requestAnimationFrame(animateFollower);

  }

  animateFollower();


  const clickableElements = document.querySelectorAll(
    "a, button, video, .project, .service"
  );


  clickableElements.forEach(element => {

    element.addEventListener("mouseenter", () => {

      follower.style.width = "42px";
      follower.style.height = "42px";

    });


    element.addEventListener("mouseleave", () => {

      follower.style.width = "30px";
      follower.style.height = "30px";

    });

  });

}


/* =========================================
   MARQUEE - FILLS FULL SCREEN, SEAMLESS LOOP
========================================= */

const marqueeTrack = document.querySelector(".marquee div");

if (marqueeTrack) {

  const originalMarquee = marqueeTrack.innerHTML;

  function buildMarquee() {

    marqueeTrack.style.animation = "none";
    marqueeTrack.innerHTML = originalMarquee;

    const setWidth = marqueeTrack.scrollWidth;
    if (!setWidth) return;

    const copies = Math.ceil(window.innerWidth / setWidth) + 1;
    marqueeTrack.innerHTML = originalMarquee.repeat(copies);

    marqueeTrack.style.setProperty("--shift", `-${setWidth}px`);

    marqueeTrack.style.animation = "";
    marqueeTrack.style.animationDuration = `${setWidth / 70}s`;

  }

  buildMarquee();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(buildMarquee);
  }

  let marqueeResize;
  window.addEventListener("resize", () => {
    clearTimeout(marqueeResize);
    marqueeResize = setTimeout(buildMarquee, 200);
  });

}



/* =========================================
   PROGRESS BAR, NAV HIDE, PARALLAX
========================================= */

const navEl = document.querySelector(".nav");
const barEl = document.querySelector(".progress");
const orbEl = document.querySelector(".hero-orb");
const gridEl = document.querySelector(".hero-grid");
let lastY = 0;

function onScroll() {
  const y = scrollY;
  const max = maxScroll();
  barEl.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  if (y > 200 && y > lastY + 4) navEl.classList.add("hide");
  else if (y < lastY - 4 || y <= 200) navEl.classList.remove("hide");
  lastY = y;
  if (y < innerHeight * 1.2 && !reduceMotion) {
    orbEl.style.setProperty("--py", `${y * 0.18}px`);
    gridEl.style.translate = `0 ${y * 0.25}px`;
  }
}

addEventListener("scroll", onScroll, { passive: true });
onScroll();


/* =========================================
   MAGNETIC BUTTONS
========================================= */

if (matchMedia("(hover:hover)").matches && !reduceMotion) {

  document.querySelectorAll(".btn, .nav-cta, .hero-orb").forEach(el => {

    el.addEventListener("mousemove", event => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${(event.clientX - r.left - r.width / 2) * 0.25}px`);
      el.style.setProperty("--my", `${(event.clientY - r.top - r.height / 2) * 0.35}px`);
    });

    el.addEventListener("mouseleave", () => {
      el.style.setProperty("--mx", "0px");
      el.style.setProperty("--my", "0px");
    });

  });

}


/* =========================================
   PAUSE VIDEOS THAT LEAVE THE SCREEN
========================================= */

const videoObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting && !entry.target.paused) entry.target.pause();
  });
});

videos.forEach(video => videoObserver.observe(video));


/* =========================================
   ENTRANCE ANIMATION (RUNS ONCE)
========================================= */

const root = document.documentElement;

if (root.classList.contains("anim")) {

  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

  Promise.race([fontsReady, new Promise(r => setTimeout(r, 500))]).then(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      root.classList.add("play");
      setTimeout(() => root.classList.remove("anim", "play"), 2600);
    }));
  });

}



/* =========================================
   HERO VIDEO PLAYS WITH SCROLL
========================================= */

const heroTrack = document.querySelector(".hero-track");
const heroVideo = document.querySelector(".hero-video");
const heroCopy = document.querySelector(".hero-copy");
const heroMeta = document.querySelector(".hero-meta");

if (heroTrack && heroVideo && !reduceMotion) {

  heroVideo.pause();
  heroVideo.removeAttribute("autoplay");

  let heroP = 0;
  let videoTime = 0;

  function heroProgress() {
    const total = heroTrack.offsetHeight - (heroTrack.querySelector(".hero").offsetHeight || innerHeight);
    const y = -heroTrack.getBoundingClientRect().top;
    heroP = Math.max(0, Math.min(1, total > 0 ? y / total : 0));
  }

  function heroFrame() {

    heroProgress();

    if (heroVideo.duration) {
      const goal = heroP * (heroVideo.duration - 0.05);
      videoTime += (goal - videoTime) * 0.18;
      if (!heroVideo.seeking && Math.abs(heroVideo.currentTime - videoTime) > 0.01) {
        heroVideo.currentTime = videoTime;
      }
    }

    const fade = Math.max(0, 1 - heroP / 0.3);
    heroCopy.style.opacity = fade;
    heroCopy.style.transform = `translateY(${-(1 - fade) * 60}px)`;
    heroMeta.style.opacity = fade;
    heroVideo.style.transform = `scale(${1.12 - heroP * 0.12})`;

    requestAnimationFrame(heroFrame);

  }

  heroFrame();

}



/* =========================================
   MOBILE MENU
========================================= */

const menuBtn = document.querySelector(".menu-btn");

if (menuBtn && navEl) {

  const setMenu = open => {
    navEl.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };

  menuBtn.addEventListener("click", event => {
    event.stopPropagation();
    setMenu(!navEl.classList.contains("open"));
  });

  navEl.querySelectorAll("nav a").forEach(link => link.addEventListener("click", () => setMenu(false)));
  document.addEventListener("click", event => { if (!navEl.contains(event.target)) setMenu(false); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") setMenu(false); });
  addEventListener("scroll", () => navEl.classList.contains("open") && navEl.classList.remove("hide"), { passive: true });

}


/* =========================================
   PHONES: UNLOCK SCROLL VIDEO (iOS NEEDS A PLAY ONCE)
========================================= */

if (heroVideo && !reduceMotion) {

  const prime = () => {
    const p = heroVideo.play();
    if (p && p.then) p.then(() => heroVideo.pause()).catch(() => {});
  };

  heroVideo.addEventListener("loadedmetadata", prime, { once: true });
  addEventListener("touchstart", prime, { once: true, passive: true });

}
