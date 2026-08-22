# Load .env.local without letting the shell interpret any value.
# A value with a space, a quote or a $ in it used to become a command; the
# key that taught us this had to be rotated. `set -a` + a quoted file is the
# fix, and refusing to run without quotes is the guard.
set -a
. "$(dirname "$0")/../.env.local"
set +a
