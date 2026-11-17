/* IDS Training — dashboard.js (index.html only) */
(function () {
  'use strict';
  var LA = window.LabsAccess;
  var profile = LA.getProfile();
  if (!profile) return;
  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function mk(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  $('brand-icon').innerHTML = LA.iconSVG('radar', 18);
  $('key-icon').innerHTML = LA.iconSVG('key', 20);
  $('signout').addEventListener('click', function () { LA.signOut(); location.href = 'signin.html'; });

  function render() {
    profile = LA.getProfile();
    var name = profile.name;
    $('who').textContent = name + (profile.cohort ? ' · ' + profile.cohort : '');
    $('avatar').textContent = name.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
    $('hello').textContent = 'Welcome, ' + name.split(/\s+/)[0];

    var done = LA.completedCount(), total = LA.LABS.length;
    $('progress-label').textContent = done + '/' + total + ' labs complete';
    $('progress-bar').setAttribute('aria-valuenow', String(done));
    $('progress-bar').setAttribute('aria-valuemax', String(total));
    $('progress-bar').firstElementChild.style.width = (done / total * 100) + '%';
    $('badge-label').textContent = done + ' badge' + (done === 1 ? '' : 's') + ' earned';

    // Resume banner
    var nx = LA.upNext(), resume = $('resume');
    resume.innerHTML = '';
    if (nx) {
      var p = LA.progressFor(nx.id);
      var info = mk('div');
      info.appendChild(mk('div', 'small muted', p.chapter > 0 || p.attempts ? 'Resume where you left off' : 'Up next'));
      info.appendChild(mk('strong', null, 'Lab ' + pad(nx.num) + ': ' + nx.title));
      info.appendChild(mk('div', 'small muted', ['Briefing', 'Scenario', 'Practice', 'Playbook'][p.chapter] + ' chapter · ' + nx.time));
      var a = mk('a', 'btn btn-primary', p.chapter > 0 || p.attempts ? 'Resume lab →' : 'Start lab →');
      a.href = nx.file;
      a.style.setProperty('--accent', nx.accent);
      a.style.background = nx.accent;
      resume.appendChild(info); resume.appendChild(a);
    } else if (done === total) {
      resume.appendChild(mk('div', null, '🏁 All ' + total + ' labs complete — outstanding work. Retake any quiz to keep your knowledge sharp.'));
    } else {
      var lockedNext = LA.LABS.filter(function (l) { return !LA.isUnlocked(l.id); })[0];
      resume.appendChild(mk('div', null, 'Every unlocked lab is complete. Enter the access code for Lab ' + pad(lockedNext.num) + ' to continue.'));
    }

    // Vault
    var vault = $('vault');
    vault.innerHTML = '';
    if (!profile.intel.length) vault.appendChild(mk('li', 'small muted', 'No codes yet — pass Lab 01’s quiz to recover your first.'));
    profile.intel.slice().sort(function (a, b) { return a.lab < b.lab ? -1 : 1; }).forEach(function (it) {
      var lab = LA.getLab(it.lab);
      var li = mk('li');
      li.appendChild(mk('span', 'small', 'Lab ' + pad(lab.num) + ' · ' + lab.title));
      li.appendChild(mk('code', null, it.code));
      var btn = mk('button', 'btn btn-sm', 'Copy');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Copy code for lab ' + lab.num);
      btn.addEventListener('click', function () {
        var done = function () { btn.textContent = 'Copied ✓'; setTimeout(function () { btn.textContent = 'Copy'; }, 1500); };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(it.code).then(done, function () {});
        else { var ta = document.createElement('textarea'); ta.value = it.code; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove(); }
      });
      li.appendChild(btn);
      vault.appendChild(li);
    });

    // Tiers & cards
    var tiers = $('tiers');
    tiers.innerHTML = '';
    LA.TIERS.forEach(function (t) {
      var sec = mk('section', 'tier');
      sec.setAttribute('aria-labelledby', 'tier-' + t.id);
      var head = mk('div', 'tier-head');
      var h = mk('h2', null, 'Tier ' + t.id + ' — ' + t.name); h.id = 'tier-' + t.id;
      head.appendChild(h);
      var labs = LA.LABS.filter(function (l) { return l.tier === t.id; });
      var tdone = labs.filter(function (l) { return LA.progressFor(l.id).passed; }).length;
      head.appendChild(mk('span', 'muted small', tdone + '/' + labs.length + ' complete'));
      sec.appendChild(head);
      sec.appendChild(mk('p', 'muted small', t.blurb));
      var grid = mk('div', 'cards');
      labs.forEach(function (l) { grid.appendChild(card(l, nx)); });
      sec.appendChild(grid);
      tiers.appendChild(sec);
    });

    // Badge case
    var bc = $('badge-case');
    bc.innerHTML = '';
    LA.LABS.forEach(function (l) {
      var earned = LA.progressFor(l.id).passed;
      var f = mk('figure');
      f.innerHTML = LA.badgeSVG(l, earned, 76);
      f.appendChild(mk('figcaption', null, l.title));
      bc.appendChild(f);
    });
    $('badge-count').textContent = done + ' of ' + total + ' earned';
  }

  function card(l, nx) {
    var unlocked = LA.isUnlocked(l.id), p = LA.progressFor(l.id);
    var isNext = nx && nx.id === l.id;
    var c = unlocked ? mk('a', 'lab-card') : mk('button', 'lab-card is-locked');
    if (unlocked) c.href = l.file; else { c.type = 'button'; c.addEventListener('click', function () { openUnlock(l); }); }
    c.style.setProperty('--c', l.accent);
    c.setAttribute('data-lab', l.id);
    var status = !unlocked ? ['locked', 'Locked'] : p.passed ? ['done', 'Badge earned'] : isNext ? ['next', 'Up next'] : ['open', 'Unlocked'];
    if (isNext) c.appendChild(mk('span', 'upnext-flag', 'UP NEXT'));
    var top = mk('div', 'lc-top');
    var ic = mk('span', 'lc-icon'); ic.innerHTML = LA.iconSVG(unlocked ? l.icon : 'lock', 22);
    top.appendChild(ic);
    top.appendChild(mk('span', 'lc-num', 'LAB ' + pad(l.num)));
    top.appendChild(mk('span', 'status ' + status[0], status[1]));
    c.appendChild(top);
    c.appendChild(mk('span', 'lc-title', l.title));
    c.appendChild(mk('span', 'lc-sum', l.summary));
    var meta = mk('span', 'lc-meta');
    meta.appendChild(mk('span', 'chip', '⏱ ' + l.time));
    meta.appendChild(mk('span', 'chip', l.difficulty));
    meta.appendChild(mk('span', 'chip', 'Best: ' + (p.attempts ? p.best + '/' + p.total : '—')));
    c.appendChild(meta);
    c.setAttribute('aria-label', 'Lab ' + l.num + ': ' + l.title + '. Status: ' + status[1] + '. ' + l.time + ', ' + l.difficulty + '. Best score ' + (p.attempts ? p.best + ' of ' + p.total : 'none') + '.' + (unlocked ? '' : ' Activate to enter an access code.'));
    return c;
  }

  // Code entry
  $('code-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('code-input'), msg = $('code-msg');
    var m = LA.redeem(input.value);
    if (!m) { msg.className = 'small status-bad'; msg.textContent = 'That code was not recognised. Check it and try again.'; input.setAttribute('aria-invalid', 'true'); return; }
    input.value = ''; input.removeAttribute('aria-invalid');
    msg.className = 'small status-good';
    msg.textContent = m.type === 'master' ? 'Instructor master code accepted — all labs unlocked.' : 'Unlocked Lab ' + pad(m.lab.num) + ': ' + m.lab.title + '.';
    render();
  });

  // Unlock dialog
  var dlg = $('unlock-dialog'), target = null;
  function openUnlock(l, fromGuard) {
    target = l;
    $('unlock-title').textContent = 'Unlock Lab ' + pad(l.num) + ': ' + l.title;
    var prev = LA.LABS[l.num - 2];
    $('unlock-desc').textContent = (fromGuard ? 'This lab is locked. ' : '') + 'Enter its access code. You recover it by passing the quiz in Lab ' + pad(prev.num) + ' (' + prev.title + ').';
    $('unlock-input').value = ''; $('unlock-msg').textContent = '';
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    $('unlock-input').focus();
  }
  function closeDlg() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  $('unlock-cancel').addEventListener('click', closeDlg);
  $('unlock-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('unlock-input').value, msg = $('unlock-msg');
    if (!target) return;
    if (LA.checkCodeForLab(target.id, v)) {
      LA.redeem(v);
      msg.className = 'small status-good'; msg.textContent = 'Unlocked! Opening the lab…';
      location.href = target.file;
    } else {
      var other = LA.matchCode(v);
      msg.className = 'small status-bad';
      msg.textContent = other && other.type === 'lab' ? 'That is a valid code, but for Lab ' + pad(other.lab.num) + ', not this one.' : 'That code was not recognised.';
      $('unlock-input').setAttribute('aria-invalid', 'true');
    }
  });

  // Reset
  var rdlg = $('reset-dialog');
  $('reset-btn').addEventListener('click', function () { rdlg.showModal ? rdlg.showModal() : rdlg.setAttribute('open', ''); $('reset-cancel').focus(); });
  $('reset-cancel').addEventListener('click', function () { rdlg.close ? rdlg.close() : rdlg.removeAttribute('open'); });
  $('reset-confirm').addEventListener('click', function () {
    LA.resetProgress();
    rdlg.close ? rdlg.close() : rdlg.removeAttribute('open');
    render();
    $('main').focus();
  });

  render();

  // ?unlock=labNN from the lab-page guard
  var q = /[?&]unlock=(lab\d\d)/.exec(location.search);
  if (q) {
    var l = LA.getLab(q[1]);
    if (l && !LA.isUnlocked(l.id)) openUnlock(l, true);
    if (history.replaceState) history.replaceState(null, '', 'index.html');
  }
})();
