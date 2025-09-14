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
  # Replace .js' -> .mjs' and .js" -> .mjs"
  sed -E -i '' "s/\.js'/.mjs'/g; s/\.js\"/.mjs\"/g" "$file"
done < <(find ./dist -type f -name '*.js' -print0)

# Rename .js to .mjs recursively
while IFS= read -r -d '' file; do
  target="${file%.js}.mjs"
  echo "Renaming $file -> $target"
  mv "$file" "$target"
done < <(find ./dist -type f -name '*.js' -print0)
