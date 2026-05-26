#!/bin/bash

# Quick stress test script
# Creates quiz and connects players. You manually start from the Host View GUI.

set -e

echo "🚀 HexQz Stress Test"
echo "=============================="
echo ""

usage() {
  echo "Usage:"
  echo "  $0 [players] [baseUrl]                  Single session (manual start)"
  echo "  $0 --parallel [options]                  Parallel multi-session test"
  echo ""
  echo "Parallel options:"
  echo "  --sessions <n>      Number of sessions (default: 8)"
  echo "  --players <n>       Players per session (default: 10)"
  echo "  --base-url <url>    Server URL (default: http://quiz:3042)"
  echo "  --auto-advance      Auto-start and advance all sessions"
  echo "  --answer-time <s>   Answer time per question (default: 10)"
  echo "  --scoreboard <s>    Scoreboard pause time (default: 3)"
  echo ""
  echo "Examples:"
  echo "  $0 50                                    50 players, manual start"
  echo "  $0 --parallel --auto-advance             8 sessions, 10 players each, auto"
  echo "  $0 --parallel --sessions 4 --players 20  4 sessions, 20 players each"
}

if [[ "$1" == "--help" || "$1" == "-h" ]]; then
  usage
  exit 0
fi

if [[ "$1" == "--parallel" ]]; then
  shift
  echo "📊 Running parallel multi-session stress test..."
  echo ""
  docker compose --profile testing run --rm stress-test node parallel-stress-test.js "$@"
else
  # Original single-session mode
  NUM_PLAYERS=${1:-50}
  BASE_URL=${2:-http://quiz:3042}

  echo "📊 Test Configuration:"
  echo "   Players: $NUM_PLAYERS"
  echo "   Target: $BASE_URL"
  echo "   Mode: Manual start from GUI"
  echo ""

  docker compose --profile testing run --rm stress-test --auto "$NUM_PLAYERS" "$BASE_URL"
fi
