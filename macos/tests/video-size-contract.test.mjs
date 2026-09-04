import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const scripts = path.resolve(testDirectory, "../scripts");
const [common, loadVideo, switchTheme, writeTheme, injector] = await Promise.all([
  "common-macos.sh",
  "load-video-theme-macos.sh",
  "switch-theme-macos.sh",
  "write-theme.mjs",
  "injector.mjs",
].map((file) => readFile(path.join(scripts, file), "utf8")));

test("all video boundaries share the 100 MiB maximum", () => {
  assert.match(common, /DREAM_SKIN_MAX_VIDEO_BYTES=104857600/);
  assert.match(loadVideo, /SOURCE_BYTES[\s\S]*?DREAM_SKIN_MAX_VIDEO_BYTES/);
  assert.match(switchTheme, /THEME_BYTES[\s\S]*?DREAM_SKIN_MAX_VIDEO_BYTES/);
  assert.match(writeTheme, /MAX_VIDEO_BYTES = 100 \* 1024 \* 1024/);
  assert.match(injector, /MAX_VIDEO_BYTES = 100 \* 1024 \* 1024/);
});

test("no production video gate retains the legacy 20 MiB value", () => {
  for (const source of [common, loadVideo, switchTheme, writeTheme, injector]) {
    assert.doesNotMatch(source, /20971520/);
  }
});
