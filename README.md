# IDS Training

An interactive, browser-only training suite on **Intrusion Detection Systems** for students: 20 hands-on labs in four tiers, with simulations, scenario decisions, quizzes, badges and access codes that pace progress between labs.

No build step, no backend, no dependencies. Everything runs from static files and is stored in the browser's `localStorage`.

> **Access codes are a training mechanic, not real security.** The codes are only obfuscated (base64 of the reversed string) and anyone can recover them from `labs-access.js` or browser storage. They keep a class moving at the same pace; they don't protect anything. Never reuse them as passwords.

## Labs

| Tier | Labs |
|---|---|
| **1 · User IDS Foundations** | 01 Build the Virtual Lab · 02 Linux Auditing with Auditd · 03 Windows Security Auditing · 04 Baseline Normal User Behaviour · 05 Anomaly Detection for Users |
| **2 · User Detection & Response** | 06 Alerts & Notifications · 07 Incident Response Drill · 08 Log Analysis & Compliance Reports · 09 Evaluate User IDS Solutions · 10 Final Project: User IDS |
| **3 · Network Intrusion Detection** | 11 Install Snort / Suricata · 12 Configure NIDS Monitoring · 13 Analyse System & Network Logs · 14 Write Custom Snort Rules · 15 Packet Analysis with Wireshark |
| **4 · Host IDS & Detection Analytics** | 16 Host IDS with OSSEC / Wazuh · 17 Statistical Anomaly Model · 18 Machine Learning IDS · 19 Clustering & Association Rules · 20 Mini Project: Build an IDS |

Each lab has four chapters: **Briefing** (hook, three fact cards, objectives, myth/fact cards) → **Scenario** (a realistic story with good/partial/bad decisions) → **Practice** (simulations: terminals, builders, spot-the-red-flags mocks, triage sorts, charts) → **Playbook** (rules, pull quote, quiz).

All attack activity in the content is framed for an isolated lab you own. Statistics on the stat cards are technical facts (event IDs, ports, standards clauses), not invented survey numbers.

## How to run

- **Locally:** open `signin.html` in a browser (double-click works; `file://` is supported).
- **Any static host:** e.g. GitHub Pages — publish the repository root and visit `/signin.html` (or `/index.html`, which redirects to sign-in when there is no profile).
- **Local server (optional):** `python3 -m http.server 8000` then open http://localhost:8000/signin.html

### Tests

Requires Node and Playwright with Chromium.

```bash
node tests/e2e.js                                  # serves the repo on a random local port
BASE=file://$PWD/ node tests/e2e.js                # test via file:// instead
SHOTS=/tmp/shots node tests/e2e.js                 # also save screenshots
```

The suite runs at 1280 px and 390 px and checks: no console errors, no horizontal overflow on any chapter, every interaction type (terminals completed via hints, choices, flags, sorts, myths, checklists, sims), arrow-key navigation, resume-at-last-chapter, randomised quiz draws, fail → cooldown (persisting across reloads) + review, pass via A–D/Enter → badge + next lab's code + "Unlock & open", lock-guard redirect, case/space-insensitive codes, and the master code.

## Architecture

```
signin.html      local profile (name + optional cohort); several profiles per browser
index.html       dashboard (markup) + dashboard.js (rendering & dialogs)
lab01–20.html    one page per lab: a thin shell + ModuleKit.mount({...content...})
labs-access.js   catalogue (tiers, labs, accent, icon), storage, access codes, guard, icons, hexagon badges
module-kit.css   the design system (dark SOC theme; each lab sets --accent)
module-kit.js    lab layout (tabs, progress bar, keyboard, resume) + components:
                 choice · redflags · sort · myths · terminal · checklist · custom · html
assessment.js    quiz engine (draw, shuffle, scoring, cooldown, review, intel reveal)
questions.js     question banks: QUESTIONS.labNN = [8 questions: 4 core + 4 scenario]
tests/e2e.js     Playwright checks
```

**Storage.** One key, `idsTraining.v1`, holds `{ current, profiles: { id: { name, cohort, progress, unlocked, intel, cooldowns, master } } }`. `progress[labId]` stores the last chapter, attempts, best score and pass state.

