#!/usr/bin/env bash
#
# CHPMS — Build the client delivery ZIP from this checkout.
#
# Runs from the project root or the release/ folder. Produces:
#   chpms-vX.Y.Z.zip   at the project root
#
# Usage:
#   ./release/build-package.sh             # uses VERSION below
#   ./release/build-package.sh 1.1.0       # override version
#
set -e

VERSION="${1:-1.0.0}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE_DIR="$ROOT/release"
STAGING="$ROOT/.build/chpms-v${VERSION}"
IMAGE_TAG="chpms:${VERSION}"
ZIP_OUT="$ROOT/chpms-v${VERSION}.zip"
TARBALL="chpms-${VERSION}.tar.gz"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CHPMS — Build Delivery Package v${VERSION}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# 1. Sanity: require Docker
if ! docker info >/dev/null 2>&1; then
  echo "✗ Docker is not running. Open Docker Desktop and retry."
  exit 1
fi

# 2. Build the application image from the current source
echo "▸ Building Docker image ${IMAGE_TAG} (this can take several minutes)…"
cd "$ROOT"
docker build -t "$IMAGE_TAG" -t "chpms:latest" .

# 3. Save the image as a compressed tarball
echo
echo "▸ Saving image to ${TARBALL}…"
mkdir -p "$STAGING"
docker save "$IMAGE_TAG" | gzip -1 > "$STAGING/$TARBALL"
echo "  $(ls -lh "$STAGING/$TARBALL" | awk '{print $5}') ${TARBALL}"

# 4. Stage the delivery files alongside the tarball
echo
echo "▸ Staging delivery files…"
cp "$RELEASE_DIR/docker-compose.yml" "$STAGING/"
cp "$RELEASE_DIR/.env.example"       "$STAGING/"
cp "$RELEASE_DIR/setup.sh"           "$STAGING/"
cp "$RELEASE_DIR/setup.bat"          "$STAGING/"
cp "$RELEASE_DIR/README.md"          "$STAGING/"
cp "$RELEASE_DIR/USER-GUIDE.md"      "$STAGING/"
mkdir -p "$STAGING/backup"
cp "$RELEASE_DIR/backup/backup.sh"   "$STAGING/backup/"
chmod +x "$STAGING/setup.sh" "$STAGING/backup/backup.sh"

# 5. Patch the tarball reference in docker-compose so it matches the version
sed -i.bak "s|image: chpms:1.0.0|image: chpms:${VERSION}|g" "$STAGING/docker-compose.yml"
rm -f "$STAGING/docker-compose.yml.bak"

# 6. Zip it up at the project root
echo
echo "▸ Creating ${ZIP_OUT}…"
rm -f "$ZIP_OUT"
cd "$(dirname "$STAGING")"
zip -r "$ZIP_OUT" "$(basename "$STAGING")" -x "*.DS_Store" >/dev/null
cd "$ROOT"

# 7. Cleanup staging
rm -rf "$STAGING"

# 8. Summary
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ Delivery package ready"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "  $ZIP_OUT"
ls -lh "$ZIP_OUT" | awk '{print "    Size:", $5}'
echo
echo "  Verify integrity:  unzip -t \"$ZIP_OUT\""
echo "  Inspect contents:  unzip -l \"$ZIP_OUT\""
echo
