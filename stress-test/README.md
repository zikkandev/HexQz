# HexQz Stress Testing

Test your quiz platform with multiple concurrent virtual players.

## Quick Start (Docker - Recommended)

### Fully Automated (creates quiz, session, and starts automatically)

```bash
# Run complete end-to-end test with 50 players
AUTO_START=true docker compose --profile testing run --rm stress-test --auto 50 http://nginx

# Or use the convenience script
./stress-test/run-test.sh 50
```

This will:
1. Create a test quiz with 5 questions
2. Create a session and get join code
3. Register 50 virtual players
4. Start the quiz automatically in auto-mode
5. Players answer questions as they appear
6. Complete entire quiz cycle

**Perfect for:**
- CI/CD pipeline testing
- Pre-deployment validation
- Performance benchmarking

### Semi-Automated (creates quiz, but you start manually)

```bash
# Create quiz and session, but don't start it yet
docker compose --profile testing run --rm stress-test --auto 50 http://nginx
```

You'll get a host URL to manually start the quiz.

### Manual Mode (use existing join code)

```bash
# Run test with 50 players using existing session
docker compose --profile testing run --rm stress-test ABC123 50 http://nginx
```

This runs the test from within a Docker container connected to the same network as your quiz app.

## Manual Installation

```bash
cd stress-test
npm install
```

## Usage

### Docker (Recommended)

```bash
docker compose --profile testing run --rm stress-test <joinCode> <numPlayers> [baseUrl]
```

The `baseUrl` should be `http://nginx` when testing from inside Docker, or your public URL.

**Examples:**

Test with 50 players via internal network:
```bash
docker compose --profile testing run --rm stress-test ABC123 50 http://nginx
```

Test with 100 players on production (from inside container):
```bash
docker compose --profile testing run --rm stress-test XYZ789 100 https://quiz.zikkan.com
```

### Manual (Node.js)

```bash
node stress-test.js <joinCode> <numPlayers> [baseUrl]
```

### Parameters

- `joinCode`: The 6-character session join code
- `numPlayers`: Number of virtual players to simulate (1-1000)
- `baseUrl`: Base URL of your quiz server
  - Use `http://nginx` when running from Docker
  - Use `https://quiz.zikkan.com` for production testing
  - Use `http://localhost:3042` for local direct testing

### Examples

Test with 50 players locally (direct):
```bash
node stress-test.js ABC123 50 http://localhost:3042
```

Test with 100 players on production:
```bash
node stress-test.js XYZ789 100 https://quiz.zikkan.com
```

## What It Does

1. **Validates** the join code and finds the session
2. **Registers** all virtual players with names like `Player1`, `Player2`, etc.
3. **Connects** each player via WebSocket
4. **Automatically answers** questions with random answers
5. **Simulates realistic timing** (0.5-3 second delay per answer)
6. **Reports statistics** on connection and answer rates

## Features

- Handles all question types (single choice, multiple choice, text, numeric, estimation, multi-part)
- Automatic reconnection on network issues
- Graceful shutdown with Ctrl+C
- Real-time progress feedback

## Interpreting Results

Monitor your server logs and the stress test output to check:
- **Connection success rate**: Should be near 100%
- **Answer submission rate**: All virtual players should successfully submit answers
- **Response times**: Server should handle all requests within reasonable time
- **WebSocket stability**: Connections should remain stable throughout the quiz

## Tips

- Start with a smaller number (10-20) to verify everything works
- Gradually increase to your target load (50+)
- Monitor server CPU and memory usage during tests
- Check for any error messages in both client and server logs
- Use Docker for consistent, isolated testing environment

