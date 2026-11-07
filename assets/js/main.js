/* =====================================================
   ENERGIJA — interactions
   - header: hairline after hero, hides on scroll-down
   - reveal on scroll
   - stat counters
   - FAQ accordion
   - hero video scrub (desktop) / loop (mobile)
   - quote form with inline validation + success state
   ===================================================== */

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- 1. Header --- */
  const header = document.getElementById('header');
  const heroStage = document.getElementById('hero-stage');
  let lastY = window.scrollY;
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    if (header) {
      const heroExitY = heroStage ? heroStage.offsetTop + heroStage.offsetHeight - header.offsetHeight : 0;
      const hideAfter = heroExitY + 200;
      if (y > hideAfter && y > lastY + 4) header.classList.add('is-hidden');
      else if (y < hideAfter || y < lastY - 4) header.classList.remove('is-hidden');
      header.classList.toggle('is-scrolled', y > heroExitY);
    }
    lastY = y;
    ticking = false;
  }
  function requestOnScroll() {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }
  window.addEventListener('scroll', requestOnScroll, { passive: true });
  window.addEventListener('resize', requestOnScroll);
  window.addEventListener('load',   requestOnScroll);
  onScroll();

  /* --- 2. Reveal on scroll --- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* --- 3. Counters: count up once when the stats band enters view.
     The final value is already in the HTML, so nothing breaks without JS. --- */
  const counters = document.querySelectorAll('[data-counter]');
  function runCounter(el) {
    const target = parseFloat(el.dataset.counter);
    const duration = 1200;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 4); // ease-out-quart
      el.textContent = String(Math.round(target * e));
      if (t < 1) requestAnimationFrame(tick);
    }
    el.textContent = '0';
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
    }, { threshold: 0.6 });
    counters.forEach(c => cio.observe(c));
  }

  /* --- 4. FAQ accordion (single open) --- */
  document.querySelectorAll('.faq__item').forEach(item => {
    const btn = item.querySelector('.faq__btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const open = item.classList.contains('is-open');
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

  /* --- 5. Hero video: pinned scroll-driven scrub (desktop only) ---
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

  /* --- 6. Quote form → Google Forms ---
     Posts to the Google Form `formResponse` endpoint with mode:'no-cors'.
     The response is opaque, so a resolved fetch counts as success and a
     rejected promise as a network failure.
     Validation is per field: errors appear under the field after the first
     submit attempt, then update live as the user corrects them. */
  (function setupQuoteForm() {
    const form = document.getElementById('quote-form');
    const done = document.getElementById('quote-done');
    if (!form) return;

    const FORM_ID = '1FAIpQLSc1hAd-ukmShW_c0aRS1c6DMWpIFuMKoQzEJH3n2SDd2fygGQ';
    const FORM_URL = 'https://docs.google.com/forms/d/e/' + FORM_ID + '/formResponse';
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
    const controls = form.querySelectorAll('input, textarea, select');
    let attempted = false;

    function check(el) {
      const field = el.closest('.field');
      const ok = el.checkValidity();
      if (field) field.classList.toggle('is-invalid', !ok);
      el.setAttribute('aria-invalid', String(!ok));
      return ok;
    }

    controls.forEach(el => {
      const err = el.closest('.field')?.querySelector('.field__error');
      if (err) {
        err.id = 'err-' + el.name;
        el.setAttribute('aria-describedby', err.id);
      }
      el.addEventListener('input', () => { if (attempted) check(el); });
      el.addEventListener('blur',  () => { if (attempted || el.value) check(el); });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      attempted = true;
      status.textContent = '';
      status.classList.remove('is-error');

      let firstInvalid = null;
      controls.forEach(el => { if (!check(el) && !firstInvalid) firstInvalid = el; });
      if (firstInvalid) { firstInvalid.focus(); return; }

      const params = new URLSearchParams();
      Object.keys(FIELD_MAP).forEach(name => {
        const input = form.elements.namedItem(name);
        if (input && input.value) params.append(FIELD_MAP[name], input.value);
      });
      const email = form.elements.namedItem('email').value;

      submitBtn.disabled = true;
      submitLabel.textContent = 'Sending…';

      try {
        await fetch(FORM_URL, { method: 'POST', mode: 'no-cors', body: params });
        document.getElementById('quote-done-email').textContent = email;
        const panel = form.parentElement;
        panel.style.minHeight = panel.offsetHeight + 'px'; // no layout jump on swap
        form.hidden = true;
        done.hidden = false;
        requestAnimationFrame(() => done.classList.add('is-in'));
        done.focus({ preventScroll: true });
        form.reset();
      } catch (err) {
        submitBtn.disabled = false;
        submitLabel.textContent = 'Send request';
        status.textContent = "Couldn't send. Check your connection, or email info@energija.com.ng.";
        status.classList.add('is-error');
      }
    });
  })();

  /* --- 7. Smooth anchor scroll with header offset --- */
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
