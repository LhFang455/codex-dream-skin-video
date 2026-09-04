import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const common = readFileSync(join(root, "scripts", "common-macos.sh"), "utf8");
const startScript = readFileSync(join(root, "scripts", "start-dream-skin-macos.sh"), "utf8");
const css = readFileSync(join(root, "assets", "dream-skin.css"), "utf8");
const renderer = readFileSync(join(root, "assets", "renderer-inject.js"), "utf8");
const injector = readFileSync(join(root, "scripts", "injector.mjs"), "utf8");

test("video hot apply keeps a healthy watcher and waits for playback evidence", () => {
  const videoBranch = common.match(/case "\$theme_media" in([\s\S]*?)\n  esac/);
  assert.ok(videoBranch, "hot apply must have a video-media branch");
  assert.doesNotMatch(
    videoBranch[1],
    /stop_recorded_injector/,
    "video switching must not kill the loopback server that owns the current page URL",
  );
  assert.match(
    videoBranch[1],
    /wait_for_video_apply_ack/,
    "video switching must wait for the watcher to confirm real playback",
  );
});

test("video hot apply stages a refresh without replacing the healthy watcher", () => {
  const videoBranch = common.match(/case "\$theme_media" in([\s\S]*?)\n  esac/);
  assert.ok(videoBranch, "hot apply must have a video-media branch");
  assert.match(
    videoBranch[1],
    /touch "\$THEME_DIR\/theme\.json"[\s\S]*?wait_for_video_apply_ack/,
    "the stable watcher must observe the staged video before success is reported",
  );
});

test("the watcher transfers a Blob into a loaded page without navigation", () => {
  assert.match(
    injector,
    /current\.theme\.mediaKind === "video"[\s\S]*?applyLoadedTheme\(session, current\)/,
    "a video theme must install a CSP-compatible Blob into the current document",
  );
  assert.doesNotMatch(injector, /reloadForStreamedVideo/);
});

test("startup completes the page operation after verification", () => {
  assert.match(
    startScript,
    /mark_state_active[\s\S]*?write_operation_state success[\s\S]*?finish_client_operation "\$PORT" success/,
    "startup must dismiss the applying overlay after a verified theme injection",
  );
});

test("an unbranded app root cannot bypass the Codex identity markers", () => {
  assert.doesNotMatch(injector, /markers\.generic \|\| canonicalRoot/,
    "an app:// root without stable Codex markers must remain outside the target set");
  assert.match(injector, /return Boolean\(main && input && branded\)/,
    "generic fallback anchors must retain the stable Codex branding requirement");
});

test("video surfaces remain clear instead of using blur", () => {
  const videoRules = [...css.matchAll(/html\[data-dream-skin="active"\]\[data-dream-media-kind="video"\][\s\S]*?\n}\n/g)]
    .map((match) => match[0])
    .join("\n");
  assert.doesNotMatch(videoRules, /backdrop-filter:\s*blur\(/, "video mode must not blur the background");
  assert.match(videoRules, /aside\.app-shell-left-panel/, "video mode must explicitly style the sidebar");
});

test("video palettes are sampled from a playable video frame", () => {
  assert.match(renderer, /const analyzeVideoPalette = \(\) => new Promise/, "video needs its own frame sampler");
  assert.match(renderer, /MEDIA_KIND === "video" \? analyzeVideoPalette\(\) : analyzeArt\(\)/,
    "video themes must use video pixels instead of the image-only analyser");
});

test("video sidebar and composer use near-transparent fills", () => {
  assert.match(css, /data-dream-media-kind="video"\] aside\.app-shell-left-panel[\s\S]*?\/ \.12/,
    "video sidebar should retain only a faint tint");
  assert.match(css, /data-dream-media-kind="video"\] \.composer-surface-chrome[\s\S]*?\/ \.10/,
    "video composer should retain only a faint tint");
  assert.match(css, /final video surface overrides[\s\S]*?\.composer-surface-chrome[\s\S]*?\/ \.10/i,
    "video composer overrides must follow the generic composer rules");
});

test("video mode clears semantic overlays and search controls without changing image themes", () => {
  const finalOverrides = css.slice(css.lastIndexOf("Final video surface overrides"));
  assert.match(finalOverrides, /data-dream-media-kind="video"\] :is\(\[role="menu"\], \[role="dialog"\]/,
    "video mode must clear account, mode-switch, slash, and Skill overlays");
  assert.match(finalOverrides, /\[role="searchbox"\], input\[type="search"\], input\[type="text"\]/,
    "video mode must clear scheduled and plugin search fields");
  assert.match(finalOverrides, /html\[data-dream-skin="active"\]\[data-dream-media-kind="video"\] :is\(\[role="menu"\]/,
    "the broad transparency override must stay limited to video mode");
  assert.match(finalOverrides, /\[role="menu"\][\s\S]*?\/ \.38/,
    "popovers should remain semi-transparent for readability");
  assert.match(finalOverrides, /\.composer-surface-chrome > :not\(button\)[\s\S]*?background: transparent/,
    "the composer’s nested black surface must be clear");
  assert.match(finalOverrides, /article :is\(div, section, li\)[\s\S]*?background: transparent/,
    "the diff list’s nested black surface must be clear");
  assert.match(finalOverrides, /group\\\/home-suggestions button[\s\S]*?\/ \.28/,
    "the directly visible home suggestion cards must remain semi-transparent");
  assert.match(finalOverrides, /\[class\*="_ComposerLayoutRoot_"\]\s*\{[^}]*?\/ \.50[^}]*?box-shadow:/,
    "the native composer root must keep a 50% tint and shadow over video");
  assert.match(finalOverrides, /\[role="dialog"\][\s\S]*?input\[type="text"\][\s\S]*?\/ \.38/,
    "slash and Skill search inputs must stay semi-transparent");
});

