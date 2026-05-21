#!/bin/bash

# Quick stress test script
# Creates quiz and connects players. You manually start from the Host View GUI.

set -e

echo "🚀 HexQz Complete Stress Test"
echo "=============================="
echo ""

# Configuration
NUM_PLAYERS=${1:-50}
BASE_URL=${2:-http://quiz:3042}

echo "📊 Test Configuration:"
echo "   Players: $NUM_PLAYERS"
echo "   Target: $BASE_URL"
echo "   Mode: Manual start from GUI"
echo ""

# Run the test
docker compose --profile testing run --rm stress-test --auto "$NUM_PLAYERS" "$BASE_URL"
