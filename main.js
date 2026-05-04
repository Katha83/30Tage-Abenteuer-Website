/* ============================================================
   30 TAGE ABENTEUER – main.js
   Lenis · GSAP · ScrollTrigger
   ============================================================ */
(function () {
  'use strict';

  const qs  = (s, ctx = document) => ctx.querySelector(s);
  const qsa = (s, ctx = document) => [...ctx.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. LENIS SMOOTH SCROLL ──────────────────────────── */
  let lenis;
  function initLenis() {
    if (reduced || typeof Lenis === 'undefined') return;
    lenis = new Lenis({ duration: 0.9, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    if (window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }
  }

  /* ── 2. CUSTOM CURSOR ────────────────────────────────── */
  function initCursor() {
    const dot  = qs('#cursor-dot');
    const ring = qs('#cursor-ring');
    if (!dot || !ring || 'ontouchstart' in window) {
      if (dot)  dot.style.display  = 'none';
      if (ring) ring.style.display = 'none';
      document.body.style.cursor = 'auto';
      qsa('a,button,[class*="magnetic"]').forEach(el => el.style.cursor = 'pointer');
      return;
    }
    let mx = 0, my = 0, rx = 0, ry = 0;
    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      gsap.to(dot, { x: mx, y: my, duration: 0.05, ease: 'none' });
    });
    gsap.ticker.add(() => {
      rx += (mx - rx) * 0.1; ry += (my - ry) * 0.1;
      gsap.set(ring, { x: rx, y: ry });
    });
    qsa('a,button,.dest-card,.station-card,.tipp-card,.magnetic').forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('hovering'));
      el.addEventListener('mouseleave', () => ring.classList.remove('hovering'));
    });
    document.addEventListener('mousedown', () => ring.classList.add('clicking'));
    document.addEventListener('mouseup',   () => ring.classList.remove('clicking'));
    document.addEventListener('mouseleave', () => gsap.to([dot,ring], { opacity: 0, duration: .3 }));
    document.addEventListener('mouseenter', () => gsap.to([dot,ring], { opacity: 1, duration: .3 }));
  }

  /* ── 3. MAGNETIC BUTTONS ─────────────────────────────── */
  function initMagnetic() {
    qsa('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width  / 2) * 0.35;
        const dy = (e.clientY - r.top  - r.height / 2) * 0.35;
        gsap.to(el, { x: dx, y: dy, duration: .4, ease: 'power2.out' });
      });
      el.addEventListener('mouseleave', () =>
        gsap.to(el, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,0.4)' }));
    });
  }

  /* ── 4. PRELOADER ────────────────────────────────────── */
  function initPreloader() {
    const pre   = qs('#preloader');
    const logo  = qs('#preloader-logo');
    const count = qs('#preloader-count');
    if (!pre) return;

    const tl = gsap.timeline({ onComplete: () => {
      gsap.to(pre, { opacity: 0, duration: .5, ease: 'power2.inOut', onComplete: () => {
        pre.style.display = 'none';
        animateHeroEntrance();
      }});
    }});

    tl.to(logo, { clipPath: 'inset(0 0% 0 0)', duration: .8, ease: 'power4.out' });
    const obj = { v: 0 };
    tl.to(obj, { v: 100, duration: 1.5, ease: 'power2.inOut',
      onUpdate() { if (count) count.textContent = Math.round(obj.v) + '%'; }
    }, 0.2);
    tl.to({}, { duration: .25 });
  }

  /* ── 5. HERO ENTRANCE ────────────────────────────────── */
  function animateHeroEntrance() {
    if (reduced) {
      qsa('#hero-eyebrow,#hero-logo-big,.hero-title span,#hero-desc,#hero-actions,#scroll-indicator')
        .forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
      return;
    }
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.to('#hero-eyebrow',  { opacity: 1, duration: .6 })
      .to('#hero-logo-big', { opacity: 1, y: 0, duration: .7 }, '-=.3')
      .to('.hero-title span', { y: 0, duration: 1.0, stagger: .1 }, '-=.4')
      .to('#hero-desc',    { opacity: 1, duration: .6 }, '-=.4')
      .to('#hero-actions', { opacity: 1, duration: .6 }, '-=.4')
      .to('#scroll-indicator', { opacity: 1, duration: .4 }, '-=.2');
  }

  /* ── 6. NAV ON SCROLL + MOBILE HAMBURGER ────────────── */
  function initNav() {
    const nav       = qs('#nav');
    const hamburger = qs('.nav-hamburger');
    if (!nav) return;

    // Scroll state
    ScrollTrigger.create({
      start: 'top -50px',
      onEnter:     () => nav.classList.add('scrolled'),
      onLeaveBack: () => nav.classList.remove('scrolled'),
    });

    // Hamburger toggle
    if (hamburger) {
      hamburger.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('nav-open');
        hamburger.setAttribute('aria-label', isOpen ? 'Menü schließen' : 'Menü öffnen');
        hamburger.setAttribute('aria-expanded', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });
    }

    // Dropdown toggle on click (desktop + mobile)
    qsa('.nav-links > li.has-dropdown > a').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const li = link.parentElement;
        const wasOpen = li.classList.contains('open');
        qsa('.nav-links > li.has-dropdown').forEach(el => el.classList.remove('open'));
        if (!wasOpen) li.classList.add('open');
      });
    });

    // Close dropdown on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('.has-dropdown')) {
        qsa('.nav-links > li.has-dropdown').forEach(el => el.classList.remove('open'));
      }
    });

    // Close menu when a leaf link is tapped
    qsa('.nav-links a:not(.has-dropdown > a)').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('nav-open');
        document.body.style.overflow = '';
        if (hamburger) hamburger.setAttribute('aria-label', 'Menü öffnen');
      });
    });

    // Close on outside click
    document.addEventListener('click', e => {
      if (nav.classList.contains('nav-open') && !nav.contains(e.target)) {
        nav.classList.remove('nav-open');
        document.body.style.overflow = '';
        if (hamburger) hamburger.setAttribute('aria-label', 'Menü öffnen');
      }
    });
  }

  /* ── 7. HERO PARALLAX ────────────────────────────────── */
  function initHeroParallax() {
    if (reduced) return;
    const bg = qs('#hero-bg');
    if (bg) {
      gsap.to(bg, { yPercent: 20, ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    }
    const content = qs('.hero-content');
    if (content) {
      gsap.to(content, { yPercent: 25, ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    }
  }

  /* ── 8. STATS COUNTER ────────────────────────────────── */
  function initStats() {
    qsa('[data-count]').forEach(el => {
      const target = parseInt(el.dataset.count, 10);
      const obj = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 82%', once: true,
        onEnter() {
          gsap.to(obj, { v: target, duration: 1.8, ease: 'power2.out',
            onUpdate() { el.textContent = Math.round(obj.v).toLocaleString('de-DE'); }
          });
        }
      });
    });
  }

  /* ── 9. SCROLL REVEAL ────────────────────────────────── */
  function initReveal() {
    qsa('.reveal-hidden').forEach(el => {
      gsap.fromTo(el, { opacity: 0, y: 36 }, {
        opacity: 1, y: 0, duration: .85, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 87%', once: true }
      });
    });

    // Destination cards stagger
    gsap.fromTo('.dest-card', { opacity: 0, y: 48, scale: .98 }, {
      opacity: 1, y: 0, scale: 1, duration: .65, stagger: .1, ease: 'power3.out',
      scrollTrigger: { trigger: '.dest-grid', start: 'top 82%', once: true }
    });

    // Station cards
    qsa('.station-grid').forEach(grid => {
      gsap.fromTo(grid.querySelectorAll('.station-card'), { opacity: 0, y: 32 }, {
        opacity: 1, y: 0, duration: .5, stagger: .07, ease: 'power2.out',
        scrollTrigger: { trigger: grid, start: 'top 85%', once: true }
      });
    });

    // Timeline entries from sides
    qsa('.timeline-entry').forEach((entry, i) => {
      gsap.fromTo(entry, { opacity: 0, x: i % 2 === 0 ? -48 : 48 }, {
        opacity: 1, x: 0, duration: .75, ease: 'power3.out',
        scrollTrigger: { trigger: entry, start: 'top 85%', once: true }
      });
    });
  }

  /* ── 10. PHOTO STRIP (single-copy marquee) ───────────── */
  function initPhotoStrip() {
    const track = qs('#strip-track');
    if (!track) return;

    // Measure original width BEFORE cloning
    const originalWidth = track.scrollWidth;

    if (!reduced) {
      // Clone just once for seamless loop
      const clone = track.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.parentElement.appendChild(clone);

      gsap.to([track, clone], {
        x: () => `-${originalWidth}px`,
        duration: 55,
        ease: 'none',
        repeat: -1,
        modifiers: {
          x: gsap.utils.unitize(x => parseFloat(x) % originalWidth)
        }
      });
    }
  }

  /* ── 11. TIMELINE LINE GROW ──────────────────────────── */
  function initTimelineLine() {
    const line = qs('.timeline-line');
    if (!line || reduced) return;
    gsap.fromTo(line, { scaleY: 0, transformOrigin: 'top center' }, {
      scaleY: 1, ease: 'none',
      scrollTrigger: {
        trigger: '.timeline-wrap',
        start: 'top 65%', end: 'bottom 35%',
        scrub: 1
      }
    });
  }

  /* ── 12. CARD TILT ───────────────────────────────────── */
  function initCardTilt() {
    if (reduced || window.innerWidth < 768) return;
    qsa('.dest-card,.tipp-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width  - .5;
        const y = (e.clientY - r.top)  / r.height - .5;
        gsap.to(card, { rotateY: x * 10, rotateX: -y * 7,
          transformPerspective: 900, duration: .4, ease: 'power2.out' });
      });
      card.addEventListener('mouseleave', () =>
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: .7, ease: 'elastic.out(1,.4)' }));
    });
  }

  /* ── 13. ANCHOR LINKS ────────────────────────────────── */
  function initAnchors() {
    qsa('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const target = qs(link.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        const offset = -90;
        if (lenis) lenis.scrollTo(target, { offset, duration: 1.3 });
        else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* ── 14. TRIP PAGE MAP (Leaflet) ─────────────────────── */
  function initTripMap() {
    const mapEl = qs('#trip-map');
    if (!mapEl || typeof L === 'undefined' || !window.TRIP_ROUTE) return;

    const route = window.TRIP_ROUTE; // array of {lat, lng, name, hotel?}
    const center = route[Math.floor(route.length / 2)];

    const map = L.map('trip-map', { zoomControl: true, scrollWheelZoom: false })
      .setView([center.lat, center.lng], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 18
    }).addTo(map);

    // Route polyline
    const latlngs = route.map(p => [p.lat, p.lng]);
    L.polyline(latlngs, {
      color: '#4F8070', weight: 3, opacity: .75,
      dashArray: '8 6'
    }).addTo(map);

    // Custom teal icon
    const icon = L.divIcon({
      html: `<div style="width:14px;height:14px;background:#4F8070;border:3px solid white;
             border-radius:50%;box-shadow:0 2px 8px rgba(79,128,112,.5)"></div>`,
      iconSize: [14, 14], iconAnchor: [7, 7], className: ''
    });

    // First/last marker larger
    route.forEach((p, i) => {
      const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);
      marker.bindPopup(`<strong style="color:#3D6E60">${p.name}</strong>${p.hotel ? '<br><span style="font-size:.85em;color:#8FA89E">'+p.hotel+'</span>' : ''}`, {
        maxWidth: 200
      });
    });

    // Fit to route
    map.fitBounds(latlngs, { padding: [40, 40] });
  }

  /* ── 15. SECTION TITLE REVEAL ────────────────────────── */
  function initTitleReveal() {
    if (reduced) return;
    qsa('.trip-hero-title').forEach(el => {
      gsap.fromTo(el,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: .9, ease: 'power3.out', delay: .3 }
      );
    });
  }

  /* ── BOOT ────────────────────────────────────────────── */
  function boot() {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    initCursor();
    initPreloader();
    initLenis();
    initNav();
    initHeroParallax();
    initStats();
    initReveal();
    initPhotoStrip();
    initTimelineLine();
    initCardTilt();
    initAnchors();
    initMagnetic();
    initTripMap();
    initTitleReveal();

    window.addEventListener('load', () => {
      if (window.ScrollTrigger) ScrollTrigger.refresh();
      if (lenis) lenis.resize();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
