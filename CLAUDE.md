# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multiplayer Italian word game built with Node.js, Express, and Socket.IO. Players create words from letter cards, bluff about words, and challenge each other. The game supports multiple game modes: Classic, Battle (1v1), Speed (timed turns), and Cooperative.

## Development Commands

### Running the Application
```bash
npm start          # Start the production server
npm run dev        # Start development server with nodemon (auto-restart on changes)
```

The server will run on port 3000 by default (configurable via PORT environment variable) and display all available network addresses for multiplayer access.

### No Build/Test/Lint Commands
This project has no build step, tests, or linting configured. It runs JavaScript directly in Node.js.

## Architecture

### Three-File Structure
The application consists of three main files that work together:

1. **server.js** - Express/Socket.IO server
   - Initializes HTTP server and Socket.IO with CORS enabled
   - Delegates all game logic to GameManager
   - Socket event handlers map directly to GameManager methods
   - Broadcasts game state updates to all players in a room
   - Handles player disconnections and reconnections

2. **game-logic.js** - GameManager class (server-side)
   - Core game state management (stored in `games` Map)
   - Player session tracking (stored in `playerSessions` Map)
   - Game modes: classic, battle, speed, coop
   - Italian letter frequency-based deck creation
   - Turn-based logic with timer support
   - Power-up system (doublePoints, skipTurn, revealCard, extraDraw)
   - Bluff mechanism (challenge → vote → result)
   - Score tracking (individual or team-based)

3. **client.js** - Client-side game UI
   - Socket.IO client connection management
   - UI updates based on server events
   - Player actions (play card, call bluff, use power-up)
   - Debug panel for development
   - Mobile-friendly touch interactions

### Game Flow
1. Player creates game → GameManager creates game object in `games` Map
2. Other players join via game ID → Added to same room
3. Host starts game → Cards dealt, hands sent privately via socket.to(playerId)
4. Players take turns playing cards → State broadcast to room
5. Bluff challenges → Multi-step flow (challenge → proposer submits word → voting → result)
6. Round ends → Reset with new cards, continue until game ends

### Game State Management
- Each game stored in `games` Map with unique ID
- Player sessions track which game each socket.id belongs to
- `sanitizeGameData()` removes private info (hands) before broadcasting
- Individual hands sent via private socket events: `socket.to(playerId).emit('handUpdate', ...)`
- Timer managed per-game with `turnTimer` stored in game object

### Game Modes (gameMode field)
- **classic**: Standard rules, 2-6 players, 6 cards per player
- **battle**: 1v1 competitive, extra special cards, 8 cards per player, power-ups enabled
- **speed**: Timed turns (15 seconds), adds pressure
- **coop**: Team-based, shared `teamScore`, target score to win together

### Settings System
Each game has a `settings` object configured based on game mode:
- `timer`: boolean - enables turn timer
- `timerDuration`: number - seconds per turn
- `powerups`: boolean - enables power-up system
- `maxPlayers`: number - 2 for battle, 6 for others
- `specialCards`: number - how many special cards in deck
- `cooperative`: boolean - team mode flag

### Italian Letter Frequency
The deck uses Italian letter distribution (see `createDeck()` in game-logic.js):
- High frequency: E(14), A(10), I(10), O(10)
- Medium: C,D,L,M,N,P,R,S,T (5 each)
- Low: U(4), G,V(3), B,F(2), H,Q,Z(1)
- Special cards: Joker, Cambio Turno, etc.

### Socket Event Flow Examples

**Creating/Joining:**
- Client emits `createGame` → Server responds with `gameCreated` + `gameUpdate`
- Client emits `joinGame` → Server responds with `gameJoined` + `gameUpdate`

**Playing Cards:**
- Client emits `playCard` → Server validates → Broadcasts `gameUpdate` to room + sends `handUpdate` to player

**Bluff Challenge:**
- Client emits `callBluff` → Server broadcasts `bluffChallenge`
- Accused player emits `submitBluffWord` → Server broadcasts `bluffVote`
- All players emit `voteBluffWord` → Server broadcasts `bluffResult` → Auto-reset after 3 seconds

### File Organization
- index.html - Single-page HTML structure
- styles.css - Complete styling (not critical to understand)
- No src/ directory, no modules, no transpilation

## Important Notes

### Power-Ups System
Power-ups are initialized per-player in `game.powerups[playerId]` object when game starts (if enabled). Each player gets:
- `doublePoints: 1` - One-time points multiplier
- `skipTurn: 1` - Skip opponent's turn once
- `revealCard: 1` - Peek at opponent's card once
- `extraDraw: 2` - Draw extra card twice

### Timer Implementation
- **Server-side**: Uses `setTimeout` for expiry + optional `setInterval` for sync (every 5 seconds)
- **Client-side**: Local countdown with `setInterval` updating display every 100ms for smooth animation
- Server sends initial `timerStart` event with duration and timestamp, client calculates countdown locally
- Auto-sync mechanism: if client drift > 1 second from server, automatically adjusts
- On timeout, server plays random card automatically and notifies clients via `timerExpired`
- Timer properly cleaned up with `clearGameTimer()` on game deletion or bluff challenges

### Bluff Voting
- Requires all OTHER players to vote (not the accused player)
- Majority vote determines if word is valid
- If valid word, challenger loses points; if invalid, accused loses points
- 3-second delay before round reset to show results

### Reconnection Handling
The game doesn't currently handle reconnection persistence - if a player disconnects, they're removed from the game. `playerSessions` Map is cleared on disconnect.

## Security & Performance Improvements

### Security Features
- **Input Validation**: All player names, game modes, and chat messages are validated and sanitized to prevent XSS attacks
- **Secure ID Generation**: Game IDs generated using `crypto.randomBytes()` instead of `Math.random()` for cryptographic security
- **CORS Protection**: Origin validation with allowlist (configurable via `ALLOWED_ORIGINS` env variable)
- **Rate Limiting**: Built-in rate limiting prevents spam:
  - playCard: max 5 actions per 10 seconds
  - chat: max 5 messages per 10 seconds
  - callBluff: max 3 calls per 10 seconds
  - usePowerUp: max 3 uses per 5 seconds

### Performance Optimizations
- **Player Index Map**: O(1) player lookups using `game.playerIndex` Map instead of O(n) array searches
- **Automatic Cleanup**: Inactive games (lobby > 1 hour old) automatically removed every 10 minutes
- **Memory Management**: Timer cleanup on game deletion, rate limit data pruned every minute
- **Code Deduplication**: `dealCardsToPlayers()` and `prepareDeck()` helpers eliminate duplicate logic
- **Client-Side Timer**: Countdown managed locally on client (updates every 100ms) with server sync every 5 seconds
  - Reduces network traffic from ~15 events/turn to 2-3 events/turn
  - Server sends: `timerStart` (initial), `timerSync` (every 5s), `timerExpired` (final)
  - Client auto-syncs if drift > 1 second detected

### Bug Fixes
- **resetRound()** now correctly uses battle deck and 8 cards for battle mode (was always using normal deck and 6 cards)
- **Race condition** in voting system prevented with `voteProcessed` flag
- **Timer memory leaks** fixed with centralized `clearGameTimer()` method
- All timer intervals properly cleaned up on game deletion

## Code Style Notes
- Italian comments and variable names throughout
- Server uses console.log for debugging (no structured logging)
- Client has debug panel (toggle with debug button) for development
- No error handling middleware - errors sent as socket events
- Uses ES6 classes (GameManager) and modern JavaScript features
- Helper methods prefixed with `get*`, `validate*`, `sanitize*`, or `prepare*`
