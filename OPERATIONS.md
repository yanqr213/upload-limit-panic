# Operations

## Immediate Goal

Validate a zero-domain, no-sales monetization path by making Upload Limit Panic good enough for an HTML5 game platform review.

## Submission Checklist

1. Run `npm.cmd run build`.
2. Run `npm.cmd run verify`.
3. Run `npm.cmd run verify:analytics`.
4. Run `npm.cmd run smoke`.
5. Run `npm.cmd run demo:video`.
6. Run `npm.cmd run submission`.
7. Run `npm.cmd run package`.
8. Upload `reports/upload-limit-panic-html5.zip` for itch.io, use the `dist/` contents for platforms that request loose HTML5 files, or use the public Release pack: https://github.com/yanqr213/upload-limit-panic/releases/tag/platform-submission-v1.
9. Include `reports/desktop-smoke.png`, `reports/mobile-smoke.png`, and `reports/upload-limit-panic-demo.mp4` as submission media when useful.

## Recommended Platform Order

1. CrazyGames: best fit for HTML5 arcade review and later platform ads, but not instant revenue.
2. itch.io: easiest zero-domain public page, useful for collecting plays and screenshots, but ad revenue is not the main path.
3. GitHub Pages or Cloudflare Pages: fallback demo hosting if a platform submission needs a public URL.
4. Douyin mini-game: later port only after account/audit requirements are clear.

## Ad Safety Rules

- Keep standalone ads disabled.
- Rewarded ads may only be optional hints, retry, revive, or bonus time.
- Never instruct users to click ads.
- Never label ads as gameplay buttons.
- Never make false claims about guaranteed upload acceptance, compression ratio, rankings, or revenue.

## Morning Review Gates

- `reports/verification.json` status is `passed`.
- `reports/analytics-verification.json` status is `passed`.
- `reports/smoke.json` status is `passed`.
- `reports/demo-video.json` status is `passed`.
- `reports/platform-submission.json` exists and includes live URL, controls, and ad-safety notes.
- Desktop and mobile screenshots show a nonblank playable canvas.
- Packaged ZIP is present, has `index.html` at archive root, and is under 10 MB.
- No secrets are present in source files.
- `/api/metrics` returns aggregate counts after at least one tracked play session.
- GitHub Release `platform-submission-v1` contains ZIP, MP4, submission notes, and verification reports.

## Revenue Reality

This route is lower cash risk than buying a domain, but it is not same-day payout. The first monetizable proof is platform acceptance plus measurable plays. The first ad-revenue proof requires platform ad eligibility and payout setup.
