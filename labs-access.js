/* =========================================================================
   IDS Training — labs-access.js
   Lab catalogue, local profile storage, access codes, icons and badges.
   NOTE: access codes are a classroom pacing mechanic, NOT real security.
   Anyone can read them from this file or from localStorage.
   ========================================================================= */
(function (global) {
  'use strict';

  var STORE_KEY = 'idsTraining.v1';

  /* ---------- Tiers & catalogue ---------- */
  var TIERS = [
    { id: 1, name: 'User IDS Foundations', blurb: 'Build an isolated lab, switch on Linux and Windows auditing, and learn what “normal” looks like.' },
    { id: 2, name: 'User Detection & Response', blurb: 'Turn audit data into alerts, respond to incidents, report for compliance and pick the right tools.' },
    { id: 3, name: 'Network Intrusion Detection', blurb: 'Deploy Snort/Suricata, read network evidence, write your own signatures and dissect packets.' },
    { id: 4, name: 'Host IDS & Detection Analytics', blurb: 'Run a host-based IDS, then detect the unknown with statistics, machine learning and clustering.' }
  ];

  var LABS = [
    { id: 'lab01', tier: 1, title: 'Build the Virtual Lab', summary: 'Hypervisors, network modes, snapshots and isolation for safe security testing.', accent: '#7dd3fc', icon: 'vm', time: '25 min', difficulty: 'Beginner' },
    { id: 'lab02', tier: 1, title: 'Linux Auditing with Auditd', summary: 'Install auditd, write watch and syscall rules, and query events with ausearch and aureport.', accent: '#86efac', icon: 'terminal', time: '30 min', difficulty: 'Beginner' },
    { id: 'lab03', tier: 1, title: 'Windows Security Auditing', summary: 'Advanced Audit Policy, auditpol and the event IDs every analyst should know.', accent: '#93c5fd', icon: 'windows', time: '30 min', difficulty: 'Beginner' },
    { id: 'lab04', tier: 1, title: 'Baseline Normal User Behaviour', summary: 'Choose the right signals and build a baseline you can actually compare against.', accent: '#fcd34d', icon: 'baseline', time: '25 min', difficulty: 'Intermediate' },
    { id: 'lab05', tier: 1, title: 'Anomaly Detection for Users', summary: 'Thresholds, z-scores, peer groups and impossible travel — and their blind spots.', accent: '#f9a8d4', icon: 'radar', time: '30 min', difficulty: 'Intermediate' },
    { id: 'lab06', tier: 2, title: 'Alerts & Notifications', summary: 'Severity, thresholds, deduplication and routing without drowning in alert fatigue.', accent: '#fca5a5', icon: 'bell', time: '25 min', difficulty: 'Intermediate' },
    { id: 'lab07', tier: 2, title: 'Incident Response Drill', summary: 'Work a compromised-account incident through the NIST incident response life cycle.', accent: '#fdba74', icon: 'siren', time: '35 min', difficulty: 'Intermediate' },
    { id: 'lab08', tier: 2, title: 'Log Analysis & Compliance Reports', summary: 'Query user logs, protect their integrity and produce audit-ready reports.', accent: '#a5b4fc', icon: 'report', time: '30 min', difficulty: 'Intermediate' },
    { id: 'lab09', tier: 2, title: 'Evaluate User IDS Solutions', summary: 'Compare HIDS, SIEM and UEBA options with weighted, evidence-based criteria.', accent: '#5eead4', icon: 'scale', time: '25 min', difficulty: 'Intermediate' },
    { id: 'lab10', tier: 2, title: 'Final Project: User IDS', summary: 'Combine auditing, baselining, alerting and response in one end-to-end investigation.', accent: '#d8b4fe', icon: 'trophy', time: '40 min', difficulty: 'Advanced' },
    { id: 'lab11', tier: 3, title: 'Install Snort / Suricata', summary: 'Install an open-source NIDS on Linux, validate its configuration and fetch rules.', accent: '#67e8f9', icon: 'download', time: '30 min', difficulty: 'Intermediate' },
    { id: 'lab12', tier: 3, title: 'Configure NIDS Monitoring', summary: 'Sensor placement, HOME_NET, rule sources and alert outputs that analysts can use.', accent: '#bef264', icon: 'network', time: '30 min', difficulty: 'Intermediate' },
    { id: 'lab13', tier: 3, title: 'Analyse System & Network Logs', summary: 'Correlate auth, web, firewall and IDS logs to recognise attack patterns.', accent: '#fde68a', icon: 'search', time: '30 min', difficulty: 'Intermediate' },
    { id: 'lab14', tier: 3, title: 'Write Custom Snort Rules', summary: 'Rule anatomy, flags, thresholds and testing — detect port scans and ping floods.', accent: '#f0abfc', icon: 'code', time: '35 min', difficulty: 'Advanced' },
    { id: 'lab15', tier: 3, title: 'Packet Analysis with Wireshark', summary: 'Capture vs display filters, TCP flags, streams and spotting malicious packets.', accent: '#6ee7b7', icon: 'wave', time: '35 min', difficulty: 'Intermediate' },
    { id: 'lab16', tier: 4, title: 'Host IDS with OSSEC / Wazuh', summary: 'Manager and agents, file integrity monitoring, rule levels and active response.', accent: '#c4b5fd', icon: 'server', time: '30 min', difficulty: 'Intermediate' },
    { id: 'lab17', tier: 4, title: 'Statistical Anomaly Model', summary: 'Mean, standard deviation, z-scores and moving baselines on traffic data.', accent: '#fda4af', icon: 'curve', time: '30 min', difficulty: 'Advanced' },
    { id: 'lab18', tier: 4, title: 'Machine Learning IDS', summary: 'Features, labels, train/test splits and reading a confusion matrix honestly.', accent: '#99f6e4', icon: 'ml', time: '40 min', difficulty: 'Advanced' },
    { id: 'lab19', tier: 4, title: 'Clustering & Association Rules', summary: 'k-means, DBSCAN outliers and support/confidence/lift for unusual patterns.', accent: '#fed7aa', icon: 'clusters', time: '35 min', difficulty: 'Advanced' },
    { id: 'lab20', tier: 4, title: 'Mini Project: Build an IDS', summary: 'Design, build and evaluate a basic log-analysis intrusion detection pipeline.', accent: '#ffd166', icon: 'wrench', time: '45 min', difficulty: 'Advanced' }
  ];
  LABS.forEach(function (l, i) { l.num = i + 1; l.file = l.id + '.html'; });

  /* ---------- Access codes (base64 of the reversed display string) ---------- */
  var OBF = {
    lab02: 'NzItTk9DTEFGLVRJRFVB',
    lab03: 'NjQtUk9CUkFILVRORVZF',
    lab04: 'ODEtRElIQ1JPLUVOSUxFU0FC',
    lab05: 'MzUtTlJFVE5BTC1FUk9DU1o=',
    lab06: 'MTYtTkFJRElSRU0tVFJFTEE=',
    lab07: 'NDMtVExBQk9DLUVHQUlSVA==',
    lab08: 'MjctV09SUkFQUy1SRUdERUw=',
    lab09: 'OTItWVJSQVVRLVRDSURSRVY=',
    lab10: 'NTgtU1VCTUlOLUVOT1RTUEFD',
    lab11: 'MTQtQVJETlVULVJPU05FUw==',
    lab12: 'NjYtTk9DQUVCLVRFTkVNT0g=',
    lab13: 'ODMtUkVJQ0FMRy1OUkVUVEFQ',
    lab14: 'MzktUkVCTUUtRVJVVEFOR0lT',
    lab15: 'NzUtRExPR0lSQU0tUEFDUA==',
    lab16: 'NDItVElCUk8tS0NFSENTWVM=',
    lab17: 'OTctVFNFVlJBSC1BTUdJUw==',
    lab18: 'MjEtUkVIUElDLVRTRVJPRg==',
    lab19: 'ODgtTk9PR0FMLVNOQUVNSw==',
    lab20: 'NTQtQVJPUlVBLUVOSUxFUElQ'
  };
  var MASTER_OBF = 'MDcwOS1FRElSUkVWTy1MRU5JVE5FUw==';

  function deobf(s) { try { return atob(s).split('').reverse().join(''); } catch (e) { return ''; } }
  function obfuscate(code) { return btoa(String(code).toUpperCase().trim().split('').reverse().join('')); }
  function normalize(s) { return String(s || '').toUpperCase().replace(/[\s\-_–—]+/g, ''); }

  /* ---------- Storage ---------- */
  function readAll() {
    try {
      var raw = global.localStorage.getItem(STORE_KEY);
      var data = raw ? JSON.parse(raw) : null;
      if (data && typeof data === 'object' && data.profiles) return data;
    } catch (e) { /* storage blocked or corrupt */ }
    return { current: null, profiles: {} };
  }
  function writeAll(data) {
    try { global.localStorage.setItem(STORE_KEY, JSON.stringify(data)); return true; }
    catch (e) { return false; }
  }
  function blankProfile(name, cohort) {
    return { name: name, cohort: cohort || '', created: Date.now(), progress: {}, unlocked: ['lab01'], intel: [], cooldowns: {}, master: false };
  }
  function slug(name) { return normalize(name).toLowerCase().replace(/[^a-z0-9]/g, '') || 'student'; }

  function getProfile() {
    var d = readAll();
    return d.current && d.profiles[d.current] ? d.profiles[d.current] : null;
  }
  function update(fn) {
    var d = readAll();
    var p = d.current && d.profiles[d.current];
    if (!p) return null;
    fn(p);
    writeAll(d);
    return p;
  }
  function listProfiles() {
    var d = readAll();
    return Object.keys(d.profiles).map(function (k) { return { id: k, name: d.profiles[k].name, cohort: d.profiles[k].cohort }; });
  }
  function signIn(name, cohort) {
    name = String(name || '').trim().slice(0, 40);
    if (!name) return null;
    var d = readAll();
    var id = slug(name);
    if (!d.profiles[id]) d.profiles[id] = blankProfile(name, String(cohort || '').trim().slice(0, 40));
    else if (cohort) d.profiles[id].cohort = String(cohort).trim().slice(0, 40);
    d.current = id;
    writeAll(d);
    return d.profiles[id];
  }
  function signOut() { var d = readAll(); d.current = null; writeAll(d); }
  function resetProgress() {
    return update(function (p) { var n = blankProfile(p.name, p.cohort); n.created = p.created; Object.keys(n).forEach(function (k) { p[k] = n[k]; }); });
  }

  /* ---------- Lab helpers ---------- */
  function getLab(id) { for (var i = 0; i < LABS.length; i++) if (LABS[i].id === id) return LABS[i]; return null; }
  function nextLab(id) { var l = getLab(id); return l && l.num < LABS.length ? LABS[l.num] : null; }
  function isUnlocked(id) {
    var p = getProfile();
    if (!p) return false;
    return id === 'lab01' || p.master || p.unlocked.indexOf(id) !== -1;
  }
  function unlock(id) { return update(function (p) { if (p.unlocked.indexOf(id) === -1) p.unlocked.push(id); }); }
  function unlockAll() { return update(function (p) { p.master = true; LABS.forEach(function (l) { if (p.unlocked.indexOf(l.id) === -1) p.unlocked.push(l.id); }); }); }
  function codeFor(id) { return OBF[id] ? deobf(OBF[id]) : ''; }

  /** Returns {type:'master'} | {type:'lab', lab} | null */
  function matchCode(input) {
    var n = normalize(input);
    if (!n) return null;
    if (n === normalize(deobf(MASTER_OBF))) return { type: 'master' };
    for (var id in OBF) if (normalize(deobf(OBF[id])) === n) return { type: 'lab', lab: getLab(id) };
    return null;
  }
  function checkCodeForLab(id, input) {
    var m = matchCode(input);
    if (!m) return false;
    return m.type === 'master' || (m.lab && m.lab.id === id);
  }
  function redeem(input) {
    var m = matchCode(input);
    if (!m) return null;
    if (m.type === 'master') unlockAll();
    else { unlock(m.lab.id); addIntel(m.lab.id); }
    return m;
  }
  function addIntel(labId) {
    var code = codeFor(labId);
    if (!code) return;
    update(function (p) {
      if (!p.intel.some(function (x) { return x.lab === labId; })) p.intel.push({ lab: labId, code: code, at: Date.now() });
    });
  }

  function progressFor(id) {
    var p = getProfile();
    var g = (p && p.progress[id]) || {};
    return { chapter: g.chapter || 0, attempts: g.attempts || 0, best: g.best || 0, total: g.total || 6, passed: !!g.passed, passedAt: g.passedAt || null };
  }
  function setChapter(id, n) { update(function (p) { p.progress[id] = p.progress[id] || {}; p.progress[id].chapter = n; }); }
  function recordAttempt(id, score, total, passed) {
    update(function (p) {
      var g = p.progress[id] = p.progress[id] || {};
      g.attempts = (g.attempts || 0) + 1;
      g.total = total;
      if (score > (g.best || 0)) g.best = score;
      if (passed && !g.passed) { g.passed = true; g.passedAt = Date.now(); }
    });
    if (passed) { var nx = nextLab(id); if (nx) { addIntel(nx.id); } }
  }
  function cooldownUntil(id) { var p = getProfile(); return (p && p.cooldowns[id]) || 0; }
  function setCooldown(id, ms) { update(function (p) { p.cooldowns[id] = Date.now() + ms; }); }
  function completedCount() { var p = getProfile(); if (!p) return 0; return LABS.filter(function (l) { return p.progress[l.id] && p.progress[l.id].passed; }).length; }
  function upNext() {
    for (var i = 0; i < LABS.length; i++) { var l = LABS[i]; if (isUnlocked(l.id) && !progressFor(l.id).passed) return l; }
    return null;
  }

  /** Page guard: no profile -> sign-in; locked lab -> dashboard unlock dialog. */
  function guard(labId) {
    if (!getProfile()) { global.location.replace('signin.html'); return false; }
    if (labId && !isUnlocked(labId)) { global.location.replace('index.html?unlock=' + encodeURIComponent(labId)); return false; }
    return true;
  }

  /* ---------- Icons (24x24, stroke based) ---------- */
  var ICONS = {
    vm: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M7 8h4M7 11h7"/>',
    terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>',
    windows: '<path d="M3 5.5l7.5-1v7H3zM12.5 4.2L21 3v8.5h-8.5zM3 13.5h7.5v7L3 19.5zM12.5 13.5H21V21l-8.5-1.2z"/>',
    baseline: '<path d="M3 3v18h18"/><path d="M6 15l4-4 3 3 6-7"/><path d="M6 18h13" stroke-dasharray="2 2"/>',
    radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12l6.5-6.5"/><circle cx="16.5" cy="9" r="1.2" fill="currentColor"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    siren: '<path d="M12 3l8 3v6c0 4.8-3.4 8-8 9-4.6-1-8-4.2-8-9V6z"/><path d="M12 8v5M12 16.2v.3"/>',
    report: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
    scale: '<path d="M12 3v17M5 7h14M8 21h8"/><path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9.5 17h5v4h-5z"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    network: '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M12 7.2V12M12 12l-5.5 5.2M12 12l5.5 5.2"/>',
    search: '<path d="M4 5h11M4 9h8M4 13h5"/><circle cx="15.5" cy="15.5" r="4"/><path d="M18.5 18.5L22 22"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
    wave: '<path d="M2 12h3l2-6 4 12 3-9 2 3h6"/>',
    server: '<rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/><path d="M8 7h.01M8 17h.01M12 10v4"/>',
    curve: '<path d="M3 20h18"/><path d="M4 19c3 0 4.5-14 8-14s5 14 8 14"/><path d="M12 5v15" stroke-dasharray="2 2"/>',
    ml: '<circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="7" r="2"/><circle cx="19" cy="17" r="2"/><path d="M7 6.8l3.2 4M7 17.2l3.2-4M14 11l3.2-3M14 13l3.2 3"/>',
    clusters: '<circle cx="6" cy="7" r="1.6"/><circle cx="9" cy="5" r="1.6"/><circle cx="8" cy="9.5" r="1.6"/><circle cx="16" cy="15" r="1.6"/><circle cx="18.5" cy="18" r="1.6"/><circle cx="15" cy="19" r="1.6"/><circle cx="19" cy="5" r="1.6"/><path d="M3 3h9v9H3zM12 12h9v9h-9z" stroke-dasharray="2 2"/>',
    wrench: '<path d="M14.5 6.5a4 4 0 0 0 5 5L11 20a2.1 2.1 0 0 1-3-3l8.5-8.5"/><path d="M14.5 6.5L17 4l3 3-2.5 2.5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l2 2"/>'
  };
  function iconSVG(key, size, extraClass) {
    size = size || 24;
    return '<svg class="icon ' + (extraClass || '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[key] || ICONS.lock) + '</svg>';
  }

  /** Hexagon badge SVG. Earned = filled with lab accent. */
  function badgeSVG(lab, earned, size) {
    size = size || 96;
    var fill = earned ? lab.accent : '#1a2338';
    var stroke = earned ? '#ffffff' : '#4a5a80';
    var ink = earned ? '#0b1020' : '#7f8db0';
    var label = 'Lab ' + (lab.num < 10 ? '0' : '') + lab.num + ' badge: ' + lab.title + (earned ? ' (earned)' : ' (not yet earned)');
    return '<svg class="badge-svg' + (earned ? ' is-earned' : '') + '" width="' + size + '" height="' + Math.round(size * 1.1) + '" viewBox="0 0 100 110" role="img" aria-label="' + label.replace(/"/g, '&quot;') + '">' +
      '<polygon points="50,4 94,29 94,81 50,106 6,81 6,29" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3" ' + (earned ? '' : 'stroke-dasharray="6 5"') + '/>' +
      '<polygon points="50,14 85,34 85,76 50,96 15,76 15,34" fill="none" stroke="' + ink + '" stroke-opacity=".35" stroke-width="1.5"/>' +
      '<g transform="translate(32 26) scale(1.5)" fill="none" stroke="' + ink + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (earned ? (ICONS[lab.icon] || '') : ICONS.lock) + '</g>' +
      '<text x="50" y="86" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="' + ink + '">' + (lab.num < 10 ? '0' : '') + lab.num + '</text>' +
      '</svg>';
  }

  global.LabsAccess = {
    TIERS: TIERS, LABS: LABS, MASTER_OBF: MASTER_OBF,
    getLab: getLab, nextLab: nextLab, getProfile: getProfile, listProfiles: listProfiles,
    signIn: signIn, signOut: signOut, resetProgress: resetProgress,
    isUnlocked: isUnlocked, unlock: unlock, unlockAll: unlockAll, codeFor: codeFor,
    matchCode: matchCode, checkCodeForLab: checkCodeForLab, redeem: redeem, addIntel: addIntel,
    normalize: normalize, obfuscate: obfuscate,
    progressFor: progressFor, setChapter: setChapter, recordAttempt: recordAttempt,
    cooldownUntil: cooldownUntil, setCooldown: setCooldown, completedCount: completedCount, upNext: upNext,
    guard: guard, iconSVG: iconSVG, badgeSVG: badgeSVG
  };
})(window);
