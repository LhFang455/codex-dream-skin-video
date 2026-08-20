import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadPayload } from "../scripts/injector.mjs";

test("small video payload stays embedded for Codex URL-safety compatibility", async (t) => {
  const themeDir = await mkdtemp(path.join(os.tmpdir(), "dream-skin-streamed-video-"));
  t.after(() => rm(themeDir, { recursive: true, force: true }));
  await writeFile(path.join(themeDir, "theme.json"), JSON.stringify({
    schemaVersion: 1, id: "streamed-video", name: "Streamed video", image: "background.mp4",
  }));
  await writeFile(path.join(themeDir, "background.mp4"), Buffer.from([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
  ]));

  const loaded = await loadPayload(themeDir, "http://127.0.0.1:32100/media/test-token");
  assert.match(loaded.payload, /data:video\/mp4;base64/);
  assert.doesNotMatch(loaded.payload, /http:\/\/127\.0\.0\.1:32100\/media\/test-token/);
});

test("medium video payload streams instead of inflating the injected payload", async (t) => {
  const themeDir = await mkdtemp(path.join(os.tmpdir(), "dream-skin-medium-video-"));
  t.after(() => rm(themeDir, { recursive: true, force: true }));
  await writeFile(path.join(themeDir, "theme.json"), JSON.stringify({
    schemaVersion: 1, id: "medium-video", name: "Medium video", image: "background.mp4",
  }));
  await writeFile(path.join(themeDir, "background.mp4"), Buffer.alloc(11 * 1024 * 1024, 0));

  const loaded = await loadPayload(themeDir, "http://127.0.0.1:32100/media/medium-token");
  assert.match(loaded.payload, /http:\/\/127\.0\.0\.1:32100\/media\/medium-token/);
  assert.doesNotMatch(loaded.payload, /data:video\/mp4;base64/);
});
