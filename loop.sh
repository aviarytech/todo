#!/bin/bash
# Usage: ./loop.sh [mode] [max_iterations]
#
# Modes:
#   both        - Run Ralph and Lisa in parallel (default)
#   ralph       - Builder agent only — implements functionality
#   lisa        - Planning agent only — creates plan, then steers ongoing work
#
# Examples:
#   ./loop.sh              # Both agents in parallel, unlimited
#   ./loop.sh both 10      # Both agents, max 10 iterations each
#   ./loop.sh ralph        # Ralph only, unlimited
#   ./loop.sh ralph 20     # Ralph only, max 20 iterations
#   ./loop.sh lisa         # Lisa only, unlimited (starts interview if new project)
#   ./loop.sh lisa 5       # Lisa only, max 5 iterations

set -e

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")

# Check if project needs initialization
needs_init() {
    # Check if IMPLEMENTATION_PLAN.md is missing or contains "NOT INITIALIZED"
    if [ ! -f "IMPLEMENTATION_PLAN.md" ]; then
        return 0  # needs init
    fi
    if grep -q "NOT INITIALIZED" "IMPLEMENTATION_PLAN.md" 2>/dev/null; then
        return 0  # needs init
    fi
    # Check if specs directory is empty or missing
    if [ ! -d "specs" ] || [ -z "$(ls -A specs 2>/dev/null)" ]; then
        return 0  # needs init
    fi
    return 1  # does not need init
}

# Run Lisa in interactive mode (for new project interview)
run_lisa_interactive() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  📚 Lisa: New Project Setup"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Lisa will interview you to understand what you want to build."
    echo "After the interview, she'll create specs and an implementation plan."
    echo ""
    echo "Press Ctrl+C to exit at any time."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Run Claude in interactive mode (no -p flag)
    claude \
        --dangerously-skip-permissions \
        --model opus \
        --verbose \
        "$(cat PROMPT_plan.md)"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  ✅ Setup complete!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "You can now run:"
    echo "  ./loop.sh ralph   - Start building"
    echo "  ./loop.sh both    - Run both agents"
    echo ""
}

# Agent runner function (pipe mode for autonomous loops)
run_agent() {
    local AGENT_NAME=$1
    local PROMPT_FILE=$2
    local MAX_ITERATIONS=$3
    local LOG_PREFIX=$4
    local ITERATION=0

    echo "[$LOG_PREFIX] Starting $AGENT_NAME agent..."
    
    # Verify prompt file exists
    if [ ! -f "$PROMPT_FILE" ]; then
        echo "[$LOG_PREFIX] Error: $PROMPT_FILE not found"
        return 1
    fi

    while true; do
        if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ]; then
            echo "[$LOG_PREFIX] Reached max iterations: $MAX_ITERATIONS"
            break
        fi

        ITERATION=$((ITERATION + 1))
        echo -e "\n[$LOG_PREFIX] ═══════════════ LOOP $ITERATION ═══════════════\n"

        # Run agent iteration
        cat "$PROMPT_FILE" | claude -p \
            --dangerously-skip-permissions \
            --output-format=stream-json \
            --model opus \
            --verbose 2>&1 | sed "s/^/[$LOG_PREFIX] /"

        # Push changes after each iteration
        git push origin "$CURRENT_BRANCH" 2>/dev/null || {
            echo "[$LOG_PREFIX] Creating remote branch..."
            git push -u origin "$CURRENT_BRANCH" 2>/dev/null || true
        }

        # Lisa runs less frequently — pause between planning passes
        if [ "$AGENT_NAME" = "Lisa" ]; then
            echo "[$LOG_PREFIX] Sleeping 60s before next planning pass..."
            sleep 60
        fi
    done
}

# Parse arguments
MODE="${1:-both}"
MAX_ITERATIONS="${2:-0}"

# Handle numeric first argument (legacy: ./loop.sh 20)
if [[ "$1" =~ ^[0-9]+$ ]]; then
    MODE="both"
    MAX_ITERATIONS=$1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎬 The Simpsons Agentic Loop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Mode:   $MODE"
echo "  Branch: $CURRENT_BRANCH"
[ $MAX_ITERATIONS -gt 0 ] && echo "  Max:    $MAX_ITERATIONS iterations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

case "$MODE" in
    ralph|build)
        # Check if initialized
        if needs_init; then
            echo ""
            echo "⚠️  Project not initialized!"
            echo ""
            echo "Ralph can't build without specs and a plan."
            echo "Run './loop.sh lisa' first to set up the project."
            echo ""
            exit 1
        fi
        echo "🔨 Ralph: \"Me fail English? That's unpossible!\""
        run_agent "Ralph" "PROMPT_build.md" "$MAX_ITERATIONS" "RALPH"
        ;;
    lisa|plan)
        # Run interactively if new project, otherwise autonomous loop
        if needs_init; then
            echo "📚 Lisa: \"I see this is a new project. Let's set it up!\""
            run_lisa_interactive
        else
            echo "📚 Lisa: \"A well-organized plan is the foundation of success.\""
            run_agent "Lisa" "PROMPT_plan.md" "$MAX_ITERATIONS" "LISA"
        fi
        ;;
    both|parallel)
        # Check if initialized
        if needs_init; then
            echo ""
            echo "⚠️  Project not initialized!"
            echo ""
            echo "Run './loop.sh lisa' first to set up the project."
            echo ""
            exit 1
        fi
        
        echo "📚 Lisa: \"First, we need a plan.\""
        echo "🔨 Ralph: \"I'm helping!\""
        echo ""
        
        # Trap to kill both processes on exit
        trap 'echo -e "\n\nShutting down agents..."; kill $(jobs -p) 2>/dev/null; exit' INT TERM
        
        # PHASE 1: Lisa creates/updates the initial plan (synchronous)
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "  Phase 1: Lisa creates the plan..."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        cat "PROMPT_plan.md" | claude -p \
            --dangerously-skip-permissions \
            --output-format=stream-json \
            --model opus \
            --verbose 2>&1 | sed "s/^/[LISA] /"
        
        git push origin "$CURRENT_BRANCH" 2>/dev/null || git push -u origin "$CURRENT_BRANCH" 2>/dev/null || true
        
        # PHASE 2: Both agents loop in parallel
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "  Phase 2: Ralph builds while Lisa steers..."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
        run_agent "Ralph" "PROMPT_build.md" "$MAX_ITERATIONS" "RALPH" &
        RALPH_PID=$!
        
        run_agent "Lisa" "PROMPT_plan.md" "$MAX_ITERATIONS" "LISA" &
        LISA_PID=$!
        
        echo "Ralph PID: $RALPH_PID"
        echo "Lisa PID:  $LISA_PID"
        echo ""
        
        # Wait for both to complete
        wait $RALPH_PID $LISA_PID
        ;;
    *)
        echo "Unknown mode: $MODE"
        echo "Valid modes: ralph, lisa, both"
        exit 1
        ;;
esac
