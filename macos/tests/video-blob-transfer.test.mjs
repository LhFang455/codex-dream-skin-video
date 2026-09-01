import assert from "node:assert/strict";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

import {
  clearTransferredVideo,
  transferVideoBlob,
} from "../scripts/injector.mjs";

function makeRendererSession() {
  const revoked = [];
  let sequence = 0;
  const context = vm.createContext({
    Blob,
    Uint8Array,
    atob,
    window: {},
    URL: {
      createObjectURL: () => `blob:test-${++sequence}`,
      revokeObjectURL: (url) => revoked.push(url),
    },
  });
  return {
    context,
    evaluations: 0,
    revoked,
    async evaluate(expression) {
      this.evaluations += 1;
      return vm.runInContext(expression, context);
    },
  };
}

async function makeLoadedVideo(t, bytes, artKey) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "dream-skin-video-blob-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const mediaPath = path.join(directory, "background.mp4");
  await writeFile(mediaPath, bytes);
  return {
    mediaMime: "video/mp4",
    mediaPath,
    mediaStat: await stat(mediaPath),
    theme: { artKey, mediaKind: "video" },
  };
}

test("video bytes cross CDP in bounded chunks and assemble into an exact Blob", async (t) => {
  const bytes = Buffer.allocUnsafe(900_123);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = index % 251;
  const loaded = await makeLoadedVideo(t, bytes, "0123456789abcdefabcd");
  const session = makeRendererSession();

  const result = await transferVideoBlob(session, loaded, { chunkBytes: 256 * 1024 });
  const media = session.context.window.__CODEX_DREAM_SKIN_VIDEO_MEDIA__;
  const actual = Buffer.from(await media.blob.arrayBuffer());

  assert.deepEqual(actual, bytes);
  assert.equal(media.key, loaded.theme.artKey);
  assert.equal(media.mime, "video/mp4");
  assert.equal(media.size, bytes.length);
  assert.equal(result.url, "blob:test-1");
  assert.equal(result.chunks, 4);
  assert.ok(session.evaluations >= 6, "the complete video must not enter one giant expression");
});

test("replacement and cleanup revoke renderer Blob URLs", async (t) => {
  const first = await makeLoadedVideo(t, Buffer.from([1, 2, 3]), "11111111111111111111");
  const second = await makeLoadedVideo(t, Buffer.from([4, 5, 6, 7]), "22222222222222222222");
  const session = makeRendererSession();

  await transferVideoBlob(session, first, { chunkBytes: 64 });
  await transferVideoBlob(session, second, { chunkBytes: 64 });
  assert.deepEqual(session.revoked, ["blob:test-1"]);

  assert.equal(await clearTransferredVideo(session), true);
  assert.deepEqual(session.revoked, ["blob:test-1", "blob:test-2"]);
  assert.equal(session.context.window.__CODEX_DREAM_SKIN_VIDEO_MEDIA__, undefined);
  assert.equal(session.context.window.__CODEX_DREAM_SKIN_VIDEO_TRANSFER__, undefined);
});

test("transfer rejects a video that changes after validation", async (t) => {
  const loaded = await makeLoadedVideo(t, Buffer.from([1, 2, 3]), "33333333333333333333");
  await writeFile(loaded.mediaPath, Buffer.from([9, 8, 7, 6]));

  await assert.rejects(
    transferVideoBlob(makeRendererSession(), loaded, { chunkBytes: 64 }),
    /changed|stable/i,
  );
});
