import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const commonScript = path.resolve(testDirectory, "../scripts/common-macos.sh");
const bundle = "/Applications/ChatGPT.app";
const executable = path.join(bundle, "Contents/MacOS/ChatGPT");
const bundledNode = path.join(bundle, "Contents/Resources/cua_node/bin/node");

test("accepts the official bundled runtime when its OpenAI team identity is present", {
  skip: !existsSync(executable) || !existsSync(bundledNode),
}, () => {
  const output = execFileSync("/bin/bash", ["-c", `
    source "$1"
    CODEX_BUNDLE="$2"
    CODEX_EXE="$3"
    require_signed_node_runtime
    printf '%s' "$NODE"
  `, "_", commonScript, bundle, executable], { encoding: "utf8" });

  assert.equal(output, bundledNode);
});

test("accepts the official ChatGPT bundle when its OpenAI team identity is present", {
  skip: !existsSync(executable),
}, () => {
  execFileSync("/bin/bash", ["-c", `
    source "$1"
    CODEX_BUNDLE="$2"
    CODEX_EXE="$3"
    verify_macos_app_signature quick
  `, "_", commonScript, bundle, executable], { encoding: "utf8" });
});
