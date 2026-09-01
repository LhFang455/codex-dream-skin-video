# Codex Dream Skin v1.5.16 100 MiB Video Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the personal video-enabled build to upstream v1.5.16 and make local MP4/WebM themes up to 100 MiB switch reliably without recompression or false success.

**Architecture:** Merge the exact upstream v1.5.16 release tag, then keep video behavior in the canonical `runtime/` sources and regenerate both platform assets. A persistent tokenized loopback server streams every video with a fingerprinted, non-cacheable URL; the watcher owns video hot switching and acknowledges success only after renderer playback verification.

**Tech Stack:** Bash 3.2, Node.js ESM, Chrome DevTools Protocol, local HTTP Range responses, Swift menu-bar app, Node test runner, SwiftPM, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-01-v1516-100m-video-design.md`

## Global Constraints

- Base the implementation on upstream tag `v1.5.16` (`816e565`) rather than a moving `origin/main`.
- Keep the installed product name and formal path as `/Applications/Codex Dream Skin.app`.
- Accept local MP4/WebM files from 1 byte through exactly 100 MiB (`104857600` bytes); reject larger or empty video files.
- Never transcode, resize, or recompress a video.
- Never place video bytes in the CDP JavaScript payload, regardless of file size.
- Bind the video server only to `127.0.0.1` and require the random route token.
- Preserve all existing image-theme behavior and Windows image support; do not add Windows video UI.
- Keep the existing upstream copyright, license, and attribution.
- Do not replace the installed App or close Codex/ChatGPT until the user has been asked at the final installation gate.

---

### Task 1: Isolated v1.5.16 Baseline Merge

**Files:**
- Merge: upstream tag `v1.5.16`
- Preserve: `docs/superpowers/specs/2026-09-01-v1516-100m-video-design.md`
- Preserve: `macos/scripts/load-video-theme-macos.sh`
- Preserve: `macos/tests/video-operation-completion.test.mjs`
- Preserve: `macos/tests/video-stream-payload.test.mjs`
- Resolve from upstream initially: `runtime/dream-skin.css`, `runtime/renderer-inject.js`, `macos/assets/dream-skin.css`, `macos/assets/renderer-inject.js`, `windows/assets/dream-skin.css`, `windows/assets/renderer-inject.js`, `macos/scripts/common-macos.sh`, `macos/scripts/injector.mjs`, `macos/tests/injector-bootstrap.test.mjs`

**Interfaces:**
- Consumes: current `main` at or after design commit `335d3f8`, local tag `v1.5.16`.
- Produces: an isolated branch whose version sources and upstream compatibility code are exactly v1.5.16 before video logic is reapplied.

- [ ] **Step 1: Create an isolated worktree**

Run the `superpowers:using-git-worktrees` skill and create branch `codex/v1516-video-100m` from current `main`. Confirm `git status --short` is empty before merging.

- [ ] **Step 2: Merge the exact release tag without moving to post-release main**

```bash
git merge --no-ff v1.5.16
```

Expected: conflicts only in the nine files listed above. Stop if a different application/runtime file conflicts and inspect it before resolving.

- [ ] **Step 3: Resolve the canonical baseline deliberately**

For the nine known conflicts, start from the v1.5.16 forms. Do not resolve generated platform assets manually. Preserve unique video entry scripts/tests and the design documents from the personal branch.

```bash
git restore --source=v1.5.16 --staged --worktree -- \
  runtime/dream-skin.css runtime/renderer-inject.js \
  macos/assets/dream-skin.css macos/assets/renderer-inject.js \
  windows/assets/dream-skin.css windows/assets/renderer-inject.js \
  macos/scripts/common-macos.sh macos/scripts/injector.mjs \
  macos/tests/injector-bootstrap.test.mjs
