# Upload Limit Panic Submission Copy Pack

Generated: 2026-06-02T00:36:19.117Z

## No-domain decision

- Submit to CrazyGames first because it has a self-serve developer portal, platform-hosted distribution, SDK-based ads, and payout setup through Tipalti after revenue eligibility.
- Submit to Yandex Games second because it supports platform catalog discovery, SDK-based ad monetization, and publisher-console metrics.
- Publish an itch.io mirror only as a free browser-play backup and feedback surface, not as the main advertising route.

## Parked routes

- GameDistribution can be evaluated after the first two platforms because it is a revenue-share distributor, but it adds another SDK and lower control over downstream portals.
- Douyin and Bilibili mini-game routes are not first because they require extra platform accounts, local mini-game packaging, domestic compliance review, and more account-side setup.

## 1. CrazyGames

Submission URL: https://developer.crazygames.com/

Monetization expectation: Basic Launch can validate quality first. Ads and revenue share depend on platform selection, ad eligibility, and payment setup.

Source notes:

- CrazyGames documents Basic Launch ads as disabled/no revenue share until later eligibility.
- CrazyGames payouts require billing setup and have a minimum payout threshold.

Copy fields:

### title

Upload Limit Panic

### shortDescription

Sort files into Compress, Convert, Send, or Trash before the upload queue bursts.

### longDescription

Upload Limit Panic is a fast HTML5 sorting game about everyday file-upload problems. Every round throws a new file into the queue: oversized PDFs, wrong-format images, clean files, and duplicates. The player has 60 seconds to sort each file into Compress, Convert, Send, or Trash while the queue pressure rises. It is readable in seconds, works with keyboard or touch controls, and is built as a standalone browser game for zero-domain platform validation.

### genre

Arcade, Puzzle, Sorting

### tags

html5, arcade, sorting, files, puzzle, casual, browser, no-login

### controls

1/2/3/4 keys or touch lane buttons; H for hint.

### deviceSupport

Desktop browser, Mobile browser, Tablet browser

### language

English

### contentRating

Everyone / no violence / no gambling / no personal data collection

### uploadPackage

https://github.com/yanqr213/upload-limit-panic/releases/download/platform-submission-v1/upload-limit-panic-html5.zip

### livePreview

https://upload-limit-panic.pages.dev/

### sdkAndAdsNote

CrazyGames SDK v3 is dynamically loaded only in CrazyGames context. loadingStop, gameplayStart, and gameplayStop hooks are present. Ads are disabled by default for Basic Launch; rewarded placements are gated behind an explicit ads flag and should only be enabled after platform approval.

### complianceNote

Standalone and Basic Launch builds do not request ads. External tool CTA is hidden in CrazyGames and Yandex contexts. All game files use relative paths and the current package is under 500KB.

## 2. Yandex Games

Submission URL: https://yandex.com/dev/games/

Monetization expectation: Internal monetization can be enabled after publishing and payment details are accepted in the Yandex/YAN partner flow.

Source notes:

- Yandex Games monetization depends on real plays, user retention, ratings, and ad requests through the SDK.
- The build includes LoadingAPI.ready, GameplayAPI start/stop, and gated rewarded/fullscreen ad calls.

Copy fields:

### title

Upload Limit Panic

### shortDescription

Sort files into Compress, Convert, Send, or Trash before the upload queue bursts.

### longDescription

A short file-sorting arcade game with simple touch controls, clear score feedback, and optional platform-approved rewarded assists.

### genre

Arcade, Puzzle, Sorting

### tags

html5, arcade, sorting, files, puzzle, casual, browser, no-login

### controls

Keyboard: 1 Compress, 2 Convert, 3 Send, 4 Trash, H Hint. Mouse or touch: tap the lane buttons or side-panel lane controls.

### orientation

Responsive landscape-first layout with desktop keyboard and mobile touch controls.

### language

English

### ageRating

Everyone; no violence, gambling, personal data collection, or payments in the standalone build.

### uploadPackage

https://github.com/yanqr213/upload-limit-panic/releases/download/platform-submission-v1/upload-limit-panic-html5.zip

### livePreview

https://upload-limit-panic.pages.dev/

### sdkAndAdsNote

Yandex SDK v2 is dynamically loaded only in Yandex context. LoadingAPI.ready and GameplayAPI start/stop hooks are present. showRewardedVideo and showFullscreenAdv calls are gated and disabled unless the platform context is ready and ads=1 is present.

### complianceNote

Standalone build does not request ads. External tool CTA is hidden in platform contexts. The package is self-contained and uses relative local asset paths.

## 3. itch.io

Submission URL: https://itch.io/game/new

Monetization expectation: Use as a free browser mirror and feedback page. Keep payments disabled during validation.

Source notes:

- The HTML ZIP is packaged with index.html at the root and can run as an embedded browser game.
- This is not the primary ad-revenue route.

Copy fields:

### projectName

Upload Limit Panic

### classification

Game

### kindOfProject

HTML

### pricing

No payments

### embedSetting

Run in browser

### shortText

Sort files into Compress, Convert, Send, or Trash before the upload queue bursts.

### description

Upload Limit Panic is a fast HTML5 sorting game about everyday file-upload problems. Every round throws a new file into the queue: oversized PDFs, wrong-format images, clean files, and duplicates. The player has 60 seconds to sort each file into Compress, Convert, Send, or Trash while the queue pressure rises. It is readable in seconds, works with keyboard or touch controls, and is built as a standalone browser game for zero-domain platform validation.

Controls: Keyboard: 1 Compress, 2 Convert, 3 Send, 4 Trash, H Hint. Mouse or touch: tap the lane buttons or side-panel lane controls.

This is a free validation build. It has no forced ads, no login, and no in-app purchases.

### tags

html5, arcade, sorting, files, puzzle, casual, browser, no-login

### uploadPackage

reports/upload-limit-panic-html5.zip

### coverText

Sort files before the upload queue bursts.

## Asset links

- icon512: reports/upload-limit-panic-icon-512.png
- releaseIcon512: https://github.com/yanqr213/upload-limit-panic/releases/download/platform-submission-v1/upload-limit-panic-icon-512.png
- cover16x9: reports/upload-limit-panic-cover-16x9.png
- releaseCover16x9: https://github.com/yanqr213/upload-limit-panic/releases/download/platform-submission-v1/upload-limit-panic-cover-16x9.png
- socialCard: reports/upload-limit-panic-social-card.png
- releaseSocialCard: https://github.com/yanqr213/upload-limit-panic/releases/download/platform-submission-v1/upload-limit-panic-social-card.png
- desktopScreenshot: reports/desktop-smoke.png
- mobileScreenshot: reports/mobile-smoke.png
- demoVideo: reports/upload-limit-panic-demo.mp4
- releaseDemoVideo: https://github.com/yanqr213/upload-limit-panic/releases/download/platform-submission-v1/upload-limit-panic-demo.mp4
- releasePage: https://github.com/yanqr213/upload-limit-panic/releases/tag/platform-submission-v1

## Validation gate

- Use the HTML5 ZIP with index.html at the archive root.
- Keep standalone ads disabled until the platform accepts or requests monetization activation.
- Do not use ad-click inducement copy in titles, buttons, screenshots, or descriptions.
- Use platform SDK lifecycle hooks for loading and gameplay state.
- Hide external links in CrazyGames and Yandex embedded contexts.
