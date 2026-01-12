// server.js - Server Principale
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const os = require('os');
const GameManager = require('./game-logic');

const app = express();
const server = http.createServer(app);

// CORS sicuro - configura le origini permesse tramite variabile d'ambiente
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

const io = socketIo(server, {
    cors: {
        origin: (origin, callback) => {
            // Permetti richieste senza origin (app mobile, Postman, ecc.)
            if (!origin) return callback(null, true);

            // In sviluppo locale, permetti tutte le origini localhost
            if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
                return callback(null, true);
            }

            // Permetti domini Render.com (per deployment)
            if (origin.includes('.onrender.com')) {
                return callback(null, true);
            }

            // Controlla lista origini permesse
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            callback(new Error('CORS non permesso'));
        },
        methods: ["GET", "POST"],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Servire i file statici
app.use(express.static(__dirname));

// Inizializza il game manager
const gameManager = new GameManager(io);

// ==================== SOCKET HANDLERS ====================
io.on('connection', (socket) => {
    console.log(`[CONNECT] Nuovo giocatore: ${socket.id}`);
    
    socket.emit('connected', { 
        socketId: socket.id,
        message: 'Connesso al server!' 
    });
    
    // Timer events from GameManager are emitted directly via io reference
    
    // Crea partita
    socket.on('createGame', (data) => {
        const result = gameManager.createGame(socket.id, data);
        if (result.success) {
            socket.join(result.gameId);
            socket.emit('gameCreated', result);
            io.to(result.gameId).emit('gameUpdate', {
                game: result.game,
                message: `${data.playerName} ha creato la partita`
            });
        } else {
            socket.emit('error', result.error);
        }
    });
    
    // Unisciti a partita
    socket.on('joinGame', (data) => {
        const result = gameManager.joinGame(socket.id, data);
        if (result.success) {
            socket.join(result.gameId);
            socket.emit('gameJoined', result);
            io.to(result.gameId).emit('gameUpdate', {
                game: result.game,
                message: `${data.playerName} si è unito`
            });
        } else {
            socket.emit('error', result.error);
        }
    });
    
    // Avvia partita
    socket.on('startGame', () => {
        const result = gameManager.startGame(socket.id);
        if (result.success) {
            io.to(result.gameId).emit('gameStarted', {
                message: 'Partita iniziata!',
                game: result.game,
                timerActive: result.timerActive,
                powerupsEnabled: result.powerupsEnabled
            });
            
            // Invia le mani ai giocatori
            result.hands.forEach(({ playerId, hand }) => {
                io.to(playerId).emit('handUpdate', { hand, playerId });
            });
            
            // Invia power-ups se abilitati
            if (result.powerupsEnabled) {
                const game = gameManager.games.get(result.gameId);
                game.players.forEach(player => {
                    io.to(player.id).emit('powerUpsUpdate', {
                        powerUps: game.powerups[player.id]
                    });
                });
            }
        } else {
            socket.emit('error', result.error);
        }
    });
    
    // Usa power-up
    socket.on('usePowerUp', (type) => {
        const result = gameManager.usePowerUp(socket.id, type);
        if (result.success) {
            socket.emit('powerUpUsed', result);
            
            // Notifica altri giocatori se necessario
            if (result.effect) {
                io.to(result.gameId).emit('powerUpEffect', {
                    player: socket.id,
                    effect: result.effect
                });
            }
            
            // Aggiorna stato gioco se necessario
            if (type === 'skipTurn') {
                const game = gameManager.games.get(result.gameId);
                io.to(result.gameId).emit('gameUpdate', {
                    game: gameManager.sanitizeGameData(game),
                    message: result.effect
                });
            }
        } else {
            socket.emit('error', result.error);
        }
    });
    
    // Gioca carta
    socket.on('playCard', (cardIndex) => {
        const result = gameManager.playCard(socket.id, cardIndex);
        if (result.success) {
            io.to(result.gameId).emit('gameUpdate', {
                game: result.game,
                message: result.message
            });
            socket.emit('handUpdate', {
                hand: result.hand,
                playerId: socket.id
            });
        } else {
            socket.emit('error', result.error);
        }
    });
    
    // Chiama bluff
    socket.on('callBluff', () => {
        const result = gameManager.callBluff(socket.id);
        if (result.success) {
            io.to(result.gameId).emit('bluffChallenge', result.data);
        } else {
            socket.emit('error', result.error);
        }
    });
    
    // Invia parola bluff
    socket.on('submitBluffWord', (word) => {
        const result = gameManager.submitBluffWord(socket.id, word);
        if (result.success) {
            if (result.startVote) {
                // Inizia votazione
                io.to(result.gameId).emit('bluffVote', {
                    word: result.data.word,
                    proposerId: result.data.proposerId
                });
            }
        } else {
            socket.emit('error', result.error);
        }
    });
    
    // Vota sulla parola del bluff
    socket.on('voteBluffWord', (isValid) => {
        const result = gameManager.voteBluffWord(socket.id, isValid);
        if (result.success) {
            if (result.voteComplete) {
                // Votazione completa
                io.to(result.gameId).emit('bluffResult', result.data);
                
                // Reset dopo 3 secondi
                setTimeout(() => {
                    const resetResult = gameManager.resetRound(result.gameId);
                    if (resetResult.success) {
                        io.to(result.gameId).emit('gameUpdate', {
                            game: resetResult.game,
                            message: 'Nuovo round!'
                        });
                        resetResult.hands.forEach(({ playerId, hand }) => {
                            io.to(playerId).emit('handUpdate', { hand, playerId });
                        });
                    }
                }, 3000);
            } else if (result.voteCounted) {
                // Voto registrato
                io.to(result.gameId).emit('voteUpdate', {
                    votesRemaining: result.votesRemaining
                });
            }
        } else {
            socket.emit('error', result.error);
        }
    });
    
    // Ammetti bluff
    socket.on('admitBluff', () => {
        const result = gameManager.admitBluff(socket.id);
        if (result.success) {
            io.to(result.gameId).emit('bluffResult', result.data);
            
            setTimeout(() => {
                const resetResult = gameManager.resetRound(result.gameId);
                if (resetResult.success) {
                    io.to(result.gameId).emit('gameUpdate', {
                        game: resetResult.game,
                        message: 'Nuovo round!'
                    });
                    resetResult.hands.forEach(({ playerId, hand }) => {
                        io.to(playerId).emit('handUpdate', { hand, playerId });
                    });
                }
            }, 3000);
        }
    });
    
    // Chat
    socket.on('chatMessage', (message) => {
        const result = gameManager.sendChatMessage(socket.id, message);
        if (result.success) {
            io.to(result.gameId).emit('chatMessage', result.data);
        }
    });
    
    // Richiedi stato
    socket.on('requestState', () => {
        const result = gameManager.getPlayerState(socket.id);
        if (result.success) {
            socket.emit('gameUpdate', {
                game: result.game,
                message: 'Stato aggiornato'
            });
            if (result.hand) {
                socket.emit('handUpdate', {
                    hand: result.hand,
                    playerId: socket.id
                });
            }
        }
    });
    
    // Disconnessione
    socket.on('disconnect', () => {
        console.log(`[DISCONNECT] Giocatore disconnesso: ${socket.id}`);
        const result = gameManager.removePlayer(socket.id);
        if (result.success && result.gameId) {
            io.to(result.gameId).emit('playerLeft', result.data);
            if (result.game) {
                io.to(result.gameId).emit('gameUpdate', {
                    game: result.game,
                    message: `${result.data.playerName} ha lasciato`
                });
            }
        }
    });
});

// ==================== AVVIO SERVER ====================
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
    const networkInterfaces = os.networkInterfaces();
    
    console.log(`
╔════════════════════════════════════════════════════╗
║          🎮 GIOCO DI PAROLE - SERVER ATTIVO 🎮      ║
╠════════════════════════════════════════════════════╣
║  Server in ascolto sulla porta ${PORT}                  ║
╠════════════════════════════════════════════════════╣
║  Collegamenti disponibili:                         ║`);
    
    Object.keys(networkInterfaces).forEach((interfaceName) => {
        networkInterfaces[interfaceName].forEach((iface) => {
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log(`║  → http://${iface.address}:${PORT}                       ║`);
            }
        });
    });
    
    console.log(`║  → http://localhost:${PORT} (solo locale)           ║`);
    console.log(`╚════════════════════════════════════════════════════╝\n`);
});