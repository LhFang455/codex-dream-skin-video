#!/bin/bash

# Load one local MP4/WebM file as the active muted, looping theme background.
set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common-macos.sh"

VIDEO=""; THEME_NAME=""; APPLY_NOW="true"; APPEARANCE="auto"; SAFE_AREA="auto"; TASK_MODE="auto"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --file) VIDEO="${2:-}"; shift 2 ;;
    --name) THEME_NAME="${2:-}"; shift 2 ;;
    --appearance) APPEARANCE="${2:-}"; shift 2 ;;
    --safe-area) SAFE_AREA="${2:-}"; shift 2 ;;
    --task-mode) TASK_MODE="${2:-}"; shift 2 ;;
    --no-apply) APPLY_NOW="false"; shift ;;
    *) fail "Unknown argument: $1" ;;
  esac
done
case "$APPEARANCE" in auto|light|dark) ;; *) fail "Invalid appearance: $APPEARANCE" ;; esac
case "$SAFE_AREA" in auto|left|right|center|none) ;; *) fail "Invalid safe area: $SAFE_AREA" ;; esac
case "$TASK_MODE" in auto|ambient|banner|full|off) ;; *) fail "Invalid task mode: $TASK_MODE" ;; esac
[ -n "$VIDEO" ] || fail "Pass --file <video>."
[ -f "$VIDEO" ] || fail "Video not found: $VIDEO"
case "$VIDEO" in *.mp4|*.MP4) extension="mp4" ;; *.webm|*.WEBM) extension="webm" ;; *) fail "Unsupported video type: $VIDEO. Use MP4 or WebM." ;; esac
SOURCE_BYTES="$(/usr/bin/stat -f '%z' "$VIDEO")"
[ "$SOURCE_BYTES" -gt 0 ] && [ "$SOURCE_BYTES" -le 20971520 ] || fail "Video must be non-empty and no larger than 20 MB."

ensure_state_root
THEMES_ROOT="$STATE_ROOT/themes"
/bin/mkdir -p "$THEMES_ROOT" "$THEME_DIR"
ensure_node_runtime
[ -n "$THEME_NAME" ] || THEME_NAME="${VIDEO##*/}"
THEME_NAME="${THEME_NAME%.*}"
[ -n "$THEME_NAME" ] || THEME_NAME="Video Theme"
theme_id="video-$(/bin/date '+%Y%m%d%H%M%S')-$$"
media_name="background.$extension"
temporary="$THEME_DIR/.background.$$.tmp.$extension"
prepared="$THEME_DIR/$media_name"
cleanup_temporary() { /bin/rm -f "$temporary"; }
trap cleanup_temporary EXIT
progress() { printf '%s\n' "$*" >&2; notify_user "$*"; }
progress "Preparing video background…"
/bin/cp -f "$VIDEO" "$temporary"
[ -s "$temporary" ] || fail "Prepared video is empty."
/bin/chmod 600 "$temporary"
/bin/mv -f "$temporary" "$prepared"
"$NODE" "$SCRIPT_DIR/write-theme.mjs" custom --output-dir "$THEME_DIR" --image "$media_name" --name "$THEME_NAME" --tagline "Make something wonderful." --quote "MAKE SOMETHING WONDERFUL" --appearance "$APPEARANCE" --safe-area "$SAFE_AREA" --task-mode "$TASK_MODE" >/dev/null
/usr/bin/find "$THEME_DIR" -maxdepth 1 -type f -name 'background.*' ! -name "$media_name" -delete
trap - EXIT
lib_dir="$THEMES_ROOT/$theme_id"
/bin/mkdir -p "$lib_dir"
/bin/cp -f "$THEME_DIR/$media_name" "$THEME_DIR/theme.json" "$lib_dir/"
/bin/chmod 600 "$lib_dir/"* 2>/dev/null || true
if [ "$APPLY_NOW" != "true" ]; then progress "Video theme is ready: ${THEME_NAME}"; exit 0; fi
PORT=9341
if [ -f "$STATE_PATH" ]; then saved="$(state_field port 2>/dev/null || true)"; [ -n "${saved:-}" ] && PORT="$saved"; fi
progress "Applying video background…"
if hot_reapply_theme "$PORT" 8000; then progress "Video theme applied: ${THEME_NAME}"; exit 0; fi
progress "Starting Codex to apply the video theme…"
if "$SCRIPT_DIR/start-dream-skin-macos.sh" --port "$PORT" --restart-existing; then progress "Video theme applied: ${THEME_NAME}"; exit 0; fi
alert_user "The video theme was saved but could not be applied."
exit 1
