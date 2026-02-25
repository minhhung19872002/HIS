#!/usr/bin/env bash
##############################################################################
# Ralph Wiggum Loop - Iterative AI Development for HIS Project
#
# Usage:
#   ./scripts/ralph/ralph.sh [max_iterations]
#
# Examples:
#   ./scripts/ralph/ralph.sh 10     # Run 10 iterations
#   ./scripts/ralph/ralph.sh 25     # Run 25 iterations
#   ./scripts/ralph/ralph.sh        # Default: 10 iterations
#
# Prerequisites:
#   - Claude Code CLI installed and configured
#   - jq installed (for JSON parsing)
#   - Backend + Frontend running
##############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MAX_ITERATIONS="${1:-10}"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROMPT_FILE="$SCRIPT_DIR/prompt.md"
COMPLETION_PROMISE="<promise>COMPLETE</promise>"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Ralph Wiggum Loop - HIS Project        ║${NC}"
echo -e "${BLUE}║   Max iterations: ${MAX_ITERATIONS}                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"

# Check prerequisites
if ! command -v claude &> /dev/null; then
    echo -e "${RED}Error: Claude Code CLI not found. Install it first.${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq not found. Install with: npm install -g jq or choco install jq${NC}"
fi

# Ensure prompt.md exists
if [ ! -f "$PROMPT_FILE" ]; then
    echo -e "${RED}Error: $PROMPT_FILE not found.${NC}"
    exit 1
fi

# Initialize progress file if not exists
if [ ! -f "$PROGRESS_FILE" ]; then
    echo "# Ralph Wiggum Progress Log - HIS Project" > "$PROGRESS_FILE"
    echo "# Started: $(date -Iseconds)" >> "$PROGRESS_FILE"
    echo "" >> "$PROGRESS_FILE"
fi

# Check if all stories are complete
check_completion() {
    if [ -f "$PRD_FILE" ] && command -v jq &> /dev/null; then
        local total
        local completed
        total=$(jq '.stories | length' "$PRD_FILE" 2>/dev/null || echo "0")
        completed=$(jq '[.stories[] | select(.passes == true)] | length' "$PRD_FILE" 2>/dev/null || echo "0")

        if [ "$total" -gt 0 ] && [ "$total" -eq "$completed" ]; then
            return 0  # All complete
        fi
    fi
    return 1  # Not complete
}

# Main loop
iteration=0
while [ $iteration -lt $MAX_ITERATIONS ]; do
    iteration=$((iteration + 1))

    echo ""
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Iteration ${iteration}/${MAX_ITERATIONS} - $(date '+%H:%M:%S')${NC}"
    echo -e "${GREEN}════════════════════════════════════════════${NC}"

    # Log iteration start
    echo "" >> "$PROGRESS_FILE"
    echo "## Iteration $iteration - $(date -Iseconds)" >> "$PROGRESS_FILE"

    # Build the prompt with context
    FULL_PROMPT=$(cat "$PROMPT_FILE")

    # Append current progress context
    if [ -f "$PROGRESS_FILE" ]; then
        FULL_PROMPT="${FULL_PROMPT}

---
## Previous Progress
$(tail -50 "$PROGRESS_FILE")
"
    fi

    # Append PRD status
    if [ -f "$PRD_FILE" ] && command -v jq &> /dev/null; then
        local_status=$(jq -r '.stories[] | "- [\(if .passes then "x" else " " end)] \(.id): \(.title)"' "$PRD_FILE" 2>/dev/null || echo "No PRD loaded")
        FULL_PROMPT="${FULL_PROMPT}

## Current Story Status
${local_status}
"
    fi

    # Run Claude Code with the prompt
    echo -e "${YELLOW}Running Claude Code...${NC}"

    CLAUDE_OUTPUT=$(echo "$FULL_PROMPT" | claude --dangerously-skip-permissions -p 2>&1) || true

    # Log output summary (first 500 chars)
    echo "Output summary: ${CLAUDE_OUTPUT:0:500}" >> "$PROGRESS_FILE"

    # Check for completion promise in output
    if echo "$CLAUDE_OUTPUT" | grep -q "$COMPLETION_PROMISE"; then
        echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║   COMPLETION PROMISE DETECTED!           ║${NC}"
        echo -e "${GREEN}║   All tasks completed after $iteration iterations  ║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
        echo "" >> "$PROGRESS_FILE"
        echo "## COMPLETED at iteration $iteration - $(date -Iseconds)" >> "$PROGRESS_FILE"
        exit 0
    fi

    # Check PRD completion
    if check_completion; then
        echo -e "${GREEN}All stories marked as passed in prd.json!${NC}"
        echo "## ALL STORIES PASSED at iteration $iteration" >> "$PROGRESS_FILE"
        exit 0
    fi

    # Brief pause between iterations
    echo -e "${BLUE}Iteration $iteration complete. Waiting 3s before next...${NC}"
    sleep 3
done

echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   Max iterations ($MAX_ITERATIONS) reached.           ║${NC}"
echo -e "${YELLOW}║   Check progress.txt for details.        ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════╝${NC}"

echo "" >> "$PROGRESS_FILE"
echo "## MAX ITERATIONS REACHED ($MAX_ITERATIONS) - $(date -Iseconds)" >> "$PROGRESS_FILE"
exit 1
