#!/usr/bin/env bash
# Pushes the commit of `nx release` and its tags: pnpm release:push
#
# Each tag goes in a push of its own. GitHub starts no workflow for tags when more than three
# are pushed at once, so `git push --follow-tags` after releasing several apps would build no
# image at all.
set -euo pipefail

branch=$(git branch --show-current)
[ "$branch" = "main" ] || { echo "Release from main, this is $branch." >&2; exit 1; }

tags=$(git tag --points-at HEAD --list 'nx1-*')
[ -n "$tags" ] || { echo "HEAD has no nx1-* tag, run pnpm nx release first." >&2; exit 1; }

git push origin main
for tag in $tags; do
  git push origin "refs/tags/$tag"
done
