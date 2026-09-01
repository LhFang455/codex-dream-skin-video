import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(root, "scripts", "check-update-macos.sh");

test("macOS updates come only from the video-enabled personal repository", async (t) => {
  const source = await readFile(scriptPath, "utf8");
  assert.match(source, /REPOSITORY="2698685648\/codex-dream-skin-video"/);
  assert.doesNotMatch(source, /REPOSITORY="Fei-Away\/Codex-Dream-Skin"/);

  const temporary = await mkdtemp(path.join(os.tmpdir(), "dream-skin-update-source-"));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const responsePath = path.join(temporary, "release.json");
  await writeFile(responsePath, JSON.stringify({ tag_name: "v9.8.7" }));
  const result = spawnSync("/bin/bash", [scriptPath, "--json"], {
    encoding: "utf8",
    env: { ...process.env, CODEX_DREAM_SKIN_TEST_RESPONSE_FILE: responsePath },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    JSON.parse(result.stdout).releaseUrl,
    "https://github.com/2698685648/codex-dream-skin-video/releases/latest",
  );
});
