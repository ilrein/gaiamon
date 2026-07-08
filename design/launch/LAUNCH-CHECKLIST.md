# Launch checklist (ordered)

For the human. Nothing below is automated — check each box yourself.

## 1. Pre-public repo hygiene (do BEFORE flipping to public — history goes public too)

- [ ] **Rotate the OpenAI key.** A key was pasted into a chat session on
      2026-07-02 and flagged for rotation. Rotate it at
      platform.openai.com regardless of whether it ever touched the repo.
- [ ] **Verify `.env` never touched git history** (not just the working tree):
      ```bash
      git log --all --diff-filter=A --name-only -- '.env' '*.env' '.env.*'
      git log --all --oneline -- .env
      ```
      Both should return nothing (`.env.example` is fine and expected).
- [ ] **Full-history secrets scan:**
      ```bash
      brew install gitleaks
      gitleaks git --redact -v .
      # belt-and-suspenders alternative:
      # trufflehog git file://. --only-verified
      ```
      Any hit = rotate the credential AND rewrite history
      (`git filter-repo`) before going public. Rotation alone is the
      minimum; rewriting is optional if the credential is dead.
- [ ] **Grep for stray identifiers** you may not want public (account IDs are
      low-risk but check deliberately):
      ```bash
      git grep -iE 'api[_-]?key|secret|token|password' -- ':!*.lock'
      ```
- [ ] **LICENSE present** (MIT) and **CREDITS.md accurate** — in particular,
      verify the exact CC variant of each Screen Smith pack actually bundled
      and record it (CREDITS.md still says "planned"/"verify per pack").
- [ ] README links all resolve (DISCUSSION.md, design/*, /proto-preview).
- [ ] Confirm no Cloudflare API tokens in the repo — CI is a pure quality
      gate and Workers Builds handles deploys, so none should be needed.

## 2. Make the repo public

- [ ] GitHub → Settings → change visibility → public.
- [ ] Immediately re-check: Actions still green, Workers Builds still
      deploying on push (it was set up while private).
- [ ] Enable GitHub Discussions (see §5) and issue templates if desired.
- [ ] Add repo topics: `game`, `mmo`, `threejs`, `cloudflare-workers`,
      `sdf`, `raymarching`, `open-source-game`.
- [ ] Pin a good social preview image (repo Settings → Social preview —
      the og-image works).

## 3. Stagger the launch

Do NOT fire everything at once — you can't respond well to two fronts.

- [ ] **Day 0 morning (weekday, ~8–10am ET is the usual HN window):**
      submit Show HN from `design/launch/SHOW_HN.md`. Stay at the keyboard
      for the first 3–4 hours; first-hour replies decide the thread.
- [ ] **Day 0 late / Day 1:** post the X thread from
      `design/launch/DEVLOG-THREAD.md`, linking the HN discussion if it
      went well (social proof) or standalone if it didn't.
- [ ] Record the `[clip]` footage BEFORE launch day: proto-preview orbit,
      the five verbs, a phone battle, two-browser presence.
- [ ] Do not submit to multiple aggregators (lobste.rs, reddit) same-day;
      space them over the following week.

## 4. What to monitor on launch day

- [ ] **Cloudflare dashboard → Workers & Pages → gaiamon:** requests,
      errors (wrangler tail or the dashboard live logs), CPU time.
- [ ] **The analytics events that now exist** — watch session starts,
      battle starts, sync events for funnel drop-off (mobile vs desktop
      especially; the game claims one-thumb playability, verify people
      actually get past the title on phones).
- [ ] GitHub: issues, PRs, stars (stars are vanity; issues are signal).
- [ ] HN thread + X replies — answer technical questions fast, concede
      rough edges faster.
- [ ] Browser console errors from real devices you don't own: check for
      WebGL failures on the proto-preview page (raymarching on weak GPUs
      is the likeliest breakage).

## 5. Community setup (before going public, so links exist on day 0)

- [ ] **GitHub Discussions on** — categories: Announcements, Creature
      Ideas, Q&A, Show & Tell. Lower friction than Discord for an OSS
      repo; start here.
- [ ] **Discord: defer** unless HN/X traction demands it. An empty Discord
      is worse than none. If created, one channel (#gaiamon) until it
      outgrows it.
- [ ] **CONTRIBUTING.md** — write a short one that mostly points at
      design/PROCEDURAL-CREATURES.md ("PR a creature" is the contribution
      you actually want) and restates the CREDITS.md art-disclosure rule.
- [ ] Good-first-issue labels on 3–5 real, scoped tasks (e.g. "add a
      species: <concept>", a small UI bug) so arrivals have somewhere
      to land.

## 6. Day-1 traffic ops note (Workers free tier)

- **Free tier limits: 100,000 requests/day and 10ms CPU/request.** A page
  load is many requests (bundle chunks, sprites, audio) — static assets
  served via Workers Assets do NOT count against the request limit, but
  every `/api/*` hit does. A strong HN front-page day is tens of thousands
  of visitors; API-light design should survive, but:
- [ ] Know the failure mode: at the cap the Worker returns errors for the
      rest of the day (UTC reset). Decide NOW whether you'll upgrade to
      Workers Paid ($5/mo, 10M requests) — honestly, just do this before
      launch day. It removes the whole class of problem.
- [ ] Verify heavy assets are actually on the static-asset path, not
      proxied through Worker code.
- [ ] Keep the worker script under the 3MB gzipped limit — check the last
      deploy output before launch.
- [ ] Have a static fallback plan if the origin melts: the game saves
      locally and most of the experience is client-side, so the worst
      case is degraded, not dead — say so calmly in the thread if it
      happens.
