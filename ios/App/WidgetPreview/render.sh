#!/bin/sh
# Renders the home-screen widget's faces to PNGs on this Mac (no device):
# ios/App/widget-previews/*.png, git-ignored. See main.swift.
set -eu
cd "$(dirname "$0")/.."
build="${TMPDIR:-/tmp}/ec-widget-preview"
mkdir -p "$build"
swiftc -O -o "$build/render" \
  WidgetPreview/main.swift \
  WidgetPreview/Shim.swift \
  Widget/WidgetPayload.swift \
  Widget/PosterViews.swift
"$build/render" widget-previews Widget/Assets.xcassets/Seal.imageset/seal@3x.png
