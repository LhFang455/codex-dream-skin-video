import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadPayload } from "../scripts/injector.mjs";

test("small video payload streams without entering the injected JavaScript", async (t) => {
  const themeDir = await mkdtemp(path.join(os.tmpdir(), "dream-skin-streamed-video-"));
  t.after(() => rm(themeDir, { recursive: true, force: true }));
  await writeFile(path.join(themeDir, "theme.json"), JSON.stringify({
    schemaVersion: 1, id: "streamed-video", name: "Streamed video", image: "background.mp4",
  }));
  await writeFile(path.join(themeDir, "background.mp4"), Buffer.from([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
  ]));

  const loaded = await loadPayload(themeDir, "http://127.0.0.1:32100/media/test-token");
  assert.doesNotMatch(loaded.payload, /data:video\/mp4;base64/);
  assert.match(
    loaded.payload,
    /http:\/\/127\.0\.0\.1:32100\/media\/test-token\?v=[0-9a-f]{20}/,
  );
  assert.ok(Buffer.byteLength(loaded.payload) < 4 * 1024 * 1024);
  const reloaded = await loadPayload(themeDir, "http://127.0.0.1:32101/media/next-token");
  assert.equal(
    reloaded.revision,
    loaded.revision,
    "the same video content must keep its renderer revision when the loopback token changes",
  );
});

test("medium video payload streams instead of inflating the injected payload", async (t) => {
  const themeDir = await mkdtemp(path.join(os.tmpdir(), "dream-skin-medium-video-"));
  t.after(() => rm(themeDir, { recursive: true, force: true }));
  await writeFile(path.join(themeDir, "theme.json"), JSON.stringify({
    schemaVersion: 1, id: "medium-video", name: "Medium video", image: "background.mp4",
  }));
  await writeFile(path.join(themeDir, "background.mp4"), Buffer.alloc(11 * 1024 * 1024, 0));

  const loaded = await loadPayload(themeDir, "http://127.0.0.1:32100/media/medium-token");
  assert.match(
    loaded.payload,
    /http:\/\/127\.0\.0\.1:32100\/media\/medium-token\?v=[0-9a-f]{20}/,
  );
  assert.doesNotMatch(loaded.payload, /data:video\/mp4;base64/);
  assert.ok(Buffer.byteLength(loaded.payload) < 4 * 1024 * 1024);
});
