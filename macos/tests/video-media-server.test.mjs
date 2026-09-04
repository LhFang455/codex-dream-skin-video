import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { get } from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createVideoMediaServer } from "../scripts/injector.mjs";

function request(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const call = get(url, { headers }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        body: Buffer.concat(chunks),
        headers: response.headers,
        statusCode: response.statusCode,
      }));
    });
    call.on("error", reject);
  });
}

test("video server requires its token and current media fingerprint", async (t) => {
  const themeDir = await mkdtemp(path.join(os.tmpdir(), "dream-skin-video-server-"));
  const mediaPath = path.join(themeDir, "background.mp4");
  await writeFile(mediaPath, Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
  t.after(() => rm(themeDir, { recursive: true, force: true }));

  const server = await createVideoMediaServer();
  t.after(() => server.close());
  const fingerprint = "0123456789abcdefabcd";
  server.set({
    mediaPath,
    mediaMime: "video/mp4",
    theme: { mediaKind: "video", artKey: fingerprint },
  });

  assert.equal(server.url.startsWith("http://127.0.0.1:"), true);
  assert.equal((await request(`${server.url}-wrong?v=${fingerprint}`)).statusCode, 404);
  assert.equal((await request(server.url)).statusCode, 404);
  assert.equal((await request(`${server.url}?v=ffffffffffffffffffff`)).statusCode, 404);

  const partial = await request(`${server.url}?v=${fingerprint}`, { Range: "bytes=1-3" });
  assert.equal(partial.statusCode, 206);
  assert.deepEqual([...partial.body], [1, 2, 3]);
  assert.equal(partial.headers["cache-control"], "no-store");
  assert.equal(partial.headers["x-content-type-options"], "nosniff");
  assert.equal(
    (await request(`${server.url}?v=${fingerprint}`, { Range: "bytes=9-1" })).statusCode,
    416,
  );
});
