#!/usr/bin/env bash

set -euo pipefail

# Convert all emitted ESM .js files in ./dist to .mjs and update internal imports
# This runs after the ESM tsc pass which emits .js files into ./dist

if [ ! -d "./dist" ]; then
  echo "dist directory not found"
  exit 1
fi

# Update import specifiers inside files before renaming (handle both ' and ")
while IFS= read -r -d '' file; do
  echo "Updating imports in $file ..."
  # Replace .js' and .js" with .mjs' and .mjs" (portable inline edit)
  sed -E -i.bak \
    -e "s/\.js'/.mjs'/g" \
    -e "s/\.js\"/.mjs\"/g" \
    "$file"
  rm -f "${file}.bak"
done < <(find ./dist -type f -name '*.js' -print0)

# Rename .js to .mjs recursively
while IFS= read -r -d '' file; do
  target="${file%.js}.mjs"
  echo "Renaming $file -> $target"
  mv "$file" "$target"
done < <(find ./dist -type f -name '*.js' -print0)
