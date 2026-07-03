#!/usr/bin/env bash
# SessionEnd hook — at session end, if the working tree still has changes, remind to update STATUS.md.
# Use SessionEnd (not Stop) to remind only once when leaving the session, avoiding noise every turn.
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo '{"systemMessage":"📝 Working tree still has changes — remember to update docs/workspace-docs/STATUS.md (state · next steps) before you stop."}'
fi
exit 0
