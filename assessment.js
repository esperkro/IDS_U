/* =========================================================================
   IDS Training — assessment.js  (quiz engine)
   - 8 questions per lab in questions.js (4 core + 4 scenario)
   - each attempt draws 6 (3 core + 3 scenario), shuffles questions & options
   - pass = 5/6; fail = 30 s cooldown + review of missed questions
   - keyboard: A–D answer, Enter continue
   ========================================================================= */
(function (global) {
  'use strict';
  var LA = global.LabsAccess;
  var DRAW = 6, PASS = 5, COOLDOWN_MS = 30000;
  var LETTERS = ['A', 'B', 'C', 'D'];

  function el(tag, attrs, kids) { return global.ModuleKit.el(tag, attrs, kids); }
  function shuffle(a) { return global.ModuleKit.shuffle(a); }

  function draw(bank) {
    var core = shuffle(bank.filter(function (q) { return q.level !== 'scenario'; }));
    var scen = shuffle(bank.filter(function (q) { return q.level === 'scenario'; }));
    var pick = core.slice(0, 3).concat(scen.slice(0, 3));
    var rest = shuffle(core.slice(3).concat(scen.slice(3)));
    while (pick.length < DRAW && rest.length) pick.push(rest.shift());
    return shuffle(pick).map(function (q) {
      var order = shuffle(q.options.map(function (_, i) { return i; }));
      return { q: q.q, explain: q.explain, level: q.level, options: order.map(function (i) { return q.options[i]; }), answer: order.indexOf(q.answer) };
    });
  }

  function copyText(text, btn) {
    function ok() { var o = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(function () { btn.textContent = o; }, 1600); }
    if (navigator.clipboard && global.isSecureContext) {
      navigator.clipboard.writeText(text).then(ok, fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { btn.textContent = 'Select & copy manually'; }
      ta.remove();
    }
  }

  function intelPanel(lab) {
    var next = LA.nextLab(lab.id);
    var box = el('div', { class: 'intel fade-in' });
    if (!next) {
      box.appendChild(el('h4', { text: '🏁 Course complete' }));
      box.appendChild(el('p', { text: 'This was the final lab. Every badge you earned is in the badge case on your dashboard.' }));
      box.appendChild(el('a', { class: 'btn btn-primary', href: 'index.html', text: 'Back to dashboard' }));
      return box;
    }
    var code = LA.codeFor(next.id);
    box.appendChild(el('h4', { text: '🔓 Intel recovered' }));
    box.appendChild(el('p', { html: 'Access code for <strong>Lab ' + global.ModuleKit.pad(next.num) + ': ' + next.title + '</strong>. It has been saved to the Intel Vault on your dashboard.' }));
    var codeEl = el('code', { class: 'intel-code', 'data-intel-code': next.id });
    codeEl.textContent = code;
    box.appendChild(codeEl);
    var copy = el('button', { type: 'button', class: 'btn', text: 'Copy code' });
    copy.addEventListener('click', function () { copyText(code, copy); });
    var go = el('button', { type: 'button', class: 'btn btn-primary', text: 'Unlock & open next lab →' });
    go.addEventListener('click', function () { LA.unlock(next.id); global.location.href = next.file; });
    box.appendChild(el('div', { class: 'btn-row' }, [copy, go]));
    return box;
  }

  function mount(root, lab) {
    var bank = (global.QUESTIONS || {})[lab.id] || [];
    var state = null, timer = null;
    var keyHandlerBound = false;

    function header(title) {
      var h = el('div', { class: 'quiz-head' });
      h.appendChild(el('h3', { style: 'margin:0', text: title }));
      return h;
    }

    function intro() {
      clearInterval(timer);
      state = null;
      root.innerHTML = '';
      var p = LA.progressFor(lab.id);
      root.appendChild(header('Knowledge check'));
      root.appendChild(el('p', { html: 'Six questions drawn at random from this lab’s bank of ' + bank.length + '. Pass mark: <strong>' + PASS + ' of ' + DRAW + '</strong> (80%+). Answer with <kbd>A</kbd>–<kbd>D</kbd>, continue with <kbd>Enter</kbd>.' }));
      root.appendChild(el('p', { class: 'small muted', text: 'Attempts: ' + p.attempts + ' · Best score: ' + (p.attempts ? p.best + '/' + p.total : '—') + (p.passed ? ' · Badge earned' : '') }));
      if (p.passed) {
        var aw = el('div', { class: 'badge-award' });
        aw.innerHTML = LA.badgeSVG(lab, true, 80);
        aw.appendChild(el('p', { style: 'margin:0', html: '<strong>Badge earned.</strong> You can retake the quiz any time to practise.' }));
        root.appendChild(aw);
        root.appendChild(intelPanel(lab));
      }
      var btn = el('button', { type: 'button', class: 'btn btn-primary', id: 'quiz-start', text: p.passed ? 'Retake quiz' : 'Start quiz' });
      var cd = el('p', { class: 'small', 'aria-live': 'polite', id: 'quiz-cooldown' });
      btn.addEventListener('click', start);
      root.appendChild(el('div', { class: 'btn-row', style: 'margin-top:14px' }, [btn]));
      root.appendChild(cd);
      runCooldown(btn, cd);
    }

    function runCooldown(btn, label) {
      function tick() {
        var left = Math.ceil((LA.cooldownUntil(lab.id) - Date.now()) / 1000);
        if (left > 0) {
          btn.disabled = true;
          label.textContent = 'Cooldown: review the explanations — you can retry in ' + left + ' s.';
        } else {
          btn.disabled = false;
          label.textContent = '';
          clearInterval(timer);
        }
      }
      clearInterval(timer);
      tick();
      if (LA.cooldownUntil(lab.id) > Date.now()) timer = setInterval(tick, 500);
    }

    function start() {
      if (LA.cooldownUntil(lab.id) > Date.now()) return;
      state = { qs: draw(bank), i: 0, score: 0, answered: false, results: [] };
      bindKeys();
      showQ();
    }

    function showQ() {
      var s = state, q = s.qs[s.i];
      s.answered = false;
      root.innerHTML = '';
      var head = header('Question ' + (s.i + 1) + ' of ' + s.qs.length);
      var dots = el('div', { class: 'quiz-dots', 'aria-hidden': 'true' });
      s.qs.forEach(function (_, j) {
        var r = s.results[j];
        dots.appendChild(el('i', { class: r ? (r.ok ? 'ok' : 'no') : (j === s.i ? 'cur' : '') }));
      });
      head.appendChild(dots);
      root.appendChild(head);
      if (q.level === 'scenario') root.appendChild(el('span', { class: 'chip chip-accent', style: 'margin-bottom:10px', text: 'Scenario' }));
      var qid = 'qtext-' + s.i;
      root.appendChild(el('p', { class: 'quiz-q', id: qid, html: q.q }));
      var opts = el('div', { class: 'quiz-opts', role: 'group', 'aria-labelledby': qid });
      q.options.forEach(function (o, k) {
        var b = el('button', { type: 'button', class: 'quiz-opt', 'data-key': LETTERS[k] }, [el('span', { class: 'key', text: LETTERS[k] }), el('span', { class: 'opt-text', html: o })]);
        b.addEventListener('click', function () { answer(k); });
        opts.appendChild(b);
      });
      root.appendChild(opts);
      root.appendChild(el('div', { class: 'feedback', id: 'quiz-fb', role: 'status', 'aria-live': 'polite' }));
      var first = opts.querySelector('button');
      if (s.i > 0 && first) first.focus({ preventScroll: true });
    }

    function answer(k) {
      var s = state;
      if (!s || s.answered) return;
      s.answered = true;
      var q = s.qs[s.i];
      var ok = k === q.answer;
      if (ok) s.score++;
      s.results[s.i] = { ok: ok, picked: k, q: q };
      var btns = root.querySelectorAll('.quiz-opt');
      Array.prototype.forEach.call(btns, function (b, j) {
        b.disabled = true;
        if (j === q.answer) { b.classList.add('is-correct'); b.appendChild(el('span', { class: 'mark', text: '✓ Correct answer' })); }
        else if (j === k) { b.classList.add('is-wrong'); b.appendChild(el('span', { class: 'mark', text: '✗ Your answer' })); }
      });
      var fb = root.querySelector('#quiz-fb');
      global.ModuleKit.setFeedback(fb, ok ? 'good' : 'bad', q.explain, ok ? 'Correct' : 'Incorrect — the answer is ' + LETTERS[q.answer]);
      var cont = el('button', { type: 'button', class: 'btn btn-primary', id: 'quiz-next', text: s.i < s.qs.length - 1 ? 'Continue (Enter) →' : 'See results (Enter) →' });
      cont.addEventListener('click', advance);
      root.appendChild(el('div', { class: 'btn-row', style: 'margin-top:12px' }, [cont]));
      cont.focus({ preventScroll: true });
    }

    function advance() {
      var s = state;
      if (!s || !s.answered) return;
      if (s.i < s.qs.length - 1) { s.i++; showQ(); } else finish();
    }

    function finish() {
      var s = state, passed = s.score >= PASS;
      LA.recordAttempt(lab.id, s.score, s.qs.length, passed);
      if (!passed) LA.setCooldown(lab.id, COOLDOWN_MS);
      root.innerHTML = '';
      root.appendChild(header(passed ? 'Passed — badge earned' : 'Not yet — review and retry'));
      root.appendChild(el('p', { class: 'result-score ' + (passed ? 'status-good' : 'status-bad'), id: 'quiz-score', text: s.score + ' / ' + s.qs.length }));
      if (passed) {
        var aw = el('div', { class: 'badge-award fade-in' });
        aw.innerHTML = LA.badgeSVG(lab, true, 96);
        aw.appendChild(el('div', { html: '<strong>' + lab.title + '</strong><br><span class="muted">Badge added to your badge case.</span>' }));
        root.appendChild(aw);
        root.appendChild(intelPanel(lab));
      } else {
        root.appendChild(el('p', { html: 'You need ' + PASS + ' of ' + DRAW + ' to pass. A 30-second cooldown is running — use it to study the questions you missed.' }));
      }
      var missed = s.results.filter(function (r) { return !r.ok; });
      if (missed.length) {
        root.appendChild(el('h4', { style: 'margin-top:18px', text: 'Review: questions you missed' }));
        var ul = el('ul', { class: 'review', id: 'quiz-review' });
        missed.forEach(function (r) {
          ul.appendChild(el('li', { html: '<p style="margin:0 0 6px"><strong>' + r.q.q + '</strong></p>' +
            '<p class="small" style="margin:0 0 4px"><span class="status-bad">Your answer:</span> ' + r.q.options[r.picked] + '</p>' +
            '<p class="small" style="margin:0 0 6px"><span class="status-good">Correct:</span> ' + r.q.options[r.q.answer] + '</p>' +
            '<p class="small muted" style="margin:0">' + r.q.explain + '</p>' }));
        });
        root.appendChild(ul);
      }
      var retry = el('button', { type: 'button', class: 'btn' + (passed ? '' : ' btn-primary'), id: 'quiz-retry', text: passed ? 'Retake quiz' : 'Retry quiz' });
      retry.addEventListener('click', start);
      var cd = el('p', { class: 'small', 'aria-live': 'polite', id: 'quiz-cooldown' });
      root.appendChild(el('div', { class: 'btn-row', style: 'margin-top:16px' }, [retry, el('a', { class: 'btn btn-ghost', href: 'index.html', text: 'Dashboard' })]));
      root.appendChild(cd);
      state = null;
      runCooldown(retry, cd);
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function bindKeys() {
      if (keyHandlerBound) return;
      keyHandlerBound = true;
      document.addEventListener('keydown', function (e) {
        if (!state || e.altKey || e.ctrlKey || e.metaKey) return;
        if (root.closest('[hidden]')) return;
        var t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
        var k = e.key.toUpperCase();
        var idx = LETTERS.indexOf(k);
        if (idx !== -1 && !state.answered && idx < state.qs[state.i].options.length) { e.preventDefault(); answer(idx); return; }
        if (e.key === 'Enter' && state.answered) {
          if (t && (t.tagName === 'BUTTON' || t.tagName === 'A') && t.id !== 'quiz-next') return;
          if (t && t.id === 'quiz-next') return; // native click handles it
          e.preventDefault(); advance();
        }
      });
    }

    intro();
  }

  global.Assessment = { mount: mount, draw: draw, PASS: PASS, DRAW: DRAW };
})(window);
