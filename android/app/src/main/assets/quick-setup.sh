set -eu
umask 077
if ! command -v python >/dev/null 2>&1; then
    pkg install -y python </dev/null >/dev/null 2>&1 || { printf '%s\n' '{"error":"quick_python_failed"}'; exit 1; }
fi
bibimer_setup_dir=$(mktemp -d)
trap 'rm -rf -- "$bibimer_setup_dir"' EXIT
cat >"$bibimer_setup_dir/install.sh" <<'BIBIMER_BUNDLED_INSTALLER'
__BIBIMER_INSTALLER__
BIBIMER_BUNDLED_INSTALLER
python - --installer "$bibimer_setup_dir/install.sh" <<'BIBIMER_CONNECT_HELPER'
__BIBIMER_CONNECT_HELPER__
BIBIMER_CONNECT_HELPER
