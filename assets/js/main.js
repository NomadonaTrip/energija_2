/* =====================================================
   ENERGIJA — interactions
   - scroll progress + sticky header
   - reveal-on-scroll (IntersectionObserver)
   - animated counters
   - FAQ accordion
   - magnetic buttons
   - custom cursor (pointer-fine only)
   - hero load class
   ===================================================== */

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* --- 1. Hero load class for image easing-in --- */
  document.addEventListener('DOMContentLoaded', () => {
    const hero = document.getElementById('hero');
    requestAnimationFrame(() => hero && hero.classList.add('is-loaded'));
  });

  /* --- 2. Scroll progress + header behavior ---
     Header stays in its default (red, fully visible) state for the
     entire hero stage — i.e. while the video is scrubbing and the hero
     is pinned. Once the user scrolls past the stage, the color-change
     state (`is-scrolled`) kicks in first, then `is-hidden` slides the
     header off-screen on continued downward scroll. */
  const header   = document.getElementById('header');
  const progress = document.getElementById('progress');
  const heroStage = document.getElementById('hero-stage');
  let lastY = window.scrollY;
  let ticking = false;

  function getHeroExitY() {
    if (!heroStage) return 0;
    return heroStage.offsetTop + heroStage.offsetHeight;
  }

  function onScroll() {
    const y = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = docH > 0 ? Math.min(1, Math.max(0, y / docH)) : 0;
    if (progress) progress.style.transform = `scaleX(${ratio})`;

    if (header) {
      const heroExitY    = getHeroExitY();
      const hideAfter    = heroExitY + 200; // slide-off threshold
      const colorAfter   = heroExitY;        // color change kicks in immediately on hero exit

      // Hide on scroll-down once past the hero (and the buffer)
      if (y > hideAfter && y > lastY + 4) header.classList.add('is-hidden');
      else if (y < hideAfter || y < lastY - 4) header.classList.remove('is-hidden');

      // Color change once past the hero
      if (y > colorAfter) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
    }
    lastY = y;
    ticking = false;
  }

  function requestOnScroll() {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }
  window.addEventListener('scroll', requestOnScroll, { passive: true });
  // Stage height depends on layout + JS-driven sizing; re-evaluate header
  // logic when those settle.
  window.addEventListener('resize', requestOnScroll);
  window.addEventListener('load',   requestOnScroll);
  onScroll();

  /* --- 3. Reveal on scroll --- */
  const revealEls = document.querySelectorAll('.reveal, .reveal-mask');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => {
      // If the element is already in viewport on init, mark immediately
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add('in');
      } else {
        io.observe(el);
      }
    });
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* --- 4. Counters --- */
  const counters = document.querySelectorAll('[data-counter]');
  function runCounter(el) {
    const target = parseFloat(el.dataset.counter);
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      // ease-out-expo
      const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const v = Math.round(target * e);
      el.textContent = v + suffix;
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window && !reduceMotion) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          cio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(c => cio.observe(c));
  } else {
    counters.forEach(c => { c.textContent = c.dataset.counter + (c.dataset.suffix || ''); });
  }

  /* --- 5. FAQ accordion --- */
  document.querySelectorAll('.faq__item').forEach(item => {
    const btn = item.querySelector('.faq__btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const open = item.classList.contains('is-open');
      // Close all others (single-open accordion)
      document.querySelectorAll('.faq__item.is-open').forEach(other => {
        if (other !== item) {
          other.classList.remove('is-open');
          other.querySelector('.faq__btn')?.setAttribute('aria-expanded', 'false');
        }
      });
      item.classList.toggle('is-open', !open);
      btn.setAttribute('aria-expanded', String(!open));
    });
  });

  /* --- 6. Magnetic buttons (subtle pull toward cursor) --- */
  if (isFinePointer && !reduceMotion) {
    document.querySelectorAll('[data-magnetic]').forEach(btn => {
      const strength = 0.18;
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);
        btn.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  /* --- 7. Custom cursor --- */
  const cursor = document.getElementById('cursor');
  if (cursor && isFinePointer && !reduceMotion) {
    let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    let tx = cx, ty = cy;
    let raf;
    function follow() {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(follow);
    }
    document.addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!raf) follow();
    });
    document.addEventListener('mousedown', () => cursor.classList.add('is-down'));
    document.addEventListener('mouseup',   () => cursor.classList.remove('is-down'));

    const hoverSelector = 'a, button, [data-magnetic], .service, .why__card, .partner, .gallery__item, .faq__btn';
    document.querySelectorAll(hoverSelector).forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });

    document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
    document.addEventListener('mouseenter', () => cursor.style.opacity = '1');
  } else if (cursor) {
    cursor.style.display = 'none';
  }

  /* --- 8. Hero video: pinned scroll-driven scrub (desktop only) ---
     On desktop (≥1025px), the hero is sticky-pinned inside .hero-stage.
     The user scrolls through the stage's pin range; the hero stays
     visually frozen while the video scrubs from 0 → SCRUB_END seconds.
     When the scrub ends, the pin releases and normal scrolling resumes.
     Below 1025px the layout stacks single-column and the video sits
     below the fold while pinned, so we drop the pin and let the video
     autoplay-loop in flow instead.
     Door tracking: object-position drifts left→center to keep the door
     framed as the man walks deeper into the room. */
  (function setupHeroScrub() {
    const stage = document.getElementById('hero-stage');
    const heroEl = document.getElementById('hero');
    const video = heroEl && heroEl.querySelector('.hero__media-video');
    if (!stage || !video) return;

    const SCRUB_END = 6.0;     // matches video's trimmed duration
    const SCRUB_VH  = 1.2;     // pin distance = 1.2 × viewport height
    const desktopMQ = window.matchMedia('(min-width: 1025px)');

    let mode = null;          // 'pin' | 'loop' | 'still'
    let onScroll = null;
    let onResize = null;
    let onLoad = null;

    function teardown() {
      if (onScroll) window.removeEventListener('scroll', onScroll);
      if (onResize) window.removeEventListener('resize', onResize);
      if (onLoad)   window.removeEventListener('load', onLoad);
      onScroll = onResize = onLoad = null;
      stage.style.height = '';
      video.style.removeProperty('--media-pos');
      try { video.pause(); } catch (_) {}
    }

    function setupStill() {
      const setStill = () => { try { video.currentTime = 0.05; } catch (_) {} };
      if (video.readyState >= 1) setStill();
      else video.addEventListener('loadedmetadata', setStill, { once: true });
    }

    function setupLoop() {
      // Reset to start and let the video play in flow.
      const start = () => {
        try { video.currentTime = 0; } catch (_) {}
        video.play().catch(() => {});
      };
      if (video.readyState >= 1) start();
      else video.addEventListener('loadedmetadata', start, { once: true });
    }

    function setupPin() {
      let metaReady = video.readyState >= 1;
      let scrubTicking = false;
      let stageTopDoc = 0;
      let scrubDist = Math.round(window.innerHeight * SCRUB_VH);

      function measure() {
        scrubDist = Math.round(window.innerHeight * SCRUB_VH);
        stage.style.height = '';
        const heroH = heroEl.offsetHeight;
        stage.style.height = (heroH + scrubDist) + 'px';
        const r = stage.getBoundingClientRect();
        stageTopDoc = r.top + window.scrollY;
      }

      function applyScrub() {
        const p = Math.min(1, Math.max(0, (window.scrollY - stageTopDoc) / scrubDist));
        if (metaReady) {
          const t = p * SCRUB_END;
          if (Math.abs(video.currentTime - t) > 0.016) {
            try { video.currentTime = t; } catch (_) {}
          }
        }
        video.style.setProperty('--media-pos', `${10 + p * 25}% center`);
        scrubTicking = false;
      }

      function requestScrub() {
        if (!scrubTicking) {
          scrubTicking = true;
          requestAnimationFrame(applyScrub);
        }
      }

      onScroll = requestScrub;
      onResize = () => { measure(); requestScrub(); };
      onLoad   = () => { measure(); requestScrub(); };

      video.addEventListener('loadedmetadata', () => {
        metaReady = true;
        measure();
        applyScrub();
      }, { once: true });

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize);
      window.addEventListener('load',   onLoad);
      try { video.pause(); } catch (_) {}
      measure();
      applyScrub();
    }

    function activate() {
      const wantMode = reduceMotion ? 'still'
        : (desktopMQ.matches ? 'pin' : 'loop');
      if (wantMode === mode) return;
      teardown();
      mode = wantMode;
      if (mode === 'still')      setupStill();
      else if (mode === 'loop')  setupLoop();
      else                       setupPin();
    }

    desktopMQ.addEventListener('change', activate);
    activate();
  })();

  /* --- 9. Quote form: submit to Google Forms ---
     Posts the form fields to the Google Form `formResponse` endpoint
     using `fetch` with mode:'no-cors'. The response is opaque (Google
     blocks cross-origin reads), so we treat a resolved fetch as success
     and a rejected promise as a network failure. */
  (function setupQuoteForm() {
    const form = document.getElementById('quote-form');
    if (!form) return;

    const FORM_ID = '1FAIpQLSc1hAd-ukmShW_c0aRS1c6DMWpIFuMKoQzEJH3n2SDd2fygGQ';
    const FORM_URL = 'https://docs.google.com/forms/d/e/' + FORM_ID + '/formResponse';
    // Map of <input name> → Google Form entry ID
    const FIELD_MAP = {
      name:    'entry.323546542',
      email:   'entry.1599374307',
      phone:   'entry.1751022217',
      company: 'entry.1171046031',
      service: 'entry.1741213830',
      message: 'entry.1285554556'
    };

    const status = form.querySelector('.cta-form__status');
    const submitBtn = form.querySelector('.cta-form__submit');
    const submitLabel = form.querySelector('.cta-form__submit-label');

    function setStatus(msg, kind) {
      status.textContent = msg || '';
      status.classList.toggle('is-error',   kind === 'error');
      status.classList.toggle('is-success', kind === 'success');
    }

    function markInvalid(input) {
      const field = input.closest('.cta-form__field');
      if (field) field.classList.add('cta-form__field--invalid');
      input.addEventListener('input', () => {
        if (field) field.classList.remove('cta-form__field--invalid');
      }, { once: true });
    }

    function validate() {
      let firstInvalid = null;
      form.querySelectorAll('input, textarea, select').forEach(el => {
        const field = el.closest('.cta-form__field');
        if (field) field.classList.remove('cta-form__field--invalid');
        if (!el.checkValidity()) {
          markInvalid(el);
          if (!firstInvalid) firstInvalid = el;
        }
      });
      if (firstInvalid) firstInvalid.focus();
      return !firstInvalid;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setStatus('', null);
      if (!validate()) {
        setStatus('Please fill in the required fields.', 'error');
        return;
      }

      const params = new URLSearchParams();
      Object.keys(FIELD_MAP).forEach(name => {
        const input = form.elements.namedItem(name);
        if (input && input.value) params.append(FIELD_MAP[name], input.value);
      });

      submitBtn.disabled = true;
      submitLabel.textContent = 'Sending…';
      setStatus('Sending your request…', null);

      try {
        await fetch(FORM_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: params
        });
        // Opaque response — assume success.
        form.classList.add('is-submitted');
        setStatus("Thanks — we've received your request and will be in touch within one business day.", 'success');
        form.reset();
      } catch (err) {
        submitBtn.disabled = false;
        submitLabel.textContent = 'Send request';
        setStatus("Couldn't send — please check your connection or email us at info@energija.com.ng.", 'error');
      }
    });
  })();

  /* --- 10. Smooth anchor scroll with header offset --- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const headerH = header ? header.getBoundingClientRect().height : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerH - 8;
      window.scrollTo({
        top,
        behavior: reduceMotion ? 'auto' : 'smooth'
      });
    });
  });
})();