test("video conversation surfaces stay lighter than their generic opaque cards", () => {
  const finalOverrides = css.slice(css.lastIndexOf("Video-only overlay and search transparency"));
  assert.match(finalOverrides,
    /data-local-conversation-user-anchor\][^{}]*?\[data-ds-part="message"\]\s*\{[^}]*?\/ \.30/,
    "user message bubbles should use a 30% video-only tint");
  assert.match(finalOverrides,
    /data-response-annotation-conversation[\s\S]*?\/ \.26[\s\S]*?box-shadow:/,
    "assistant message surfaces should use a 26% video-only tint");
  assert.match(finalOverrides,
    /data-local-conversation-item-target-ids[\s\S]*?\/ \.30[\s\S]*?box-shadow:/,
    "tool and status surfaces should use a 30% video-only tint");
});

test("video composer overlays and Skill cards remain translucent", () => {
  const finalOverrides = css.slice(css.lastIndexOf("Video-only overlay and search transparency"));
  assert.match(finalOverrides,
    /data-composer-overlay-floating-ui="true"\] > \*\s*\{[^}]*?\/ \.40/,
    "composer add-content, slash, and Skill overlays should use a 40% tint");
  assert.match(finalOverrides,
    /\[class\*="_CodeBlock_"\]\s*\{[^}]*?\/ \.30/,
    "Skill and code card bodies should use a 30% tint");
  assert.match(finalOverrides,
    /\[class\*="_CodeBlock_"\] \[class\*="_StickyActionBar_"\]\s*\{[^}]*?\/ \.40[^}]*?background-image: none/,
    "Skill and code card action bars should use a 40% tint without an opaque gradient");
});

test("a completed external apply closes an operation opened before the target connected", () => {
  assert.match(injector,
    /else if \(!record\.operationExternal \|\| activeOperation\?\.token !== record\.operationToken\)/,
    "a newly connected target must show completion when the external operation has already ended");
});

test("video mode keeps the sidebar darker and the actual main element lighter", () => {
  const finalOverrides = css.slice(css.lastIndexOf("Video-only overlay and search transparency"));
  assert.match(finalOverrides,
    /data-dream-media-kind="video"\] aside\.app-shell-left-panel[\s\S]*?\/ \.40/,
    "the left sidebar must retain the darker half of the split view");
  assert.match(finalOverrides,
    /data-dream-media-kind="video"\] main\[class\*="_MainContentSurface_"\][\s\S]*?\/ \.24/,
    "home and conversation routes must share one lighter-than-sidebar main tint");
});

test("video mode clears the native absolute surface layered inside the main area", () => {
  const finalOverrides = css.slice(css.lastIndexOf("Video-only overlay and search transparency"));
  assert.match(finalOverrides,
    /main \.absolute\.inset-0\.z-10\.bg-surface[\s\S]*?background: transparent/,
    "the current Codex inner full-page surface must not cover the video");
});

test("video mode clears elevated conversation resource cards", () => {
  const finalOverrides = css.slice(css.lastIndexOf("Video-only overlay and search transparency"));
  assert.match(finalOverrides,
    /main \[class\*="bg-surface-elevated-secondary\/50"\][\s\S]*?background: transparent/,
    "the right-side resource cards must not add a dark layer over the video");
});

test("video mode removes the sidebar-main divider and composer tint", () => {
  const finalOverrides = css.slice(css.lastIndexOf("Video-only overlay and search transparency"));
  const sidebarRule = finalOverrides.match(/aside\.app-shell-left-panel\s*\{[\s\S]*?\n}/)?.[0];
  assert.ok(sidebarRule, "the final video sidebar rule must exist");
  assert.match(sidebarRule,
    /border-right-color: transparent[\s\S]*?box-shadow: none/,
    "the sidebar edge must not draw a dark divider over the video");
  assert.match(finalOverrides,
    /main\[class\*="_MainContentSurface_"\][\s\S]*?\/ \.24[\s\S]*?border-left-color: transparent[\s\S]*?box-shadow: none/,
    "the main surface must use the shared tint without drawing a second divider");
  assert.match(finalOverrides,
    /_ComposerLayoutFooter_[\s\S]*?background: transparent[\s\S]*?border-color: transparent/,
    "the composer footer must not tint the right-side video");
  assert.match(finalOverrides,
    /main \.ProseMirror[\s\S]*?background: transparent[\s\S]*?box-shadow: none/,
    "the editor must not add a tint over the right-side video");
});

test("video home highlights remain readable over bright frames", () => {
  const finalOverrides = css.slice(css.lastIndexOf("Video-only overlay and search transparency"));
  assert.match(finalOverrides,
    /data-feature="game-source"[\s\S]*?color: #fff[\s\S]*?text-shadow:/,
    "the home brand and selected-project text must not use the low-contrast palette accent");
  assert.match(finalOverrides,
    /group\\\/home-suggestions button :is\(svg, span\)[\s\S]*?color: #fff/,
    "home suggestion symbols must be visible over bright video frames");
});
