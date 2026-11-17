/* =========================================================================
   IDS Training — module-kit.js
   Renders a lab page from a config object and provides the shared
   interaction components (choices, red flags, sort, myths, terminal,
   checklist) plus small helpers for custom simulations.
   Authored lab content may contain HTML; anything typed by a user is only
   ever inserted with textContent.
   ========================================================================= */
(function (global) {
  'use strict';
  var LA = global.LabsAccess;
  var CHAPTERS = [
    { key: 'briefing', label: 'Briefing' },
    { key: 'scenario', label: 'Scenario' },
    { key: 'practice', label: 'Practice' },
    { key: 'playbook', label: 'Playbook' }
  ];

  /* ---------- tiny DOM helpers ---------- */
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;         // authored content only
      else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  var uid = 0;
  function nextId(p) { uid += 1; return (p || 'k') + uid; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var VERDICT = {
    good: { label: 'Best choice', cls: 'v-good', btn: 'is-good', mark: '✓' },
    partial: { label: 'Partly right', cls: 'v-partial', btn: 'is-partial', mark: '~' },
    bad: { label: 'Risky choice', cls: 'v-bad', btn: 'is-bad', mark: '✗' }
  };
  function setFeedback(box, verdict, html, labelOverride) {
    var v = VERDICT[verdict] || VERDICT.partial;
    box.className = 'feedback ' + v.cls + ' fade-in';
    box.innerHTML = '';
    box.appendChild(el('span', { class: 'verdict', text: v.mark + ' ' + (labelOverride || v.label) }));
    box.appendChild(el('div', { html: html }));
  }
  function blockWrap(b, tag) {
    var w = el('section', { class: 'block card' });
    if (b.title) {
      var h = el('h3', { class: 'block-title' });
      if (tag) h.appendChild(el('span', { class: 'block-tag', text: tag }));
      h.appendChild(document.createTextNode(b.title));
      w.appendChild(h);
    }
    if (b.intro) w.appendChild(el('p', { class: 'muted', html: b.intro }));
    return w;
  }

  /* ---------- Components ---------- */
  var Components = {
    html: function (b) { return el('div', { class: 'block', html: b.html }); },

    choice: function (b) {
      var w = blockWrap(b, b.tag || 'Decision');
      if (b.prompt) w.appendChild(el('p', { html: '<strong>' + b.prompt + '</strong>' }));
      var list = el('div', { class: 'choice-list' });
      var fb = el('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
      b.options.forEach(function (o, i) {
        var btn = el('button', { type: 'button', class: 'choice-btn' }, [
          el('span', { class: 'letter', text: String.fromCharCode(65 + i) }),
          el('span', { html: o.text })
        ]);
        btn.addEventListener('click', function () {
          var v = VERDICT[o.verdict];
          btn.className = 'choice-btn ' + v.btn;
          if (!btn.querySelector('.tag')) btn.appendChild(el('span', { class: 'tag', text: v.mark + ' ' + v.label }));
          setFeedback(fb, o.verdict, o.why);
        });
        list.appendChild(btn);
      });
      w.appendChild(list); w.appendChild(fb);
      return w;
    },

    redflags: function (b) {
      var w = blockWrap(b, 'Spot the red flags');
      var total = b.items.filter(function (i) { return i.flag; }).length;
      var found = 0;
      var mock = el('div', { class: 'mock ' + (b.dark ? 'dark ' : '') + (b.mono ? 'mono' : '') });
      var head = el('div', { class: 'mock-head' });
      head.innerHTML = '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>' + (b.header || '');
      mock.appendChild(head);
      var body = el('div', { class: 'mock-body' });
      var status = el('span', { class: 'small', 'aria-live': 'polite' });
      var meter = el('div', { class: 'meter', 'aria-hidden': 'true' }, [el('span')]);
      function upd() {
        status.textContent = 'Red flags found: ' + found + ' of ' + total;
        meter.firstChild.style.width = (total ? found / total * 100 : 0) + '%';
      }
      b.items.forEach(function (it) {
        var btn = el('button', { type: 'button', class: 'flag-item', 'aria-pressed': 'false' }, [el('span', { class: 'flag-text', html: it.text })]);
        btn.addEventListener('click', function () {
          if (btn.getAttribute('aria-pressed') === 'true') return;
          btn.setAttribute('aria-pressed', 'true');
          btn.classList.add(it.flag ? 'is-found' : 'is-clean');
          btn.appendChild(el('span', { class: 'flag-label', text: it.flag ? '⚑ Red flag' : '✓ Looks normal' }));
          btn.appendChild(el('span', { class: 'flag-why', html: it.why }));
          if (it.flag) { found++; upd(); }
        });
        body.appendChild(btn);
      });
      mock.appendChild(body);
      w.appendChild(mock);
      var reveal = el('button', { type: 'button', class: 'btn btn-sm', text: 'Reveal remaining flags' });
      reveal.addEventListener('click', function () {
        $$('.flag-item', body).forEach(function (btn, i) { if (b.items[i].flag && btn.getAttribute('aria-pressed') !== 'true') btn.click(); });
      });
      w.appendChild(el('div', { class: 'flag-status' }, [status, meter, reveal]));
      upd();
      return w;
    },

    sort: function (b) {
      var w = blockWrap(b, 'Triage');
      var score = 0, answered = 0;
      var sc = el('p', { class: 'small', 'aria-live': 'polite' });
      function upd() { sc.textContent = 'Sorted ' + answered + ' of ' + b.items.length + ' · correct: ' + score; }
      var list = el('ul', { class: 'sort-list' });
      var items = b.shuffle === false ? b.items : shuffle(b.items);
      items.forEach(function (it) {
        var li = el('li', { class: 'sort-item' });
        li.appendChild(el('div', { class: 'sort-text', html: it.text }));
        var acts = el('div', { class: 'sort-actions', role: 'group', 'aria-label': 'Classify' });
        var why = el('div', { class: 'sort-why' });
        var done = false;
        ['left', 'right'].forEach(function (side) {
          var btn = el('button', { type: 'button', class: 'btn', text: side === 'left' ? b.left : b.right });
          btn.addEventListener('click', function () {
            $$('.btn', acts).forEach(function (x) { x.classList.remove('is-picked'); x.setAttribute('aria-pressed', 'false'); });
            btn.classList.add('is-picked'); btn.setAttribute('aria-pressed', 'true');
            var ok = side === it.answer;
            if (!done) { answered++; if (ok) score++; done = true; upd(); }
            li.className = 'sort-item ' + (ok ? 'is-right' : 'is-wrong');
            why.innerHTML = '';
            why.appendChild(el('span', { class: ok ? 'status-good' : 'status-bad', text: ok ? '✓ Correct — ' : '✗ Not quite — it belongs in “' + (it.answer === 'left' ? b.left : b.right) + '”. ' }));
            why.appendChild(el('span', { html: it.why }));
          });
          acts.appendChild(btn);
        });
        li.appendChild(acts); li.appendChild(why);
        list.appendChild(li);
      });
      w.appendChild(list); w.appendChild(sc); upd();
      return w;
    },

    myths: function (b) {
      var w = el('section', { class: 'block' });
      w.appendChild(el('h3', { class: 'block-title' }, [el('span', { class: 'block-tag', text: 'Myth or fact' }), b.title || 'Tap each card to reveal the truth']));
      var grid = el('div', { class: 'myths' });
      b.items.forEach(function (m) {
        var btn = el('button', { type: 'button', class: 'myth-card', 'aria-expanded': 'false' });
        function render(open) {
          btn.innerHTML = '';
          btn.appendChild(el('span', { class: 'mf-tag ' + (open ? 'fact' : 'myth'), text: open ? 'Fact' : 'Myth' }));
          btn.appendChild(el('span', { html: open ? m.fact : '“' + m.myth + '”' }));
          btn.appendChild(el('span', { class: 'mf-hint', text: open ? 'Tap to see the myth again' : 'Tap to reveal the fact' }));
        }
        render(false);
        btn.addEventListener('click', function () {
          var open = btn.getAttribute('aria-expanded') !== 'true';
          btn.setAttribute('aria-expanded', String(open)); render(open);
        });
        grid.appendChild(btn);
      });
      w.appendChild(grid);
      return w;
    },

    terminal: function (b) {
      var w = blockWrap(b, 'Simulation');
      var term = el('div', { class: 'term' });
      term.appendChild(el('div', { class: 'term-head', html: '<span aria-hidden="true">●●●</span> ' + (b.host || 'student@ids-lab') }));
      var out = el('div', { class: 'term-out', role: 'log', 'aria-live': 'polite', tabindex: '0', 'aria-label': 'Terminal output' });
      if (b.motd) out.appendChild(el('div', { class: 't-ok', text: b.motd }));
      var idIn = nextId('cmd');
      var form = el('form', { class: 'term-form' });
      var prompt = b.prompt || '$';
      form.appendChild(el('label', { class: 'prompt', for: idIn, text: prompt }));
      var input = el('input', { type: 'text', id: idIn, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-describedby': idIn + '-h' });
      form.appendChild(input);
      form.appendChild(el('button', { type: 'submit', class: 'btn btn-primary btn-sm', text: 'Run' }));
      var hintBtn = el('button', { type: 'button', class: 'btn btn-sm', text: 'Hint' });
      form.appendChild(hintBtn);
      term.appendChild(out); term.appendChild(form);
      var hintP = el('p', { id: idIn + '-h', class: 'small muted', html: 'Type the command for the current task and press <kbd>Enter</kbd>. Stuck? Use <strong>Hint</strong> to fill it in.' });
      var tasks = el('ol', { class: 'tasks', 'aria-label': 'Tasks' });
      var step = 0;
      b.tasks.forEach(function (t, i) {
        tasks.appendChild(el('li', { class: i === 0 ? 'is-current' : '' }, [el('span', { class: 'tick', 'aria-hidden': 'true' }), el('span', { html: t.goal })]));
      });
      var done = el('div', { class: 'feedback', role: 'status' });
      function print(text, cls) { out.appendChild(el('div', { class: cls || '', text: text })); out.scrollTop = out.scrollHeight; }
      function mark() {
        $$('li', tasks).forEach(function (li, i) {
          li.className = i < step ? 'is-done' : (i === step ? 'is-current' : '');
          li.firstChild.textContent = i < step ? '✓' : '';
        });
      }
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var cmd = input.value.trim();
        if (!cmd) return;
        print(prompt + ' ' + cmd, 't-cmd');
        input.value = '';
        if (cmd === 'clear') { out.innerHTML = ''; return; }
        if (cmd === 'help') { print('Tasks are listed below the terminal. Use the Hint button for the expected command.'); return; }
        var t = b.tasks[step];
        if (t && t.match.test(cmd)) {
          print(t.output, '');
          if (t.note) print('# ' + t.note, 't-ok');
          step++; mark();
          if (step === b.tasks.length) setFeedback(done, 'good', b.success || 'All tasks complete.', 'Simulation complete');
          return;
        }
        var extra = (b.extra || []).filter(function (x) { return x.match.test(cmd); })[0];
        if (extra) { print(extra.output, extra.err ? 't-err' : ''); return; }
        print(t ? (t.wrong || 'That is not what this step needs. Re-read the task or press Hint.') : 'All tasks are done — explore freely or move on.', 't-err');
      });
      hintBtn.addEventListener('click', function () {
        var t = b.tasks[step];
        if (!t) return;
        input.value = t.hint;
        input.focus();
      });
      w.appendChild(term); w.appendChild(hintP); w.appendChild(tasks); w.appendChild(done);
      return w;
    },

    checklist: function (b) {
      var w = blockWrap(b, b.tag || 'Checklist');
      var list = el('ul', { class: 'checklist' });
      var maxScore = b.items.reduce(function (s, i) { return s + (i.weight > 0 ? i.weight : 0); }, 0);
      var num = el('span', { class: 'score-num' });
      var meter = el('div', { class: 'meter' }, [el('span')]);
      var verdict = el('span', { class: 'small', 'aria-live': 'polite' });
      function upd() {
        var s = 0;
        $$('input', list).forEach(function (c, i) { if (c.checked) s += b.items[i].weight; });
        var pct = Math.max(0, Math.round(s / maxScore * 100));
        num.textContent = pct + '%';
        meter.firstChild.style.width = pct + '%';
        var band = (b.bands || [[90, 'Excellent — ready to go.'], [60, 'Getting there — review the unticked essentials.'], [0, 'Not ready — key controls are missing or something risky is ticked.']]);
        for (var i = 0; i < band.length; i++) if (pct >= band[i][0]) { verdict.textContent = band[i][1]; break; }
      }
      b.items.forEach(function (it) {
        var id = nextId('ck');
        var cb = el('input', { type: 'checkbox', id: id });
        cb.addEventListener('change', function () {
          var why = label.querySelector('.ck-why');
          if (cb.checked && !why) label.lastChild.appendChild(el('span', { class: 'ck-why', html: (it.weight < 0 ? '<span class="status-bad">✗ Lowers your score:</span> ' : '<span class="status-good">✓</span> ') + it.why }));
          else if (!cb.checked && why) why.remove();
          upd();
        });
        var label = el('label', { for: id }, [cb, el('span', {}, [el('span', { html: it.text })])]);
        list.appendChild(el('li', {}, [label]));
      });
      w.appendChild(list);
      w.appendChild(el('div', { class: 'scorebox' }, [el('span', { class: 'small', text: b.scoreLabel || 'Readiness score' }), num, meter, verdict]));
      upd();
      return w;
    },

    custom: function (b) {
      var w = blockWrap(b, b.tag || 'Simulation');
      var host = el('div', { class: 'sim' });
      w.appendChild(host);
      try { b.render(host, K); } catch (e) { host.textContent = 'Simulation failed to load.'; if (global.console) console.error(e); }
      return w;
    }
  };

  function renderBlocks(blocks, into) {
    (blocks || []).forEach(function (b) {
      var fn = Components[b.type];
      if (fn) into.appendChild(fn(b));
    });
  }

  /* ---------- Small SVG line chart used by several sims ---------- */
  function lineChart(opts) {
    // opts: {values, width, height, min, max, lines:[{y,label,color,dash}], highlight:fn(v,i)->color|null, labels:[...] }
    var W = opts.width || 640, H = opts.height || 220, P = 30;
    var vals = opts.values;
    var min = opts.min != null ? opts.min : Math.min.apply(null, vals);
    var max = opts.max != null ? opts.max : Math.max.apply(null, vals);
    if (max === min) max = min + 1;
    function x(i) { return P + (W - P - 10) * (vals.length === 1 ? 0.5 : i / (vals.length - 1)); }
    function y(v) { return H - P - (H - P - 12) * (v - min) / (max - min); }
    var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + (opts.label || 'Chart') + '">';
    s += '<line x1="' + P + '" y1="' + (H - P) + '" x2="' + (W - 10) + '" y2="' + (H - P) + '" stroke="#46557f"/>';
    s += '<text x="4" y="' + (y(max) + 4) + '" fill="#b2bdd8" font-size="11">' + Math.round(max) + '</text>';
    s += '<text x="4" y="' + (y(min) + 4) + '" fill="#b2bdd8" font-size="11">' + Math.round(min) + '</text>';
    (opts.bands || []).forEach(function (b) {
      var y1 = y(Math.min(max, b.to)), y2 = y(Math.max(min, b.from));
      s += '<rect x="' + P + '" y="' + y1 + '" width="' + (W - P - 10) + '" height="' + Math.max(0, y2 - y1) + '" fill="' + b.color + '" opacity=".14"/>';
    });
    (opts.lines || []).forEach(function (l) {
      if (l.y < min || l.y > max) return;
      s += '<line x1="' + P + '" x2="' + (W - 10) + '" y1="' + y(l.y) + '" y2="' + y(l.y) + '" stroke="' + l.color + '" stroke-width="1.5" ' + (l.dash ? 'stroke-dasharray="5 4"' : '') + '/>';
      if (l.label) s += '<text x="' + (W - 12) + '" y="' + (y(l.y) - 4) + '" text-anchor="end" fill="' + l.color + '" font-size="11">' + l.label + '</text>';
    });
    if (opts.series2) {
      s += '<polyline fill="none" stroke="#c4b5fd" stroke-width="1.5" stroke-dasharray="4 3" points="' + opts.series2.map(function (v, i) { return x(i) + ',' + y(v); }).join(' ') + '"/>';
    }
    if (opts.bars) {
      var bw = Math.max(2, (W - P - 10) / vals.length - 3);
      vals.forEach(function (v, i) {
        var c = (opts.highlight && opts.highlight(v, i)) || '#7dd3fc';
        s += '<rect x="' + (x(i) - bw / 2) + '" y="' + y(v) + '" width="' + bw + '" height="' + (H - P - y(v)) + '" fill="' + c + '"/>';
      });
    } else {
      s += '<polyline fill="none" stroke="#7dd3fc" stroke-width="2" points="' + vals.map(function (v, i) { return x(i) + ',' + y(v); }).join(' ') + '"/>';
      vals.forEach(function (v, i) {
        var c = opts.highlight && opts.highlight(v, i);
        if (c) s += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="5" fill="' + c + '" stroke="#0b1020" stroke-width="1.5"/>';
      });
    }
    (opts.labels || []).forEach(function (t, i) {
      if (t) s += '<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle" fill="#b2bdd8" font-size="10">' + t + '</text>';
    });
    return s + '</svg>';
  }
  function mean(a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; }
  function std(a) { var m = mean(a); return Math.sqrt(a.reduce(function (s, v) { return s + (v - m) * (v - m); }, 0) / a.length); }

  /* ---------- Page mount ---------- */
  function mount(cfg) {
    var lab = LA.getLab(cfg.id);
    if (!lab) return;
    document.documentElement.style.setProperty('--accent', lab.accent);
    document.title = 'Lab ' + pad(lab.num) + ' · ' + lab.title + ' — IDS Training';
    var app = document.getElementById('app');
    app.innerHTML = '';
    var tier = LA.TIERS[lab.tier - 1];

    // top bar
    var header = el('header', { class: 'topbar' });
    header.innerHTML = '<div class="wrap"><a class="brand" href="index.html"><span class="brand-mark">' + LA.iconSVG('radar', 18) + '</span><span>IDS Training</span></a>' +
      '<span class="spacer"></span><span class="crumb">Lab ' + pad(lab.num) + '</span>' +
      '<a class="btn btn-sm btn-ghost" href="index.html">Dashboard</a></div>' +
      '<div class="read-progress" role="progressbar" aria-label="Reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>';
    app.appendChild(el('a', { class: 'skip-link', href: '#main', text: 'Skip to content' }));
    app.appendChild(header);

    var main = el('main', { id: 'main', class: 'wrap', tabindex: '-1' });
    var hero = el('div', { class: 'lab-hero' });
    hero.innerHTML = '<div class="lab-icon">' + LA.iconSVG(lab.icon, 30) + '</div>' +
      '<div class="eyebrow"><span class="chip chip-accent">Lab ' + pad(lab.num) + '</span><span class="chip">Tier ' + lab.tier + ' · ' + tier.name + '</span><span class="chip">⏱ ' + lab.time + '</span><span class="chip">' + lab.difficulty + '</span></div>' +
      '<h1>' + lab.title + '</h1><p class="lead muted">' + lab.summary + '</p>';
    main.appendChild(hero);

    var tabs = el('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Lab chapters' });
    var panels = [];
    CHAPTERS.forEach(function (c, i) {
      var t = el('button', { type: 'button', role: 'tab', id: 'tab-' + c.key, 'aria-controls': 'ch-' + c.key, 'aria-selected': 'false', tabindex: '-1', class: 'tab' },
        [el('span', { class: 'tab-num', text: '0' + (i + 1) }), el('span', { text: c.label })]);
      t.addEventListener('click', function () { go(i, true); });
      tabs.appendChild(t);
    });
    main.appendChild(tabs);

    CHAPTERS.forEach(function (c, i) {
      var sec = el('section', { class: 'chapter', id: 'ch-' + c.key, role: 'tabpanel', 'aria-labelledby': 'tab-' + c.key, hidden: true });
      sec.appendChild(el('h2', {}, [el('span', { class: 'kicker', text: '0' + (i + 1) }), c.label]));
      var data = cfg[c.key] || {};
      if (c.key === 'briefing') buildBriefing(sec, data);
      if (c.key === 'scenario') buildScenario(sec, data);
      if (c.key === 'practice') { if (data.intro) sec.appendChild(el('p', { class: 'lead', html: data.intro })); renderBlocks(data.blocks, sec); }
      if (c.key === 'playbook') buildPlaybook(sec, data, lab);
      panels.push(sec);
      main.appendChild(sec);
    });

    var nav = el('nav', { class: 'chapter-nav', 'aria-label': 'Chapter navigation' });
    var prev = el('button', { type: 'button', class: 'btn', text: '← Previous' });
    var next = el('button', { type: 'button', class: 'btn btn-primary', text: 'Next →' });
    prev.addEventListener('click', function () { go(current - 1, true); });
    next.addEventListener('click', function () {
      if (current === CHAPTERS.length - 1) { global.location.href = 'index.html'; return; }
      go(current + 1, true);
    });
    nav.appendChild(prev); nav.appendChild(next);
    nav.appendChild(el('p', { class: 'hint', html: 'Tip: use <kbd>←</kbd> <kbd>→</kbd> to move between chapters.' }));
    main.appendChild(nav);
    app.appendChild(main);
    app.appendChild(el('footer', { class: 'site-footer' }, [el('div', { class: 'wrap', html: 'IDS Training · Lab ' + pad(lab.num) + ' of ' + LA.LABS.length + ' · Progress is stored only in this browser. <a href="index.html">Back to dashboard</a>' })]));

    var current = -1;
    function go(i, userInitiated) {
      if (i < 0 || i >= CHAPTERS.length || i === current) return;
      current = i;
      $$('.tab', tabs).forEach(function (t, j) {
        t.setAttribute('aria-selected', String(j === i));
        t.setAttribute('tabindex', j === i ? '0' : '-1');
        if (j === i) t.classList.add('is-visited');
      });
      panels.forEach(function (p, j) { p.hidden = j !== i; });
      prev.disabled = i === 0;
      if (i === CHAPTERS.length - 1) { next.textContent = 'Dashboard →'; } else { next.textContent = 'Next: ' + CHAPTERS[i + 1].label + ' →'; }
      LA.setChapter(lab.id, i);
      if (userInitiated) {
        var top = tabs.getBoundingClientRect().top + global.scrollY - 70;
        if (global.scrollY > top) global.scrollTo(0, Math.max(0, top));
        panels[i].querySelector('h2').setAttribute('tabindex', '-1');
        panels[i].querySelector('h2').focus({ preventScroll: true });
      }
      updateProgress();
    }

    // keyboard: arrows between chapters (not while typing or on sliders)
    document.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (document.querySelector('dialog[open]')) return;
      e.preventDefault();
      go(current + (e.key === 'ArrowRight' ? 1 : -1), true);
      var sel = tabs.querySelector('[aria-selected="true"]');
      if (t && t.getAttribute && t.getAttribute('role') === 'tab' && sel) sel.focus();
    });

    var bar = header.querySelector('.read-progress');
    function updateProgress() {
      var h = document.documentElement.scrollHeight - global.innerHeight;
      var pct = h > 0 ? Math.min(100, Math.max(0, global.scrollY / h * 100)) : 100;
      bar.firstChild.style.width = pct + '%';
      bar.setAttribute('aria-valuenow', String(Math.round(pct)));
    }
    global.addEventListener('scroll', updateProgress, { passive: true });
    global.addEventListener('resize', updateProgress);

    var start = LA.progressFor(lab.id).chapter || 0;
    var hash = (global.location.hash || '').replace('#', '');
    CHAPTERS.forEach(function (c, i) { if (c.key === hash) start = i; });
    go(Math.min(start, CHAPTERS.length - 1), false);
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function buildBriefing(sec, d) {
    if (d.hook) sec.appendChild(el('p', { class: 'hook', html: d.hook }));
    if (d.lead) sec.appendChild(el('p', { html: d.lead }));
    if (d.stats) {
      var g = el('div', { class: 'stats' });
      d.stats.forEach(function (s) {
        g.appendChild(el('div', { class: 'stat' }, [el('div', { class: 'stat-value', html: s.value }), el('div', { class: 'stat-label', html: s.label }), el('div', { class: 'stat-note', html: s.note || '' })]));
      });
      sec.appendChild(g);
    }
    if (d.objectives) {
      sec.appendChild(el('h3', { text: 'By the end of this lab you will be able to…' }));
      var ul = el('ul', { class: 'objectives' });
      d.objectives.forEach(function (o) { var li = el('li', { html: LA.iconSVG('check', 18) }); li.appendChild(el('span', { html: o })); ul.appendChild(li); });
      sec.appendChild(ul);
    }
    if (d.body) sec.appendChild(el('div', { class: 'block', html: d.body }));
    renderBlocks(d.blocks, sec);
  }
  function buildScenario(sec, d) {
    var story = el('article', { class: 'story' });
    if (d.meta) { var m = el('div', { class: 'story-meta' }); d.meta.forEach(function (t) { m.appendChild(el('span', { class: 'chip', text: t })); }); story.appendChild(m); }
    if (d.title) story.appendChild(el('h3', { text: d.title }));
    story.appendChild(el('div', { html: d.story || '' }));
    sec.appendChild(story);
    renderBlocks(d.blocks, sec);
  }
  function buildPlaybook(sec, d, lab) {
    if (d.intro) sec.appendChild(el('p', { class: 'lead', html: d.intro }));
    var ol = el('ol', { class: 'rules' });
    (d.rules || []).forEach(function (r) { ol.appendChild(el('li', { html: '<strong>' + r[0] + '</strong>' + r[1] })); });
    sec.appendChild(ol);
    if (d.quote) {
      sec.appendChild(el('blockquote', { class: 'pullquote' }, [el('p', { html: d.quote[0] }), el('cite', { text: '— ' + (d.quote[1] || 'Analyst’s rule of thumb') })]));
    }
    renderBlocks(d.blocks, sec);
    var q = el('section', { class: 'quiz', id: 'quiz', 'aria-label': 'Lab quiz' });
    sec.appendChild(q);
    if (global.Assessment) global.Assessment.mount(q, lab);
  }

  var K = {
    el: el, $: $, $$: $$, shuffle: shuffle, setFeedback: setFeedback, nextId: nextId,
    lineChart: lineChart, mean: mean, std: std, pad: pad, Components: Components, renderBlocks: renderBlocks
  };
  K.mount = mount;
  global.ModuleKit = K;
})(window);
