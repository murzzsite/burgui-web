const LEAD_ENDPOINT = 'https://lead-relay.leestygpt.workers.dev/lead/V6RJAQJBTL';

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const wide = () => innerWidth > 900;

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ===== local time in Tula =====
  const timeEl = $('#tulaTime');
  const tick = () => {
    if (!timeEl) return;
    timeEl.textContent = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
  };
  tick(); setInterval(tick, 1000);

  // ===== EXPRESS CHECK (live thing) =====
  const QUESTIONS = [
    { a: 'безопасность', q: 'Сайт открывается по HTTPS и без предупреждений браузера?' },
    { a: 'безопасность', q: 'CMS и плагины сайта обновляются хотя бы раз в квартал?' },
    { a: 'безопасность', q: 'Есть свежая резервная копия, и вы знаете, как быстро из неё поднять сайт?' },
    { a: 'ФЗ-152', q: 'В формах есть согласие на обработку персональных данных и ссылка на политику?' },
    { a: 'ФЗ-152', q: 'Вы знаете, где хранятся данные посетителей и кто имеет к ним доступ?' },
    { a: 'SEO', q: 'Сайт виден в поиске Яндекса по вашим главным запросам?' },
    { a: 'удобство', q: 'С телефона можно оставить заявку меньше чем за полминуты?' },
    { a: 'удобство', q: 'Вы знаете, сколько заявок в месяц приходит с сайта?' },
  ];
  const card = $('#checkCard');
  let checkSummary = '';
  if (card) {
    const bar = $('#checkBar'), body = $('#checkBody'), qEl = $('#checkQ'), ansBox = $('#checkAnswers');
    const result = $('#checkResult'), resN = $('#resN'), resTitle = $('#resTitle'), resAreas = $('#resAreas');
    const formCheck = $('#formCheck');
    let step = 0, answers = [];
    bar.innerHTML = QUESTIONS.map(() => '<i></i>').join('');
    const segs = $$('i', bar);

    const showQ = (animate = true) => {
      qEl.textContent = QUESTIONS[step].q;
      segs.forEach((s, i) => s.classList.toggle('on', i < step));
      if (animate && window.gsap && !reduce) {
        gsap.fromTo([qEl, ...$$('.ans')], { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: 'expo.out', stagger: .06, overwrite: true });
      }
    };
    const start = () => {
      step = 0; answers = [];
      result.hidden = true; body.hidden = false; ansBox.hidden = false;
      if (formCheck) formCheck.hidden = true;
      checkSummary = '';
      showQ(false);
    };
    const finish = () => {
      segs.forEach(s => s.classList.add('on'));
      const risks = answers.map((v, i) => v === 'yes' ? null : QUESTIONS[i].a).filter(Boolean);
      const n = risks.length;
      const areas = [...new Set(risks)];
      body.hidden = true; result.hidden = false;
      resTitle.textContent = n === 0 ? 'Явных проблем не видно. Аудит всё равно покажет детали.'
        : n === 1 ? 'пункт стоит проверить на аудите'
        : n <= 4 ? 'пункта стоит проверить на аудите'
        : 'пунктов стоит проверить на аудите';
      resAreas.textContent = n === 0 ? '' : 'Что смотреть в первую очередь: ' + areas.join(', ') + '.';
      checkSummary = `Экспресс-проверка: ${n} из 8 пунктов стоит проверить` + (areas.length ? ' (' + areas.join(', ') + ')' : '') + '.';
      if (formCheck) { formCheck.textContent = 'К заявке приложим результат проверки: ' + n + ' из 8.'; formCheck.hidden = false; }
      if (window.gsap && !reduce) {
        const o = { v: 0 };
        gsap.to(o, { v: n, duration: 1.1, ease: 'power3.out', onUpdate: () => { resN.textContent = Math.round(o.v); } });
        gsap.from(result.children, { y: 30, opacity: 0, duration: .7, ease: 'expo.out', stagger: .08 });
      } else resN.textContent = n;
    };
    ansBox.addEventListener('click', e => {
      const b = e.target.closest('.ans'); if (!b) return;
      answers[step] = b.dataset.a; step++;
      if (step >= QUESTIONS.length) finish(); else showQ();
    });
    $('#resAgain').addEventListener('click', start);
    ansBox.hidden = false;
    start();
  }

  // ===== FORM -> WORKER -> TELEGRAM =====
  const form = $('#leadForm');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const label = btn.querySelector('span');
    const orig = label.textContent;
    const fd = new FormData(form);
    const p = {}; fd.forEach((v, k) => { p[k] = v; });
    if (p._gotcha) return;
    if (!p.name || !p.contact) { alert('Заполните имя и контакт для связи'); return; }
    if (!form.agree.checked) { alert('Нужно согласие на обработку персональных данных'); return; }
    const payload = {
      name: p.name,
      phone: p.contact,
      comment: [p.site ? 'Сайт: ' + p.site : 'Адрес сайта не указан', checkSummary].filter(Boolean).join('. '),
    };
    btn.disabled = true; label.textContent = 'Отправляем...';
    try {
      const r = await fetch(LEAD_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      label.textContent = 'Заявка отправлена';
      if (window.ym) ym(214763, 'reachGoal', 'lead');
      form.reset();
    } catch (err) {
      console.error(err);
      label.textContent = 'Ошибка, попробуйте ещё раз';
    } finally {
      setTimeout(() => { label.textContent = orig; btn.disabled = false; }, 3500);
    }
  });

  // ===== MOTION =====
  if (reduce || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  // smooth scroll
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: t => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const t = $(id); if (!t) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(t, { offset: id === '#top' ? 0 : -64, duration: 1.4 }) : t.scrollIntoView({ behavior: 'smooth' });
  }));

  // header tone follows the chapter; hides while scrolling down
  const header = $('#header');
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => {
    header.classList.toggle('is-hidden', s.direction === 1 && s.scroll() > innerHeight * .6);
  } });
  $$('[data-tone]').forEach(sec => {
    if (sec === header) return;
    ScrollTrigger.create({
      trigger: sec, start: 'top 64px', end: 'bottom 64px',
      onToggle: s => { if (s.isActive) header.dataset.tone = sec.dataset.tone; },
    });
  });

  // split headings into masked words
  $$('[data-split]').forEach(el => {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part.trim()) { frag.append(part); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.textContent = part; w.append(i); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    const words = $$('.w > span', el);
    gsap.set(words, { yPercent: 115 });
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: .07 }),
    });
  });

  // hero: masked line reveal, then lead + button
  const l1 = $('.hero__l1'), l2 = $('.hero__l2');
  gsap.set([l1, l2], { yPercent: 112 });
  gsap.set(['.hero__lead', '.hero__side .btn'], { y: 26, opacity: 0 });
  gsap.set('.header__inner > *', { y: -16, opacity: 0 });
  gsap.timeline({ defaults: { ease: 'expo.out' }, delay: .15 })
    .to(l1, { yPercent: 0, duration: 1.2 })
    .to(l2, { yPercent: 0, duration: 1.2 }, '<0.11')
    .to(['.hero__lead', '.hero__side .btn'], { y: 0, opacity: 1, duration: .9, stagger: .1 }, '-=.6')
    .to('.header__inner > *', { y: 0, opacity: 1, duration: .8, stagger: .06 }, '-=.9');

  // hero: the two lines drift apart as the page leaves the first screen
  gsap.to(l1, { xPercent: -6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .6 } });
  gsap.to(l2, { xPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .6 } });

  // audit sheets: previous sheet sinks as the next one covers it, list items enter
  const sheets = $$('.sheet');
  sheets.forEach((s, i) => {
    const items = $$('.sheet__list li', s);
    gsap.set(items, { x: 40, opacity: 0 });
    ScrollTrigger.create({
      trigger: s, start: 'top 75%', once: true,
      onEnter: () => {
        gsap.to(items, { x: 0, opacity: 1, duration: .9, ease: 'expo.out', stagger: .07 });
        gsap.from($('.sheet__text', s), { y: 30, opacity: 0, duration: .9, ease: 'expo.out' });
      },
    });
    if (i < sheets.length - 1) {
      gsap.to(s, {
        scale: .94, ease: 'none',
        scrollTrigger: { trigger: sheets[i + 1], start: 'top bottom', end: () => 'top ' + (parseFloat(getComputedStyle(sheets[i + 1]).top) + 120) + 'px', scrub: true },
      });
    }
  });

  // check card entrance
  gsap.from('#checkCard', { y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '#checkCard', start: 'top 85%', once: true } });
  gsap.from('.check__intro .lead', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.check__intro .lead', start: 'top 90%', once: true } });

  // works: objects drift with scroll, tilt with the mouse
  $$('.panel__obj').forEach(img => {
    gsap.fromTo(img, { yPercent: 8 }, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: img.closest('.panel'), start: 'top bottom', end: 'bottom top', scrub: true } });
    if (fine) {
      const panel = img.closest('.panel');
      const qx = gsap.quickTo(img, 'x', { duration: .9, ease: 'power3.out' });
      panel.addEventListener('mousemove', e => { const r = panel.getBoundingClientRect(); qx(((e.clientX - r.left) / r.width - .5) * -36); });
      panel.addEventListener('mouseleave', () => qx(0));
    }
  });
  $$('.panel__row').forEach(r => gsap.from(r.children, { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: r, start: 'top 95%', once: true } }));

  // reel: runs on its own, speeds up and skews with scroll velocity
  const track = $('#reelTrack');
  if (track) {
    track.append(...$$('.reel__i', track).map(n => { const c = n.cloneNode(true); c.setAttribute('aria-hidden', 'true'); return c; }));
    let x = 0, boost = 0;
    const half = () => track.scrollWidth / 2;
    const skew = gsap.quickTo(track, 'skewX', { duration: .5, ease: 'power3.out' });
    gsap.ticker.add((t, dt) => {
      const v = lenis ? lenis.velocity : 0;
      boost += (Math.abs(v) - boost) * .08;
      x -= (0.06 + boost * .12) * dt;
      if (-x >= half()) x += half();
      gsap.set(track, { x });
      skew(Math.max(-6, Math.min(6, -v * .4)));
    });
  }

  // prices: tiles grow from the floor, numbers count up
  const tiles = $$('.tile');
  gsap.set($$('.tile__box'), { scaleY: .0, opacity: .0 });
  gsap.set($$('.tile__name, .tile__text'), { y: 20, opacity: 0 });
  ScrollTrigger.create({
    trigger: '.tiles', start: 'top 80%', once: true,
    onEnter: () => {
      tiles.forEach((t, i) => {
        gsap.to($('.tile__box', t), { scaleY: 1, opacity: 1, duration: 1.2, ease: 'expo.out', delay: i * .12 });
        gsap.to($$('.tile__name, .tile__text', t), { y: 0, opacity: 1, duration: .9, ease: 'expo.out', delay: .5 + i * .12, stagger: .06 });
        $$('.num', t).forEach(n => {
          const to = +n.dataset.from, o = { v: 0 };
          gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', delay: i * .12 + .2, onUpdate: () => { n.textContent = Math.round(o.v); } });
        });
      });
    },
  });
  gsap.from('.web3', { y: 40, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.web3', start: 'top 92%', once: true } });

  // ticket: slides out of its slot, the stub tears away slightly
  const ticket = $('.ticket');
  if (ticket) {
    gsap.timeline({ scrollTrigger: { trigger: ticket, start: 'top 85%', once: true }, defaults: { ease: 'expo.out' } })
      .from(ticket, { y: 140, rotate: -5, opacity: 0, duration: 1.4 })
      .from('.ticket__stub', { x: -26, duration: 1.1 }, '-=.9')
      .from('.ticket__lines li', { y: 16, opacity: 0, duration: .8, stagger: .08 }, '-=.9');
    gsap.to(ticket, { rotate: 1.2, ease: 'none', scrollTrigger: { trigger: '.support', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.support__note', { y: 24, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.support__note', start: 'top 95%', once: true } });
  }

  // faq tiles
  gsap.from('.faq details', { y: 40, opacity: 0, duration: .9, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: '.faq__list', start: 'top 85%', once: true } });

  // cta
  gsap.from(['.cta__lead', '.form > *'], { y: 36, opacity: 0, duration: 1, ease: 'expo.out', stagger: .06, scrollTrigger: { trigger: '.cta__row', start: 'top 92%', once: true } });

  // footer tiles
  gsap.from('.ft', { y: 50, opacity: 0, duration: 1, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: '.foot', start: 'top 92%', once: true } });

  // magnetic buttons
  if (fine) {
    $$('.magnet').forEach(b => {
      const qx = gsap.quickTo(b, 'x', { duration: .5, ease: 'power3.out' });
      const qy = gsap.quickTo(b, 'y', { duration: .5, ease: 'power3.out' });
      b.addEventListener('mousemove', e => {
        const r = b.getBoundingClientRect();
        qx((e.clientX - (r.left + r.width / 2)) * .22);
        qy((e.clientY - (r.top + r.height / 2)) * .3);
      });
      b.addEventListener('mouseleave', () => { qx(0); qy(0); });
    });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
})();
