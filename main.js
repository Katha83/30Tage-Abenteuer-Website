/* ============================================================
   RAUSZEIT – main.js
   Animations: Lenis · GSAP · ScrollTrigger · Three.js
   ============================================================ */

(function () {
  'use strict';

  /* ── Helpers ─────────────────────────────────────────────── */
  const qs  = (s, ctx = document) => ctx.querySelector(s);
  const qsa = (s, ctx = document) => [...ctx.querySelectorAll(s)];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ══════════════════════════════════════════════════════════
     1. LENIS SMOOTH SCROLL
  ══════════════════════════════════════════════════════════ */
  let lenis;
  function initLenis() {
    if (prefersReducedMotion) return;
    lenis = new Lenis({
      duration: 1.2,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Feed Lenis scroll position to GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ══════════════════════════════════════════════════════════
     2. CUSTOM CURSOR
  ══════════════════════════════════════════════════════════ */
  function initCursor() {
    const dot  = qs('#cursor-dot');
    const ring = qs('#cursor-ring');
    if (!dot || !ring) return;

    // Hide defaults on touch devices
    if ('ontouchstart' in window) {
      dot.style.display = 'none';
      ring.style.display = 'none';
      document.body.style.cursor = 'auto';
      qsa('button, a, [class*="magnetic"]').forEach(el => el.style.cursor = 'pointer');
      return;
    }

    let mx = 0, my = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', e => {
      mx = e.clientX;
      my = e.clientY;
      gsap.to(dot, { x: mx, y: my, duration: 0.05, ease: 'none' });
    });

    // Ring follows with lag
    gsap.ticker.add(() => {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      gsap.set(ring, { x: rx, y: ry });
    });

    // Hover states
    const hoverEls = qsa('a, button, .dest-card, .station-card, .magnetic');
    hoverEls.forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('hovering'));
      el.addEventListener('mouseleave', () => ring.classList.remove('hovering'));
    });

    document.addEventListener('mousedown', () => ring.classList.add('clicking'));
    document.addEventListener('mouseup',   () => ring.classList.remove('clicking'));

    // Hide on leave / show on enter
    document.addEventListener('mouseleave', () => {
      gsap.to([dot, ring], { opacity: 0, duration: 0.3 });
    });
    document.addEventListener('mouseenter', () => {
      gsap.to([dot, ring], { opacity: 1, duration: 0.3 });
    });
  }

  /* ══════════════════════════════════════════════════════════
     3. MAGNETIC BUTTONS
  ══════════════════════════════════════════════════════════ */
  function initMagnetic() {
    qsa('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const rect   = el.getBoundingClientRect();
        const cx     = rect.left + rect.width  / 2;
        const cy     = rect.top  + rect.height / 2;
        const dx     = (e.clientX - cx) * 0.35;
        const dy     = (e.clientY - cy) * 0.35;
        gsap.to(el, { x: dx, y: dy, duration: 0.4, ease: 'power2.out' });
      });
      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     4. PRELOADER
  ══════════════════════════════════════════════════════════ */
  function initPreloader() {
    const preloader = qs('#preloader');
    const logo      = qs('#preloader-logo');
    const countEl   = qs('#preloader-count');
    if (!preloader) return;

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(preloader, {
          opacity: 0,
          duration: 0.6,
          ease: 'power2.inOut',
          onComplete: () => {
            preloader.style.display = 'none';
            animateHeroEntrance();
          }
        });
      }
    });

    // Logo clip-path reveal
    tl.to(logo, {
      clipPath: 'inset(0 0% 0 0)',
      duration: 0.9,
      ease: 'power4.out',
    });

    // Count 0 → 100
    const obj = { val: 0 };
    tl.to(obj, {
      val: 100,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate() {
        if (countEl) countEl.textContent = Math.round(obj.val) + '%';
      }
    }, 0.2);

    tl.to({}, { duration: 0.3 }); // brief pause
  }

  /* ══════════════════════════════════════════════════════════
     5. HERO THREE.JS PARTICLE FIELD
  ══════════════════════════════════════════════════════════ */
  function initHeroParticles() {
    const canvas = qs('#hero-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 80;

    /* World-map-inspired particle clusters — roughly matching continents */
    const COUNT = prefersReducedMotion ? 800 : 3000;
    const positions = new Float32Array(COUNT * 3);
    const colors    = new Float32Array(COUNT * 3);
    const sizes     = new Float32Array(COUNT);

    const goldColor  = new THREE.Color('#c9a84c');
    const dimColor   = new THREE.Color('#1a2236');
    const mixedColor = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 50 + (Math.random() - 0.5) * 30;

      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      positions[i * 3 + 2] = r * Math.cos(phi);

      const mix = Math.random();
      mixedColor.lerpColors(dimColor, goldColor, Math.pow(mix, 3));
      colors[i * 3]     = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;

      sizes[i] = 0.8 + Math.random() * 2.2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uTime;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d);
          gl_FragColor = vec4(vColor, alpha * 0.85);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
    });

    const particles = new THREE.Points(geo, mat);
    scene.add(particles);

    // Mouse parallax
    let targetRotX = 0, targetRotY = 0;
    document.addEventListener('mousemove', e => {
      targetRotY = ((e.clientX / window.innerWidth)  - 0.5) * 0.4;
      targetRotX = ((e.clientY / window.innerHeight) - 0.5) * 0.2;
    });

    // Resize
    window.addEventListener('resize', () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    });

    let frame = 0;
    function animate() {
      requestAnimationFrame(animate);
      frame += 0.0025;
      mat.uniforms.uTime.value = frame;
      particles.rotation.y += (targetRotY - particles.rotation.y) * 0.04;
      particles.rotation.x += (targetRotX - particles.rotation.x) * 0.04;
      particles.rotation.z  = frame * 0.08;
      renderer.render(scene, camera);
    }
    animate();
  }

  /* ══════════════════════════════════════════════════════════
     6. HERO ENTRANCE ANIMATION (runs after preloader)
  ══════════════════════════════════════════════════════════ */
  function animateHeroEntrance() {
    if (prefersReducedMotion) {
      qsa('.hero-title span, #hero-eyebrow, #hero-desc, #hero-actions, #scroll-indicator')
        .forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    tl.to('#hero-eyebrow', { opacity: 1, duration: 0.6 })
      .to('.hero-title span', {
        y: 0,
        duration: 1.1,
        stagger: 0.12,
        ease: 'power4.out',
      }, '-=0.2')
      .to('#hero-desc',    { opacity: 1, y: 0, duration: 0.7 }, '-=0.4')
      .to('#hero-actions', { opacity: 1, y: 0, duration: 0.7 }, '-=0.5')
      .to('#scroll-indicator', { opacity: 1, duration: 0.5 }, '-=0.2');
  }

  /* ══════════════════════════════════════════════════════════
     7. NAV ON SCROLL
  ══════════════════════════════════════════════════════════ */
  function initNav() {
    const nav = qs('#nav');
    if (!nav) return;
    ScrollTrigger.create({
      start: 'top -60px',
      onEnter:        () => nav.classList.add('scrolled'),
      onLeaveBack:    () => nav.classList.remove('scrolled'),
    });
  }

  /* ══════════════════════════════════════════════════════════
     8. STATS COUNTER ANIMATION
  ══════════════════════════════════════════════════════════ */
  function initStats() {
    qsa('[data-count]').forEach(el => {
      const target = parseInt(el.dataset.count, 10);
      const obj    = { val: 0 };
      ScrollTrigger.create({
        trigger: el,
        start: 'top 80%',
        once: true,
        onEnter() {
          gsap.to(obj, {
            val: target,
            duration: 1.8,
            ease: 'power2.out',
            onUpdate() {
              el.textContent = Math.round(obj.val).toLocaleString('de-DE');
            }
          });
        }
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     9. SCROLL REVEAL (stagger for grids, individual for others)
  ══════════════════════════════════════════════════════════ */
  function initReveal() {
    // Generic reveal for individual elements
    qsa('.reveal-hidden').forEach(el => {
      gsap.fromTo(el,
        { opacity: 0, y: 50 },
        {
          opacity: 1, y: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            once: true,
          }
        }
      );
    });

    // Stagger destination cards
    gsap.fromTo('.dest-card',
      { opacity: 0, y: 60, scale: 0.97 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.7,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.dest-grid',
          start: 'top 80%',
          once: true,
        }
      }
    );

    // Stagger station cards per trip block
    qsa('.route-stations').forEach(container => {
      gsap.fromTo(container.querySelectorAll('.station-card'),
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0,
          duration: 0.55,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: container,
            start: 'top 82%',
            once: true,
          }
        }
      );
    });

    // Timeline entries slide in alternating sides
    qsa('.timeline-entry').forEach((entry, i) => {
      const fromX = i % 2 === 0 ? -60 : 60;
      gsap.fromTo(entry,
        { opacity: 0, x: fromX },
        {
          opacity: 1, x: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: entry,
            start: 'top 83%',
            once: true,
          }
        }
      );
    });
  }

  /* ══════════════════════════════════════════════════════════
     10. PARALLAX LAYERS
  ══════════════════════════════════════════════════════════ */
  function initParallax() {
    if (prefersReducedMotion) return;

    // About image parallax
    qsa('[data-parallax]').forEach(el => {
      const speed = parseFloat(el.dataset.parallax) || 0.15;
      gsap.to(el, {
        yPercent: speed * -100,
        ease: 'none',
        scrollTrigger: {
          trigger: el.closest('section') || el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        }
      });
    });

    // Hero subtle depth parallax
    gsap.to('.hero-content', {
      yPercent: 30,
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      }
    });

    gsap.to('#hero-canvas', {
      yPercent: 15,
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     11. PHOTO STRIP INFINITE SCROLL (horizontal marquee)
  ══════════════════════════════════════════════════════════ */
  function initPhotoStrip() {
    const track = qs('#strip-track');
    if (!track || prefersReducedMotion) return;

    // Clone the strip for seamless loop
    const clone = track.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.parentElement.appendChild(clone);

    const totalWidth = track.scrollWidth;

    gsap.to([track, clone], {
      x: `-${totalWidth}px`,
      duration: 60,
      ease: 'none',
      repeat: -1,
      modifiers: {
        x: gsap.utils.unitize(x => parseFloat(x) % totalWidth)
      }
    });

    // Speed up on scroll
    let scrollVelocity = 1;
    ScrollTrigger.create({
      trigger: '#photo-strip',
      start: 'top bottom',
      end: 'bottom top',
      onUpdate(self) {
        const vel = Math.abs(self.getVelocity()) / 1000;
        scrollVelocity = Math.max(1, vel * 0.5);
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     12. SECTION TITLE TEXT REVEAL (split lines)
  ══════════════════════════════════════════════════════════ */
  function initTextReveal() {
    if (prefersReducedMotion) return;

    // Animate section titles with a clip-path line-by-line reveal
    qsa('.section-title').forEach(el => {
      // Wrap each line in overflow:hidden to clip upward motion
      const text = el.innerHTML;
      const lines = text.split('<br>');

      if (lines.length > 1) {
        el.innerHTML = lines.map(line =>
          `<span class="tl-reveal-wrap" style="display:block;overflow:hidden;">
             <span class="tl-reveal-inner" style="display:block;">${line}</span>
           </span>`
        ).join('');

        gsap.fromTo(el.querySelectorAll('.tl-reveal-inner'),
          { y: '105%' },
          {
            y: '0%',
            duration: 1.1,
            stagger: 0.12,
            ease: 'power4.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              once: true,
            }
          }
        );
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     13. TRIP IMAGES — HOVER ZOOM + GLOW
  ══════════════════════════════════════════════════════════ */
  function initTripImageEffects() {
    qsa('.trip-thumb').forEach(img => {
      img.addEventListener('mouseenter', () => {
        gsap.to(img, {
          scale: 1.06,
          filter: 'brightness(1) saturate(1.2)',
          duration: 0.5,
          ease: 'power2.out',
        });
      });
      img.addEventListener('mouseleave', () => {
        gsap.to(img, {
          scale: 1,
          filter: 'brightness(0.85) saturate(0.85)',
          duration: 0.5,
          ease: 'power2.inOut',
        });
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     14. SECTION GOLD LINE PROGRESS INDICATOR
  ══════════════════════════════════════════════════════════ */
  function initProgressLine() {
    // Animate the timeline line growing as user scrolls
    const tlLine = qs('.timeline-line');
    if (!tlLine || prefersReducedMotion) return;

    gsap.fromTo(tlLine,
      { scaleY: 0, transformOrigin: 'top center' },
      {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: '.timeline-wrap',
          start: 'top 60%',
          end: 'bottom 40%',
          scrub: 1,
        }
      }
    );
  }

  /* ══════════════════════════════════════════════════════════
     15. DESTINATION CARD TILT (3D hover)
  ══════════════════════════════════════════════════════════ */
  function initCardTilt() {
    if (prefersReducedMotion || window.innerWidth < 768) return;

    qsa('.dest-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width  - 0.5;
        const y = (e.clientY - rect.top)  / rect.height - 0.5;
        gsap.to(card, {
          rotateY: x * 12,
          rotateX: -y * 8,
          transformPerspective: 800,
          duration: 0.4,
          ease: 'power2.out',
        });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          rotateY: 0,
          rotateX: 0,
          duration: 0.7,
          ease: 'elastic.out(1, 0.4)',
        });
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     16. MAP PIN ENTRANCE
  ══════════════════════════════════════════════════════════ */
  function initMapPins() {
    const pins = qsa('.map-pin');
    if (!pins.length) return;

    gsap.fromTo(pins,
      { scale: 0, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.5,
        stagger: 0.08,
        ease: 'back.out(2)',
        scrollTrigger: {
          trigger: '#world-map',
          start: 'top 70%',
          once: true,
        }
      }
    );
  }

  /* ══════════════════════════════════════════════════════════
     17. ABOUT SECTION PARALLAX OVERLAY
  ══════════════════════════════════════════════════════════ */
  function initAboutParallax() {
    if (prefersReducedMotion) return;

    gsap.to('#about::before', { /* handled via CSS radial, skip */ });

    // Slide the about text from left
    gsap.fromTo('.about-text-col',
      { opacity: 0, x: -40 },
      {
        opacity: 1, x: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '#about',
          start: 'top 70%',
          once: true,
        }
      }
    );
  }

  /* ══════════════════════════════════════════════════════════
     18. SMOOTH ANCHOR LINKS
  ══════════════════════════════════════════════════════════ */
  function initAnchors() {
    qsa('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const target = qs(link.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        if (lenis) {
          lenis.scrollTo(target, { offset: -80, duration: 1.4 });
        } else {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     19. STATION CARD GOLD TOP-LINE ON SCROLL
  ══════════════════════════════════════════════════════════ */
  function initStationCardLines() {
    qsa('.station-card').forEach(card => {
      ScrollTrigger.create({
        trigger: card,
        start: 'top 90%',
        once: true,
        onEnter() {
          card.style.setProperty('--line-scale', '1');
        }
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     20. TRIP BLOCK HEADLINE SLIDE IN
  ══════════════════════════════════════════════════════════ */
  function initTripHeadlines() {
    qsa('.trip-header').forEach(header => {
      gsap.fromTo(header,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0,
          duration: 0.75,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: header,
            start: 'top 85%',
            once: true,
          }
        }
      );
    });
  }

  /* ══════════════════════════════════════════════════════════
     INIT — sequential startup
  ══════════════════════════════════════════════════════════ */
  function boot() {
    gsap.registerPlugin(ScrollTrigger);

    initCursor();
    initHeroParticles();
    initPreloader();     // triggers animateHeroEntrance on complete
    initLenis();
    initNav();
    initStats();
    initReveal();
    initParallax();
    initPhotoStrip();
    initTextReveal();
    initTripImageEffects();
    initProgressLine();
    initCardTilt();
    initMapPins();
    initAboutParallax();
    initAnchors();
    initStationCardLines();
    initTripHeadlines();
    initMagnetic();

    // Refresh ScrollTrigger after all fonts/images are loaded
    window.addEventListener('load', () => {
      ScrollTrigger.refresh();
      if (lenis) lenis.resize();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