git add runtime macos windows
git commit
```

Expected merge commit message: `Merge upstream v1.5.16 into video edition`.

- [ ] **Step 4: Verify the upstream baseline and expected video-red state**

```bash
test "$(tr -d '[:space:]' < macos/VERSION)" = "1.5.16"
node tools/sync-runtime-assets.mjs --check
node --test tools/*.test.mjs macos/tests/injector-bootstrap.test.mjs
node --test macos/tests/video-operation-completion.test.mjs macos/tests/video-stream-payload.test.mjs
```

Expected: upstream/runtime tests pass; video tests fail because Task 2–5 have not yet restored the video contract. Record the exact failures and do not change unrelated upstream behavior.

---

### Task 2: Canonical Video Runtime on v1.5.16

**Files:**
- Modify: `runtime/renderer-inject.js`
- Modify: `runtime/dream-skin.css`
- Modify: `tools/renderer-runtime.test.mjs`
- Modify: `macos/tests/video-operation-completion.test.mjs`
- Generate: `macos/assets/renderer-inject.js`, `macos/assets/dream-skin.css`
- Generate: `windows/assets/renderer-inject.js`, `windows/assets/dream-skin.css`

**Interfaces:**
- Consumes: v1.5.16 canonical selector contract and renderer cleanup/state APIs.
- Produces: `THEME.mediaKind`, `THEME.mediaUrl`, `#codex-dream-skin-video`, video palette sampling, video-only transparent surfaces, and generated assets synchronized from `runtime/`.

- [ ] **Step 1: Update the renderer regression to describe the v1.5.16 video contract**

Add assertions that the canonical source, not only `macos/assets`, contains the video mode:

```js
assert.match(runtimeRenderer, /const MEDIA_KIND = THEME\.mediaKind === "video"/);
assert.match(runtimeRenderer, /videoNode\.src = THEME\.mediaUrl/);
assert.match(runtimeRenderer, /const analyzeVideoPalette = \(\) => new Promise/);
assert.match(runtimeCss, /data-dream-media-kind="video"/);
assert.match(runtimeCss, /main\[class\*="_MainContentSurface_"\][\s\S]*?\/ \.24/);
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

```bash
node --test macos/tests/video-operation-completion.test.mjs tools/renderer-runtime.test.mjs
```

Expected: FAIL on missing video runtime markers in the newly merged v1.5.16 canonical sources.

- [ ] **Step 3: Reapply video behavior to the canonical v1.5.16 renderer**

Add the video attribute and state without replacing v1.5.16 contrast, visibility, composer, Pet-overlay, or selector logic:

```js
const MEDIA_KIND = THEME.mediaKind === "video" ? "video" : "image";
let videoNode = null;

const installVideoLayer = () => {
  if (MEDIA_KIND !== "video" || !document.body || typeof THEME.mediaUrl !== "string") return;
  videoNode = document.createElement("video");
  videoNode.id = "codex-dream-skin-video";
  videoNode.autoplay = true;
  videoNode.loop = true;
  videoNode.muted = true;
  videoNode.playsInline = true;
  videoNode.src = THEME.mediaUrl;
  document.body.prepend(videoNode);
  void videoNode.play().catch(() => {});
};
```

Store and remove `videoNode` through the existing renderer state/cleanup contract, set `data-dream-media-kind`, and sample a playable video frame for palette colors. Copy the approved video-only CSS from the pre-merge branch by consulting `be87937`, then adapt it to the v1.5.16 canonical selector tokens instead of restoring compiled assets.

- [ ] **Step 4: Regenerate both platforms and run focused tests**

```bash
node tools/sync-runtime-assets.mjs
node tools/sync-runtime-assets.mjs --check
node --test macos/tests/video-operation-completion.test.mjs tools/renderer-runtime.test.mjs
```

Expected: all focused tests pass and both generated platform files contain `data-dream-media-kind` and `installVideoLayer`.

- [ ] **Step 5: Commit the renderer migration**

```bash
git add runtime tools macos/assets windows/assets macos/tests/video-operation-completion.test.mjs
git commit -m "feat(runtime): restore video surfaces on v1.5.16"
```

---

### Task 3: Unified 100 MiB Video Boundary

**Files:**
- Modify: `macos/scripts/common-macos.sh`
- Modify: `macos/scripts/load-video-theme-macos.sh`
- Modify: `macos/scripts/switch-theme-macos.sh`
- Modify: `macos/scripts/write-theme.mjs`
- Modify: `macos/scripts/injector.mjs`
- Replace/extend test: `macos/tests/switch-video-limit.test.mjs`
- Create test: `macos/tests/video-size-contract.test.mjs`

**Interfaces:**
- Consumes: video extensions `.mp4` and `.webm`.
- Produces: shell constant `DREAM_SKIN_MAX_VIDEO_BYTES=104857600` and Node constant `MAX_VIDEO_BYTES = 100 * 1024 * 1024`, with equivalent enforcement at every boundary.

- [ ] **Step 1: Write a cross-file failing contract test**

Create `video-size-contract.test.mjs` that reads the five production files and asserts:

```js
const maxBytes = 104857600;
assert.match(common, new RegExp(`DREAM_SKIN_MAX_VIDEO_BYTES=${maxBytes}`));
assert.match(loadVideo, /SOURCE_BYTES.*DREAM_SKIN_MAX_VIDEO_BYTES/s);
assert.match(switchTheme, /THEME_BYTES.*DREAM_SKIN_MAX_VIDEO_BYTES/s);
assert.match(writeTheme, /MAX_VIDEO_BYTES = 100 \* 1024 \* 1024/);
assert.match(injector, /MAX_VIDEO_BYTES = 100 \* 1024 \* 1024/);
```

Update `switch-video-limit.test.mjs` to expect 100 MiB and reject any remaining `20971520` video gate.

- [ ] **Step 2: Run the contract tests and confirm they fail**

```bash
node --test macos/tests/video-size-contract.test.mjs macos/tests/switch-video-limit.test.mjs
```

Expected: FAIL because the merged upstream has no video limit and the personal scripts still encode 20 MiB.

- [ ] **Step 3: Implement the minimal unified limits**

In `common-macos.sh`:

```bash
DREAM_SKIN_MAX_VIDEO_BYTES=104857600
export DREAM_SKIN_MAX_VIDEO_BYTES
```

Use that variable in both shell guards and their error messages. In both Node entry points use:

```js
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
```

Keep the image limits unchanged.

- [ ] **Step 4: Verify boundary behavior without allocating a 100 MiB fixture**

Use sparse temporary files and `stat`-based script validation where possible. Assert that `104857600` is accepted and `104857601` is rejected before copying.

```bash
node --test macos/tests/video-size-contract.test.mjs macos/tests/switch-video-limit.test.mjs
/bin/bash -n macos/scripts/common-macos.sh
/bin/bash -n macos/scripts/load-video-theme-macos.sh
/bin/bash -n macos/scripts/switch-theme-macos.sh
```

- [ ] **Step 5: Commit the size contract**

```bash
git add macos/scripts macos/tests/video-size-contract.test.mjs macos/tests/switch-video-limit.test.mjs
git commit -m "feat(macos): raise video theme limit to 100 MiB"
```

---

### Task 4: Always-Stream Video Media Server

**Files:**
- Modify: `macos/scripts/injector.mjs`
- Modify: `macos/tests/video-stream-payload.test.mjs`
- Create: `macos/tests/video-media-server.test.mjs`

**Interfaces:**
- Consumes: `loadPayload(themeDir, videoMediaBaseUrl)` and validated video path/MIME/fingerprint.
- Produces: `theme.mediaUrl` as the server base URL plus `?v=` and the media fingerprint, bounded payloads with no video Base64, and exported `createVideoMediaServer()` returning `{ url, set(payload), close() }`.

- [ ] **Step 1: Replace the small-video embedding expectation with always-stream assertions**

For both a small fixture and an 11 MiB fixture:

```js
const loaded = await loadPayload(themeDir, "http://127.0.0.1:43210/media/token");
assert.doesNotMatch(loaded.payload, /data:video\/mp4;base64/);
assert.match(loaded.payload, /http:\/\/127\.0\.0\.1:43210\/media\/token\?v=[0-9a-f]{20}/);
assert.ok(Buffer.byteLength(loaded.payload) < 4 * 1024 * 1024);
```

- [ ] **Step 2: Write HTTP contract tests**

Start the exported server, set a video payload, then assert:

```js
assert.equal(server.url.startsWith("http://127.0.0.1:"), true);
assert.equal((await request(`${server.url}-wrong`)).statusCode, 404);
assert.equal((await request(`${server.url}?v=${fingerprint}`, { Range: "bytes=1-3" })).statusCode, 206);
assert.equal(response.headers["cache-control"], "no-store");
assert.equal((await request(`${server.url}?v=${fingerprint}`, { Range: "bytes=9-1" })).statusCode, 416);
```

- [ ] **Step 3: Run the tests and confirm the old implementation fails**

```bash
node --test macos/tests/video-stream-payload.test.mjs macos/tests/video-media-server.test.mjs
```

Expected: FAIL because small videos are embedded and the server does not validate fingerprint queries or emit `Cache-Control: no-store`.

- [ ] **Step 4: Implement always-stream payloads and fingerprinted requests**

Build the URL after calculating `artKey`:

```js
if (mediaKind === "video") {
  if (typeof videoMediaBaseUrl !== "string") throw new Error("Video playback requires the local media server");
  theme.mediaUrl = `${videoMediaBaseUrl}?v=${artKey}`;
}
const artDataUrl = mediaKind === "video" ? "" : `data:${mime};base64,${art.toString("base64")}`;
```

Parse `request.url` with `new URL(request.url, "http://127.0.0.1")`, require the token pathname and current `v` fingerprint, preserve Range handling, and add:

```js
"Cache-Control": "no-store",
"X-Content-Type-Options": "nosniff",
```

- [ ] **Step 5: Run focused and payload-integrity tests**

```bash
node --test macos/tests/video-stream-payload.test.mjs macos/tests/video-media-server.test.mjs macos/tests/payload-template-integrity.test.mjs
node macos/scripts/injector.mjs --check-payload
```

Expected: all pass; output payload remains parsable and contains no video bytes.

- [ ] **Step 6: Commit the server change**

```bash
git add macos/scripts/injector.mjs macos/tests/video-stream-payload.test.mjs macos/tests/video-media-server.test.mjs
git commit -m "feat(macos): stream all video themes over loopback"
```

---

### Task 5: Playback Verification and Reliable Hot-Switch ACK

**Files:**
- Modify: `macos/scripts/injector.mjs`
- Modify: `macos/scripts/common-macos.sh`
- Modify: `macos/tests/window-readiness.test.mjs`
- Modify: `macos/tests/video-operation-completion.test.mjs`
- Create: `macos/tests/video-hot-switch.test.mjs`

**Interfaces:**
- Consumes: renderer probe, `expectedMediaKind`, operation token, existing `operation-control-ack.json` path.
- Produces: video probe `{ present, readyState, videoWidth, videoHeight, paused, currentTime, errorCode }`; ACK modes `applied` and `failed`; shell helper `wait_for_video_apply_ack(token, pid, timeoutSeconds)`.

- [ ] **Step 1: Write failing playback-verification cases**

Extend the readiness fixture with `expectedMediaKind: "video"` and assert:

```js
assert.equal(assessRendererVerification({ ...baseRenderer, video: null }, readyWindow, videoExpected).pass, false);
assert.equal(assessRendererVerification({
  ...baseRenderer,
  video: { present: true, readyState: 4, videoWidth: 1920, videoHeight: 1080,
    paused: false, currentTime: 1.2, progressing: true, errorCode: 0 },
}, readyWindow, videoExpected).pass, true);
```

Add failures for zero dimensions, media errors, paused video, and no time progression.

- [ ] **Step 2: Write failing hot-switch source-contract cases**

Assert the video branch does not call `stop_recorded_injector`, waits for `applied`, and that watcher refresh reloads instead of assigning a streamed URL into a loaded page:

```js
assert.doesNotMatch(videoBranch, /stop_recorded_injector/);
assert.match(videoBranch, /wait_for_video_apply_ack/);
assert.match(refreshPayload, /mediaKind === "video"[\s\S]*Page\.reload/);
assert.match(refreshPayload, /writeModeAck\([^)]*"applied"/);
```

- [ ] **Step 3: Run the focused tests and confirm failure**

```bash
node --test macos/tests/window-readiness.test.mjs macos/tests/video-operation-completion.test.mjs macos/tests/video-hot-switch.test.mjs
```

Expected: FAIL because v1.5.16 verification has no video readiness contract and the personal branch still restarts the watcher and reports success early.

- [ ] **Step 4: Add the video probe and progression gate**

Return the actual video state from `verifySession()`:

```js
const videoNode = document.getElementById("codex-dream-skin-video");
video: videoNode ? {
  present: true,
  readyState: videoNode.readyState,
  videoWidth: videoNode.videoWidth,
  videoHeight: videoNode.videoHeight,
  paused: videoNode.paused,
  currentTime: videoNode.currentTime,
  errorCode: videoNode.error?.code ?? 0,
} : null,
```

Pass `expectedMediaKind` through `verifySession()` and `waitForVerifiedSession()`. The bounded wait loop must require two valid samples with `currentTime` increasing by at least `0.01` seconds before setting `progressing: true` and accepting a video result. Image verification remains unchanged.

- [ ] **Step 5: Keep the watcher and server stable during video refresh**

When `refreshPayload()` sees `current.theme.mediaKind === "video"`, register the new early script, remove the old identifier, call exactly one `Page.reload({ ignoreCache: true })`, then wait for verified playback. Do not call `applyToSession()` with the video URL in the already-loaded document.

After success:

```js
await writeModeAck(options.operationAck, operationToken, "applied");
```

After failure:

```js
await writeModeAck(options.operationAck, operationToken, "failed");
```

Extend the ACK writer to accept `control`, `full`, `applied`, and `failed` while preserving the existing pause schema fields.

- [ ] **Step 6: Make shell hot reapply wait for evidence**

For a video with a healthy full watcher: touch the committed `theme.json`, keep its PID/server alive, and wait for the matching `applied` ACK. If the watcher is absent, start it once and wait for the same ACK. Only then write operation success. A `failed` ACK or timeout returns 1 so the caller uses the existing full-restart fallback.

- [ ] **Step 7: Run focused and operation tests**

```bash
node --test macos/tests/window-readiness.test.mjs macos/tests/video-operation-completion.test.mjs macos/tests/video-hot-switch.test.mjs
/bin/bash -n macos/scripts/common-macos.sh
```

Expected: all pass; existing pause ACK tests remain green.

- [ ] **Step 8: Commit reliable hot switching**

```bash
git add macos/scripts/injector.mjs macos/scripts/common-macos.sh macos/tests
git commit -m "fix(macos): verify video playback before switch success"
```

---

### Task 6: Personal Update Source and Compatibility Documentation

**Files:**
- Modify: `macos/scripts/check-update-macos.sh`
- Modify: `macos/tests/run-tests.sh`
- Modify: `macos/README.md`
- Modify: `README.md`
- Modify: `.github/workflows/release.yml` only if the v1.5.16 merge removed the unchanged-version guard from `be87937`
- Create/modify test: `macos/tests/update-version-source.test.mjs`

**Interfaces:**
- Consumes: GitHub repository `2698685648/codex-dream-skin-video`, semantic release tags, version `1.5.16`.
- Produces: update JSON and download URL that point only to the personal video-enabled repository.

- [ ] **Step 1: Write the update-source regression first**

Assert both API repository and returned release URL:

```js
assert.match(source, /REPOSITORY="2698685648\/codex-dream-skin-video"/);
assert.doesNotMatch(source, /REPOSITORY="Fei-Away\/Codex-Dream-Skin"/);
assert.equal(result.releaseUrl,
  "https://github.com/2698685648/codex-dream-skin-video/releases/latest");
```

- [ ] **Step 2: Run the focused test and confirm failure**

```bash
node --test macos/tests/update-version-source.test.mjs
```

Expected: FAIL because v1.5.16 points to upstream.

- [ ] **Step 3: Change only the update repository and dependent assertions**

```bash
REPOSITORY="2698685648/codex-dream-skin-video"
RELEASE_URL="https://github.com/$REPOSITORY/releases/latest"
```

Keep GitHub HTTPS/TLS, response-size, tag-format, and timeout validation unchanged.

- [ ] **Step 4: Update compatibility documentation**

Document 100 MiB as the accepted maximum, explain that video is streamed without recompression, state that codec support is still Chromium-dependent, and replace the old “10 MiB reliable / 10–20 MiB experimental” text. Preserve the upstream attribution and personal non-profit statement.

- [ ] **Step 5: Verify update and release guards**

```bash
node --test macos/tests/update-version-source.test.mjs macos/tests/release-workflow.test.mjs
CODEX_DREAM_SKIN_TEST_RESPONSE_FILE=macos/tests/fixtures/latest-release.json \
  macos/scripts/check-update-macos.sh --json
```

Expected: current version is `v1.5.16`, latest fixture is parsed, and `releaseUrl` points to the personal repository.

- [ ] **Step 6: Commit update ownership and docs**

```bash
git add macos/scripts/check-update-macos.sh macos/tests README.md macos/README.md .github/workflows/release.yml
git commit -m "docs: bind video edition updates to its repository"
```

---

### Task 7: Full Regression, Independent Build, and 80 MiB Preflight

**Files:**
- Verify: all changed source and generated files
- Build: `/private/tmp/Codex Dream Skin Video Test.app`
- Test media: `/Users/macurry/Downloads/Odette/7c6420fbb116bdaf9d83b0cf3f9b6c35_raw.mp4`
- Do not modify: `/Applications/Codex Dream Skin.app`

**Interfaces:**
- Consumes: all previous tasks and source media SHA-256 `6618a560e2466bd0e1cace207166cd556655d8dbe016914c50573253b20d58b9` (79,212,726 bytes).
- Produces: clean regression evidence, a separately named test App, bounded payload evidence, and a precise stop point before formal installation.

- [ ] **Step 1: Run generated-asset and syntax checks**

```bash
node tools/sync-runtime-assets.mjs --check
git diff --check
find macos/scripts -type f -name '*.sh' -exec /bin/bash -n {} \;
find macos/scripts macos/assets runtime -type f \( -name '*.mjs' -o -name '*.js' \) \
  -exec /Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --check {} \;
```

- [ ] **Step 2: Run the portable Node suites**

```bash
node --test macos/tests/*.test.mjs
node --test windows/tests/*.test.mjs
node --test tools/*.test.mjs
node macos/scripts/injector.mjs --check-payload
node windows/scripts/injector.mjs --check-payload
```

Expected: zero failures. If loopback tests receive sandbox `EPERM`, rerun only those tests with explicit local-listener permission and keep the first failure in the report as environmental evidence.

- [ ] **Step 3: Run the complete macOS project suite**

```bash
macos/tests/run-tests.sh
```

Expected: zero failures; only upstream-documented skips for unavailable full-Xcode or installed-signed-Codex branches are acceptable.

- [ ] **Step 4: Confirm source-video identity and build a bounded payload**

```bash
stat -f '%z' '/Users/macurry/Downloads/Odette/7c6420fbb116bdaf9d83b0cf3f9b6c35_raw.mp4'
shasum -a 256 '/Users/macurry/Downloads/Odette/7c6420fbb116bdaf9d83b0cf3f9b6c35_raw.mp4'
```

Expected: `79212726` bytes and SHA-256 `6618a560e2466bd0e1cace207166cd556655d8dbe016914c50573253b20d58b9`.

Create an isolated fixture under `/private/tmp` without changing the user's active theme:

```bash
preflight_dir="$(mktemp -d /private/tmp/dreamskin-video-preflight.XXXXXX)"
cp '/Users/macurry/Downloads/Odette/7c6420fbb116bdaf9d83b0cf3f9b6c35_raw.mp4' \
  "$preflight_dir/background.mp4"
node macos/scripts/write-theme.mjs custom \
  --output-dir "$preflight_dir" \
  --image background.mp4 \
  --name 'Odette Pro Preflight' \
  --tagline 'Make something wonderful.' \
  --quote 'MAKE SOMETHING WONDERFUL' \
  --appearance auto \
  --safe-area auto \
  --task-mode auto
node macos/scripts/injector.mjs --check-payload --theme-dir "$preflight_dir"
```

Expected: the payload contains a tokenized loopback URL, contains no `data:video`, and remains under 4 MiB. Keep the fixture path in the test report so it can be removed after review.

- [ ] **Step 5: Build a separate App without touching Applications**

```bash
DREAMSKIN_ARCHS=arm64 macos/scripts/build-menubar-app.sh \
  --output '/private/tmp/Codex Dream Skin Video Test.app'
/usr/bin/codesign --verify --deep --strict '/private/tmp/Codex Dream Skin Video Test.app'
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' \
  '/private/tmp/Codex Dream Skin Video Test.app/Contents/Info.plist'
```

Expected: build succeeds, signature verification succeeds, and version is `1.5.16`.

- [ ] **Step 6: Review the final diff against the approved spec**

Confirm every changed file maps to Tasks 1–6; no installed App, user theme, password, token, or unrelated upstream post-v1.5.16 commit is included.

- [ ] **Step 7: Confirm the final worktree is clean**

```bash
git status --short
```

Expected: no output. If files remain, return each file to the task that owns it, run that task's focused test again, and make a narrowly scoped commit there. Do not bundle unrelated corrections, push, or publish yet.

- [ ] **Step 8: Stop at the installation gate**

Report the test counts, independent App path, source-video identity, remaining codec/manual verification limits, and exact formal-install steps. Ask the user to close Codex/ChatGPT before backing up and replacing `/Applications/Codex Dream Skin.app`.
