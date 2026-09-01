import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const script = path.resolve(testDirectory, "../scripts/switch-theme-macos.sh");

test("saved video themes use the shared 100 MiB limit when switched", async () => {
  const source = await readFile(script, "utf8");

  assert.match(source, /\*\.mp4\|\*\.MP4\|\*\.webm\|\*\.WEBM\)/);
  assert.match(source, /DREAM_SKIN_MAX_VIDEO_BYTES/);
  assert.doesNotMatch(source, /20971520/);
});
