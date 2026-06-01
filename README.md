# Upload Limit Panic

Upload Limit Panic is a zero-domain HTML5 arcade game prototype for platform-ad validation. The player sorts files into four lanes before the upload queue bursts:

- Compress: file is too large for the upload limit.
- Convert: file has the wrong format.
- Send: file is already acceptable.
- Trash: file is a duplicate.

The goal is not to replace PrintableTools Lab. It is a second, zero-cost monetization path: upload a self-contained HTML5 game to platforms that can later enable display, interstitial, or rewarded ads after review.

## Why This Direction

- No purchased domain is required for the first validation loop.
- It uses a familiar pain: upload limits, PDF size, image size, and wrong file formats.
- It can create short demo videos naturally because the action is visible in seconds.
- It links back to PrintableTools Lab without pretending the game itself is a utility.
- Rewarded ads are optional hooks, not forced ad clicks.

## Current Build

Run:

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run verify
npm.cmd run smoke
npm.cmd run demo:video
npm.cmd run submission
npm.cmd run package
```

Outputs:

- `dist/`: static HTML5 game.
- `reports/desktop-smoke.png`: desktop visual check.
- `reports/mobile-smoke.png`: mobile visual check.
- `reports/upload-limit-panic-demo.mp4`: short gameplay demo for platform review.
- `reports/platform-submission.json`: copy-ready platform metadata.
- `reports/platform-submission.md`: human-readable submission notes.
- `reports/upload-limit-panic-html5.tar.gz`: platform upload package.
- `reports/upload-limit-panic-html5.zip`: itch.io-ready HTML5 upload package.

## Monetization Path

1. Submit the HTML5 build to a platform such as CrazyGames or itch.io.
2. Use the platform review stage to test retention and feedback.
3. Add the platform SDK only when the platform allows ads.
4. Use rewarded ads only for optional hints, retry, revive, or bonus time.
5. Do not block basic gameplay behind ad viewing.
6. Do not ask users to click ads or watch ads for external rewards.

## Account Checklist

- CrazyGames developer account: required for submission and later ad eligibility. No domain purchase is required.
- itch.io account: required only to publish a public HTML5 page; upload `reports/upload-limit-panic-html5.zip`.
- Tipalti or platform payout profile: required only after platform revenue becomes payable.
- Douyin mini-game account: optional later port; do not start until platform feedback proves the gameplay loop is worth porting.

## Validation Gates

- Gate 1: Browser smoke passes on desktop and mobile.
- Gate 2: A real user can understand the game in 30 seconds.
- Gate 3: At least one platform submission remains live or pending review.
- Gate 4: 100 plays or equivalent platform analytics before making more levels.
- Gate 5: If platform review rejects the game for quality, improve controls and session length before adding monetization work.

## Platform Notes

CrazyGames is a useful zero-domain target, but Basic Launch does not mean immediate ad revenue. The realistic first milestone is live/pending platform review, then retention, then Full Launch/ad SDK readiness. This avoids risky ad-click behavior and protects the ad account path.

For Douyin mini-game, this prototype should be treated as gameplay validation only. A later port must follow Douyin developer account, audit, and ad-placement rules.