**Quiz rules.** Each attempt draws 3 core + 3 scenario questions at random and shuffles answer order. Pass mark 5/6. A fail starts a 30-second cooldown (stored, so reloading doesn't skip it) and lists missed questions with explanations. Every answer shows an explanation. Keyboard: <kbd>A</kbd>–<kbd>D</kbd> answers, <kbd>Enter</kbd> continues. Distractors are written to be similar in length to the correct answer.

**Access flow.** Lab 01 is open. Passing lab *N* reveals lab *N+1*'s code ("Intel recovered") with Copy and "Unlock & open next lab", and saves it to the dashboard's Intel Vault. Every lab page calls `LabsAccess.guard('labNN')` in its `<head>`: no profile → `signin.html`; locked → `index.html?unlock=labNN`, which opens the unlock dialog.

**Safety.** Anything a user types (name, cohort, codes, terminal commands, filters) is inserted with `textContent` only. Authored lab content is the only HTML that is injected.

**Accessibility.** Real buttons/links everywhere, visible focus outlines, ≥44 px touch targets, labelled inputs, `aria-live` feedback, text labels on every colour-coded state, a timer that can be switched off (Lab 07), and `prefers-reduced-motion` support.

## Add a lab

1. Add an entry to `LABS` in `labs-access.js` (`id`, `tier`, `title`, `summary`, `accent`, `icon`, `time`, `difficulty`). Add an icon to `ICONS` if needed.
2. Add an access code for it to `OBF` (see below). The previous final lab's pass screen will then reveal it automatically.
3. Copy an existing `labNN.html`, change the id in `LabsAccess.guard('labNN')` and `ModuleKit.mount({ id: 'labNN', ... })`, and write the four chapters. Block types:
   - `{ type: 'choice', title, prompt, options: [{ text, verdict: 'good'|'partial'|'bad', why }] }`
   - `{ type: 'redflags', title, header, dark, mono, items: [{ text, flag: true|false, why }] }`
   - `{ type: 'sort', title, left, right, items: [{ text, answer: 'left'|'right', why }] }`
   - `{ type: 'myths', items: [{ myth, fact }] }` (usually in `briefing.blocks`)
   - `{ type: 'terminal', host, prompt, motd, tasks: [{ goal, match: /regex/, hint, output, note }], extra, success }`
   - `{ type: 'checklist', title, items: [{ text, weight, why }] }` (negative weight = risky option)
   - `{ type: 'custom', title, render(host, K) { ... } }` for bespoke simulations (`K` = ModuleKit helpers, incl. `lineChart`, `mean`, `std`, `setFeedback`)
4. Add `QUESTIONS.labNN` to `questions.js`: 8 questions, `level: 'core'` ×4 and `'scenario'` ×4, `options` (4), `answer` (index), `explain`.
5. Run the tests (they loop over 20 lab ids — update `LAB_IDS` and the card counts if the total changes).

## Change the codes

Codes are stored as base64 of the reversed display string. In the browser console on any page:

```js
LabsAccess.obfuscate('NEW-CODE-42')   // → paste the result into OBF.labNN (or MASTER_OBF)
```

Matching ignores case, spaces and dashes. Keep the instructor sheet (`instructor-codes.md`) out of the repository; it is listed in `.gitignore`.

## Known limitations

- Codes and answers can be read by anyone who opens the source or devtools. This is a classroom pacing tool, not an exam-security system.
- Progress lives only in one browser on one device. Clearing site data, private windows or blocked storage lose it; there's no export or sync.
- "Profiles" are local names, not authenticated accounts; anyone using the same browser can switch profiles.
- Terminals, packet analyser and rule tester are simulations with scripted outputs and simplified semantics (e.g. the rule tester's alert counts). They teach the commands and reasoning, not a full emulation. Version numbers in outputs are illustrative.
- Tool versions and defaults change (Suricata, Snort 3, Wazuh, Windows audit defaults, compliance standards). Review content each term.
- The dark theme is the only theme.
