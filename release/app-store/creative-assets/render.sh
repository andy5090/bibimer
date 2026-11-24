#!/bin/sh
set -eu
cd "$(dirname "$0")/../../.."
node release/app-store/creative-assets/render.cjs
python3 release/app-store/creative-assets/verify.py
