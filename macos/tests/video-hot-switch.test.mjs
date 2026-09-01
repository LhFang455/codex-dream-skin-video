import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [common, injector] = await Promise.all([
  readFile(path.join(root, "scripts", "common-macos.sh"), "utf8"),
  readFile(path.join(root, "scripts", "injector.mjs"), "utf8"),
]);

test("video hot switch waits for an applied ACK from the existing watcher", () => {
  const videoBranch = common.match(/case "\$theme_media" in([\s\S]*?)\n  esac/)?.[1] ?? "";
  assert.doesNotMatch(videoBranch, /stop_recorded_injector/);
  assert.match(videoBranch, /wait_for_video_apply_ack/);
  assert.match(common, /wait_for_video_apply_ack\(\)[\s\S]*?applied\)[\s\S]*?failed\)/);
  assert.match(
    videoBranch,
    /wait_for_video_apply_ack "\$operation_token" "\$inj_pid" 60/,
    "a 100 MiB Blob transfer needs more than the old 15 second acknowledgement window",
  );
});

test("video refresh transfers a Blob without reload and acknowledges only verified playback", () => {
  const refreshPayload = injector.match(/const refreshPayload = async \(\) => \{([\s\S]*?)\n  \};/)?.[1] ?? "";
  assert.match(refreshPayload, /mediaKind === "video"[\s\S]*?applyLoadedTheme\(session, current\)/);
  assert.doesNotMatch(refreshPayload, /Page\.reload/);
  assert.match(refreshPayload, /writeModeAck\([^)]*"applied"/);
  assert.match(refreshPayload, /writeModeAck\([^)]*"failed"/);
  assert.match(injector, /async function applyLoadedTheme[\s\S]*?transferVideoBlob/);
});
