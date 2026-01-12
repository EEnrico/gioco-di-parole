// game-logic.js - Logica del Gioco
const crypto = require('crypto');

class GameManager {
    constructor(io) {
        this.io = io;
        this.games = new Map();
        this.playerSessions = new Map();
        this.rateLimits = new Map(); // Tracking rate limiting per giocatore

        // Cleanup automatico giochi inattivi ogni 10 minuti
        this.cleanupInterval = setInterval(() => {
            this.cleanupInactiveGames();
        }, 600000);

        // Cleanup rate limits ogni minuto
        setInterval(() => {
            this.cleanupRateLimits();
        }, 60000);
    }

    // Metodo per pulire timer di un gioco
    clearGameTimer(game) {
        if (game.turnTimer) {
            // Gestisce sia il vecchio formato (interval) che il nuovo (oggetto)
            if (typeof game.turnTimer === 'object') {
                if (game.turnTimer.timeout) clearTimeout(game.turnTimer.timeout);
                if (game.turnTimer.syncInterval) clearInterval(game.turnTimer.syncInterval);
            } else {
                clearInterval(game.turnTimer);
            }
            game.turnTimer = null;
        }
    }

    // Cleanup automatico giochi abbandonati
    cleanupInactiveGames() {
        const oneHourAgo = Date.now() - 3600000;
        let cleaned = 0;

        for (let [id, game] of this.games.entries()) {
            // Elimina giochi in lobby più vecchi di 1 ora
            if (game.status === 'lobby' && game.createdAt < oneHourAgo) {
                this.clearGameTimer(game);
                this.games.delete(id);
                cleaned++;
            }
            // Elimina giochi in progress senza giocatori
            if (game.players.length === 0) {
                this.clearGameTimer(game);
                this.games.delete(id);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[CLEANUP] ${cleaned} giochi inattivi eliminati`);
        }
    }

    // Cleanup rate limits vecchi (oltre 1 minuto)
    cleanupRateLimits() {
        const oneMinuteAgo = Date.now() - 60000;
        for (let [playerId, limits] of this.rateLimits.entries()) {
            // Rimuovi azioni più vecchie di 1 minuto
            for (let action in limits) {
                limits[action] = limits[action].filter(timestamp => timestamp > oneMinuteAgo);
            }
            // Rimuovi player se non ha più azioni tracciate
            if (Object.values(limits).every(arr => arr.length === 0)) {
                this.rateLimits.delete(playerId);
            }
        }
    }

    // Controlla rate limit per un'azione
    checkRateLimit(playerId, action, maxActions = 10, windowMs = 10000) {
        if (!this.rateLimits.has(playerId)) {
            this.rateLimits.set(playerId, {});
        }

        const playerLimits = this.rateLimits.get(playerId);
        if (!playerLimits[action]) {
            playerLimits[action] = [];
        }

        const now = Date.now();
        const windowStart = now - windowMs;

        // Rimuovi azioni fuori dalla finestra temporale
        playerLimits[action] = playerLimits[action].filter(timestamp => timestamp > windowStart);

        // Controlla se ha superato il limite
        if (playerLimits[action].length >= maxActions) {
            return false; // Rate limit superato
        }

        // Registra questa azione
        playerLimits[action].push(now);
        return true; // OK
    }

    // Sanitizza stringa per prevenire XSS
    sanitizeString(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/[<>]/g, '') // Rimuovi < e >
            .trim()
            .substring(0, 50); // Max 50 caratteri
    }

    // Valida nome giocatore
    validatePlayerName(name) {
        if (!name || typeof name !== 'string') return false;
        // Controlla lunghezza PRIMA della sanitizzazione per dare errore chiaro
        if (name.length > 50 || name.length < 2) return false;
        const sanitized = this.sanitizeString(name);
        return sanitized.length >= 2;
    }

    // Valida modalità di gioco
    validateGameMode(mode) {
        const validModes = ['classic', 'battle', 'speed', 'coop'];
        return validModes.includes(mode);
    }

    // Valida messaggio chat
    validateChatMessage(message) {
        if (!message || typeof message !== 'string') return false;
        // Controlla lunghezza PRIMA della sanitizzazione
        if (message.length > 200) return false;
        const sanitized = this.sanitizeChatMessage(message);
        return sanitized.length >= 1;
    }

    // Sanitizza messaggio chat (limite più alto)
    sanitizeChatMessage(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/[<>]/g, '')
            .trim()
            .substring(0, 200); // Max 200 caratteri per chat
    }

    // Genera ID gioco sicuro usando crypto
    generateGameId() {
        return 'game_' + crypto.randomBytes(8).toString('hex');
    }

    // Helper: Distribuisce carte ai giocatori
    dealCardsToPlayers(game) {
        const cardsPerPlayer = game.gameMode === 'battle' ? 8 : 6;
        const hands = [];

        game.players.forEach(player => {
            game.hands[player.id] = [];
            for (let i = 0; i < cardsPerPlayer; i++) {
                if (game.deck.length > 0) {
                    game.hands[player.id].push(game.deck.pop());
                }
            }
            hands.push({
                playerId: player.id,
                hand: game.hands[player.id]
            });
        });

        return hands;
    }

    // Helper: Prepara deck in base alla modalità
    prepareDeck(gameMode) {
        if (gameMode === 'battle') {
            return this.createBattleDeck();
        } else {
            return this.createDeck();
        }
    }

    // Helper: Ricostruisce l'indice giocatori per ricerche veloci
    rebuildPlayerIndex(game) {
        game.playerIndex = new Map();
        game.players.forEach((player, index) => {
            game.playerIndex.set(player.id, index);
        });
    }

    // Helper: Ottiene l'indice di un giocatore (O(1) invece di O(n))
    getPlayerIndex(game, playerId) {
        if (!game.playerIndex) {
            this.rebuildPlayerIndex(game);
        }
        return game.playerIndex.get(playerId);
    }

    // Helper: Ottiene un giocatore (O(1) invece di O(n))
    getPlayer(game, playerId) {
        const index = this.getPlayerIndex(game, playerId);
        return index !== undefined ? game.players[index] : null;
    }

    // Crea mazzo di carte
    createDeck() {
        const lettersFrequency = {
            'E': 14, 'A': 10, 'I': 10, 'O': 10,
            'C': 5, 'D': 5, 'L': 5, 'M': 5, 'N': 5, 'P': 5, 'R': 5, 'S': 5, 'T': 5,
            'U': 4, 'G': 3, 'V': 3, 'B': 2, 'F': 2, 'H': 1, 'Q': 1, 'Z': 1
        };
        
        let cards = [];
        for (const letter in lettersFrequency) {
            for (let i = 0; i < lettersFrequency[letter]; i++) {
                cards.push({ type: 'letter', value: letter });
            }
        }
        
        // Carte speciali base
        cards.push({ type: 'special', value: 'Joker' });
        cards.push({ type: 'special', value: 'Joker' });
        cards.push({ type: 'special', value: 'Cambio Turno' });
        
        return this.shuffle(cards);
    }
    
    createBattleDeck() {
        let deck = this.createDeck();
        
        // Aggiungi carte speciali extra per battaglia
        const extraSpecials = [
            { type: 'special', value: 'Ruba Carta' },
            { type: 'special', value: 'Scambia Mano' },
            { type: 'special', value: 'Blocca' },
            { type: 'special', value: 'Pesca 3' }
        ];
        
        extraSpecials.forEach(card => deck.push(card));
        return this.shuffle(deck);
    }
    
    initializePowerUps(game) {
        if (!game.settings.powerups) return;
        
        game.players.forEach(player => {
            game.powerups[player.id] = {
                doublePoints: 1,  // Raddoppia punti per un turno
                skipTurn: 1,       // Salta il turno di un avversario
                revealCard: 1,     // Rivela una carta random
                extraDraw: 2       // Pesca una carta extra
            };
        });
    }
    
    usePowerUp(playerId, powerUpType) {
        // Rate limiting: max 3 power-up in 5 secondi
        if (!this.checkRateLimit(playerId, 'powerup', 3, 5000)) {
            return { success: false, error: { message: 'Troppi power-up! Rallenta.' } };
        }

        const session = this.playerSessions.get(playerId);
        if (!session) {
            return { success: false, error: { message: 'Sessione non trovata' } };
        }

        const game = this.games.get(session.gameId);
        if (!game || !game.settings.powerups) {
            return { success: false, error: { message: 'Power-up non disponibili' } };
        }
        
        const playerPowerUps = game.powerups[playerId];
        if (!playerPowerUps || !playerPowerUps[powerUpType] || playerPowerUps[powerUpType] <= 0) {
            return { success: false, error: { message: 'Power-up non disponibile' } };
        }
        
        // Usa il power-up
        playerPowerUps[powerUpType]--;
        
        let result = { success: true, gameId: game.id };
        
        switch(powerUpType) {
            case 'skipTurn':
                game.currentTurn = (game.currentTurn + 1) % game.players.length;
                result.effect = 'Turno saltato!';
                break;
                
            case 'extraDraw':
                if (game.deck.length > 0) {
                    const card = game.deck.pop();
                    game.hands[playerId].push(card);
                    result.newCard = card;
                    result.effect = 'Carta extra pescata!';
                }
                break;
                
            case 'revealCard':
                const opponents = game.players.filter(p => p.id !== playerId);
                if (opponents.length > 0) {
                    const randomOpponent = opponents[Math.floor(Math.random() * opponents.length)];
                    const opponentHand = game.hands[randomOpponent.id];
                    if (opponentHand && opponentHand.length > 0) {
                        const randomCard = opponentHand[Math.floor(Math.random() * opponentHand.length)];
                        result.revealedCard = {
                            player: randomOpponent.name,
                            card: randomCard
                        };
                        result.effect = `Carta rivelata di ${randomOpponent.name}: ${randomCard.value}`;
                    }
                }
                break;
                
            case 'doublePoints':
                // Sarà applicato al prossimo punto guadagnato
                if (!game.doublePointsActive) game.doublePointsActive = {};
                game.doublePointsActive[playerId] = true;
                result.effect = 'Punti raddoppiati per il prossimo round vinto!';
                break;
        }
        
        result.powerUpType = powerUpType;
        result.remainingPowerUps = playerPowerUps;
        
        return result;
    }

    shuffle(array) {
        let currentIndex = array.length;
        while (currentIndex !== 0) {
            const randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    validateWord(word, tableCards) {
        if (!word || word.length < 2) return false;
        
        word = word.toUpperCase().trim();
        const tableLetters = tableCards
            .filter(card => card.type === 'letter')
            .map(card => card.value.toUpperCase());
        
        if (tableLetters.length === 0) return false;
        
        const wordLetters = word.split('');
        for (let letter of tableLetters) {
            const index = wordLetters.indexOf(letter);
            if (index === -1) return false;
            wordLetters.splice(index, 1);
        }
        
        return true;
    }

    sanitizeGameData(game) {
        return {
            id: game.id,
            status: game.status,
            hostId: game.hostId,
            players: game.players,
            tableCards: game.tableCards,
            currentTurn: game.currentTurn,
            scores: game.scores,
            lastPlayerPlayedId: game.lastPlayerPlayedId,
            challengerId: game.challengerId,
            deckCount: game.deck.length,
            settings: game.settings,
            gameMode: game.gameMode,
            teamScore: game.teamScore,
            targetScore: game.targetScore
        };
    }

    createGame(playerId, data) {
        // Validazione input
        const rawPlayerName = data.playerName || 'Giocatore';
        if (!this.validatePlayerName(rawPlayerName)) {
            return {
                success: false,
                error: { message: 'Nome giocatore non valido (2-50 caratteri)' }
            };
        }

        const rawGameMode = data.gameMode || 'classic';
        if (!this.validateGameMode(rawGameMode)) {
            return {
                success: false,
                error: { message: 'Modalità di gioco non valida' }
            };
        }

        const gameId = this.generateGameId();
        const playerName = this.sanitizeString(rawPlayerName);
        const gameMode = rawGameMode;
        
        // Configurazione basata sulla modalità
        let settings = {
            timer: gameMode === 'speed',
            timerDuration: gameMode === 'speed' ? 15 : 30,
            powerups: data.settings?.powerups || gameMode === 'battle',
            maxPlayers: gameMode === 'battle' ? 2 : 6,
            specialCards: gameMode === 'battle' ? 5 : 3,
            cooperative: gameMode === 'coop'
        };
        
        const game = {
            id: gameId,
            status: 'lobby',
            hostId: playerId,
            players: [{
                id: playerId,
                name: playerName,
                isHost: true
            }],
            deck: [],
            tableCards: [],
            hands: {},
            currentTurn: 0,
            scores: { [playerId]: 0 },
            lastPlayerPlayedId: null,
            challengerId: null,
            bluffWord: null,
            settings: settings,
            gameMode: gameMode,
            turnTimer: null,
            powerups: {},
            teamScore: 0, // Per modalità cooperativa
            createdAt: Date.now(),
            playerIndex: new Map() // Indice per ricerche veloci
        };

        this.games.set(gameId, game);
        this.rebuildPlayerIndex(game); // Inizializza indice
        this.playerSessions.set(playerId, { gameId, playerName });
        
        console.log(`[GAME] Partita ${gameId} creata da ${playerName}`);
        
        return {
            success: true,
            gameId: gameId,
            userId: playerId,
            isHost: true,
            game: this.sanitizeGameData(game)
        };
    }

    joinGame(playerId, data) {
        // Validazione input
        const rawPlayerName = data.playerName || 'Giocatore';
        if (!this.validatePlayerName(rawPlayerName)) {
            return {
                success: false,
                error: { message: 'Nome giocatore non valido (2-50 caratteri)' }
            };
        }

        const playerName = this.sanitizeString(rawPlayerName);
        let targetGame = null;
        
        if (data.gameId) {
            targetGame = this.games.get(data.gameId);
        } else {
            for (let game of this.games.values()) {
                const maxPlayers = game.settings.maxPlayers || 6;
                if (game.status === 'lobby' && game.players.length < maxPlayers) {
                    targetGame = game;
                    break;
                }
            }
        }
        
        if (!targetGame) {
            return {
                success: false,
                error: { message: 'Nessuna partita disponibile' }
            };
        }
        
        // Controlla limiti modalità
        const maxPlayers = targetGame.settings.maxPlayers || 6;
        if (targetGame.players.length >= maxPlayers) {
            return {
                success: false,
                error: { message: `Partita piena (max ${maxPlayers} giocatori)` }
            };
        }
        
        targetGame.players.push({
            id: playerId,
            name: playerName,
            isHost: false
        });
        targetGame.scores[playerId] = 0;
        this.rebuildPlayerIndex(targetGame); // Aggiorna indice

        this.playerSessions.set(playerId, {
            gameId: targetGame.id,
            playerName
        });
        
        console.log(`[GAME] ${playerName} unito a ${targetGame.id}`);
        
        return {
            success: true,
            gameId: targetGame.id,
            userId: playerId,
            isHost: false,
            game: this.sanitizeGameData(targetGame)
        };
    }

    startGame(playerId) {
        const session = this.playerSessions.get(playerId);
        if (!session) {
            return { success: false, error: { message: 'Sessione non trovata' } };
        }
        
        const game = this.games.get(session.gameId);
        if (!game) {
            return { success: false, error: { message: 'Partita non trovata' } };
        }
        
        if (game.hostId !== playerId) {
            return { success: false, error: { message: 'Solo l\'host può avviare' } };
        }
        
        // Controllo giocatori basato sulla modalità
        const minPlayers = game.gameMode === 'coop' ? 2 : 2;
        const maxPlayers = game.settings.maxPlayers;
        
        if (game.players.length < minPlayers) {
            return { success: false, error: { message: `Servono almeno ${minPlayers} giocatori` } };
        }
        
        if (game.gameMode === 'battle' && game.players.length !== 2) {
            return { success: false, error: { message: 'La modalità Battaglia richiede esattamente 2 giocatori' } };
        }
        
        // Inizializza il round
        game.status = 'inProgress';

        // Crea mazzo basato sulla modalità
        game.deck = this.prepareDeck(game.gameMode);
        game.tableCards = [];

        // Inizializza power-up se abilitati
        if (game.settings.powerups) {
            this.initializePowerUps(game);
        }

        // Distribuisci carte
        const hands = this.dealCardsToPlayers(game);
        
        // Reset punteggio per cooperativa
        if (game.gameMode === 'coop') {
            game.teamScore = 0;
            game.targetScore = 20; // Obiettivo da raggiungere insieme
        }
        
        // Avvia timer se necessario
        if (game.settings.timer) {
            this.startTurnTimer(game.id);
        }
        
        console.log(`[GAME] Partita ${game.id} iniziata - Modalità: ${game.gameMode}`);
        
        return {
            success: true,
            gameId: game.id,
            game: this.sanitizeGameData(game),
            hands: hands,
            timerActive: game.settings.timer,
            powerupsEnabled: game.settings.powerups
        };
    }
    
    startTurnTimer(gameId) {
        const game = this.games.get(gameId);
        if (!game || !game.settings.timer) return;

        // Cancella timer esistente
        this.clearGameTimer(game);

        const duration = game.settings.timerDuration * 1000;

        // Invia evento iniziale con timestamp - il client gestirà il countdown localmente
        const startTime = Date.now();
        this.io.to(gameId).emit('timerStart', {
            duration: game.settings.timerDuration,
            startTime: startTime,
            playerId: game.players[game.currentTurn].id
        });

        // Sincronizzazione opzionale ogni 5 secondi per prevenire drift
        const syncInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, game.settings.timerDuration - Math.floor(elapsed / 1000));

            if (remaining > 0) {
                this.io.to(gameId).emit('timerSync', {
                    timeLeft: remaining,
                    playerId: game.players[game.currentTurn].id
                });
            }
        }, 5000);

        // Timer per scadenza
        const timeout = setTimeout(() => {
            clearInterval(syncInterval);
            this.onTimerExpired(gameId);
        }, duration);

        // Salva entrambi i timer per cleanup
        game.turnTimer = { timeout, syncInterval };
    }
    
    onTimerExpired(gameId) {
        const game = this.games.get(gameId);
        if (!game || game.status !== 'inProgress') return;
        
        const currentPlayer = game.players[game.currentTurn];
        const hand = game.hands[currentPlayer.id];
        
        // Gioca una carta random
        if (hand && hand.length > 0) {
            const randomIndex = Math.floor(Math.random() * hand.length);
            this.playCard(currentPlayer.id, randomIndex);
            
            this.io.to(gameId).emit('timerExpired', {
                player: currentPlayer.name,
                message: 'Tempo scaduto! Carta giocata automaticamente.'
            });
        }
    }

    playCard(playerId, cardIndex) {
        // Rate limiting: max 5 carte in 10 secondi
        if (!this.checkRateLimit(playerId, 'playCard', 5, 10000)) {
            return { success: false, error: { message: 'Troppe azioni! Rallenta.' } };
        }

        const session = this.playerSessions.get(playerId);
        if (!session) {
            return { success: false, error: { message: 'Sessione non trovata' } };
        }

        const game = this.games.get(session.gameId);
        if (!game || game.status !== 'inProgress') {
            return { success: false, error: { message: 'Non puoi giocare ora' } };
        }
        
        const playerIndex = this.getPlayerIndex(game, playerId);
        if (playerIndex === undefined || playerIndex !== game.currentTurn) {
            return { success: false, error: { message: 'Non è il tuo turno' } };
        }

        const hand = game.hands[playerId];
        if (!hand || cardIndex < 0 || cardIndex >= hand.length) {
            return { success: false, error: { message: 'Carta non valida' } };
        }

        const card = hand.splice(cardIndex, 1)[0];
        game.tableCards.push(card);
        game.lastPlayerPlayedId = playerId;

        // Pesca nuova carta
        if (game.deck.length > 0) {
            hand.push(game.deck.pop());
        }

        // Gestisci carte speciali
        let specialEffect = '';
        if (card.type === 'special') {
            switch(card.value) {
                case 'Cambio Turno':
                    game.currentTurn = (game.currentTurn - 1 + game.players.length) % game.players.length;
                    specialEffect = 'Direzione cambiata!';
                    break;

                case 'Ruba Carta':
                    // Solo in modalità battaglia
                    if (game.gameMode === 'battle') {
                        const opponentIndex = (playerIndex + 1) % game.players.length;
                        const opponentId = game.players[opponentIndex].id;
                        const opponentHand = game.hands[opponentId];
                        if (opponentHand && opponentHand.length > 0) {
                            const randomIndex = Math.floor(Math.random() * opponentHand.length);
                            const stolenCard = opponentHand.splice(randomIndex, 1)[0];
                            hand.push(stolenCard);
                            specialEffect = 'Carta rubata!';
                        }
                    }
                    break;
                    
                case 'Blocca':
                    // Salta il prossimo turno
                    game.currentTurn = (game.currentTurn + 2) % game.players.length;
                    specialEffect = 'Turno bloccato!';
                    break;
                    
                case 'Pesca 3':
                    // Il prossimo giocatore pesca 3 carte
                    const nextPlayerIndex = (game.currentTurn + 1) % game.players.length;
                    const nextPlayerId = game.players[nextPlayerIndex].id;
                    for (let i = 0; i < 3 && game.deck.length > 0; i++) {
                        game.hands[nextPlayerId].push(game.deck.pop());
                    }
                    this.io.to(nextPlayerId).emit('handUpdate', {
                        hand: game.hands[nextPlayerId],
                        playerId: nextPlayerId
                    });
                    specialEffect = 'Pesca 3 carte!';
                    break;
                    
                case 'Scambia Mano':
                    // Solo in modalità battaglia
                    if (game.gameMode === 'battle') {
                        const opponentIndex = (playerIndex + 1) % game.players.length;
                        const opponentId = game.players[opponentIndex].id;
                        const tempHand = game.hands[playerId];
                        game.hands[playerId] = game.hands[opponentId];
                        game.hands[opponentId] = tempHand;
                        
                        // Aggiorna entrambe le mani
                        this.io.to(playerId).emit('handUpdate', {
                            hand: game.hands[playerId],
                            playerId: playerId
                        });
                        this.io.to(opponentId).emit('handUpdate', {
                            hand: game.hands[opponentId],
                            playerId: opponentId
                        });
                        specialEffect = 'Mani scambiate!';
                    }
                    break;
            }
        }
        
        // Aggiorna turno normale se non modificato da carte speciali
        if (!specialEffect || (specialEffect && card.value !== 'Cambio Turno' && card.value !== 'Blocca')) {
            game.currentTurn = (game.currentTurn + 1) % game.players.length;
        }
        
        // In modalità cooperativa, aggiungi punti al team
        if (game.gameMode === 'coop' && card.type === 'letter') {
            game.teamScore++;
            if (game.teamScore >= game.targetScore) {
                // Vittoria cooperativa!
                this.io.to(game.id).emit('coopVictory', {
                    message: 'Vittoria del team! Obiettivo raggiunto!',
                    score: game.teamScore
                });
            }
        }
        
        // Riavvia timer se attivo
        if (game.settings.timer) {
            this.startTurnTimer(session.gameId);
        }

        const player = this.getPlayer(game, playerId);

        return {
            success: true,
            gameId: game.id,
            game: this.sanitizeGameData(game),
            hand: hand,
            message: specialEffect || `${player.name} ha giocato ${card.value}`,
            specialEffect: specialEffect
        };
    }

    callBluff(playerId) {
        // Rate limiting: max 3 bluff in 10 secondi
        if (!this.checkRateLimit(playerId, 'bluff', 3, 10000)) {
            return { success: false, error: { message: 'Troppe chiamate bluff! Rallenta.' } };
        }

        const session = this.playerSessions.get(playerId);
        if (!session) {
            return { success: false, error: { message: 'Sessione non trovata' } };
        }

        const game = this.games.get(session.gameId);
        if (!game || game.status !== 'inProgress' || !game.lastPlayerPlayedId) {
            return { success: false, error: { message: 'Non puoi chiamare bluff ora' } };
        }
        
        if (game.lastPlayerPlayedId === playerId) {
            return { success: false, error: { message: 'Non puoi chiamare bluff a te stesso' } };
        }
        
        game.status = 'bluffChallenge';
        game.challengerId = playerId;

        // Ferma il timer durante il bluff
        this.clearGameTimer(game);

        const defender = this.getPlayer(game, game.lastPlayerPlayedId);
        const challenger = this.getPlayer(game, playerId);
        
        // Includi sia lettere che jolly nel conteggio
        const tableLetters = game.tableCards
            .filter(card => card.type === 'letter')
            .map(card => card.value);
        
        const jollyCards = game.tableCards
            .filter(card => card.type === 'special' && card.value === 'Joker');
        
        // Aggiungi i jolly all'array delle lettere come "Joker"
        const allLetters = [...tableLetters];
        jollyCards.forEach(() => allLetters.push('Joker'));
        
        return {
            success: true,
            gameId: game.id,
            data: {
                defenderId: game.lastPlayerPlayedId,
                defenderName: defender.name,
                challengerId: playerId,
                challengerName: challenger.name,
                tableLetters: allLetters // Include lettere + jolly
            }
        };
    }

    submitBluffWord(playerId, word) {
        const session = this.playerSessions.get(playerId);
        if (!session) {
            return { success: false, error: { message: 'Sessione non trovata' } };
        }
        
        const game = this.games.get(session.gameId);
        if (!game || game.status !== 'bluffChallenge' || game.lastPlayerPlayedId !== playerId) {
            return { success: false, error: { message: 'Non puoi inviare la parola ora' } };
        }
        
        // Verifica che la parola contenga tutte le lettere normali
        const normalLetters = game.tableCards
            .filter(card => card.type === 'letter')
            .map(card => card.value.toUpperCase());
        
        const jokerCount = game.tableCards
            .filter(card => card.type === 'special' && card.value === 'Joker')
            .length;
        
        const wordUpper = word.toUpperCase().trim();
        const minLength = normalLetters.length + jokerCount;
        
        // Verifica lunghezza minima
        if (wordUpper.length < minLength) {
            return { 
                success: false, 
                error: { message: `La parola deve avere almeno ${minLength} lettere!` } 
            };
        }
        
        // Verifica che contenga tutte le lettere normali
        const wordLetters = wordUpper.split('');
        for (let letter of normalLetters) {
            const index = wordLetters.indexOf(letter);
            if (index === -1) {
                return { 
                    success: false, 
                    error: { message: 'La parola deve contenere TUTTE le lettere del tavolo!' } 
                };
            }
            wordLetters.splice(index, 1);
        }
        
        // Inizia votazione
        game.status = 'bluffVote';
        game.bluffWord = word;
        game.bluffVotes = { valid: [], invalid: [] };
        game.voteProcessed = false; // Flag per prevenire race condition

        // Chi ha proposto la parola NON vota
        const voters = game.players.filter(p => p.id !== playerId);
        
        console.log(`[BLUFF] ${session.playerName} propone: "${word}" - ${voters.length} votanti`);
        
        return {
            success: true,
            gameId: game.id,
            startVote: true,
            data: {
                word: word,
                proposerId: playerId,
                voters: voters.map(v => v.id)
            }
        };
    }
    
    voteBluffWord(playerId, isValid) {
        const session = this.playerSessions.get(playerId);
        if (!session) {
            return { success: false };
        }

        const game = this.games.get(session.gameId);
        if (!game || game.status !== 'bluffVote') {
            return { success: false };
        }

        // Previeni race condition - se il voto è già stato processato
        if (game.voteProcessed) {
            return { success: false, error: { message: 'Votazione già completata' } };
        }

        // Chi ha proposto la parola NON può votare
        if (playerId === game.lastPlayerPlayedId) {
            return { success: false, error: { message: 'Non puoi votare sulla tua parola' } };
        }

        // Controlla se ha già votato
        if (game.bluffVotes.valid.includes(playerId) || game.bluffVotes.invalid.includes(playerId)) {
            return { success: false, error: { message: 'Hai già votato' } };
        }

        // Registra il voto
        if (isValid) {
            game.bluffVotes.valid.push(playerId);
        } else {
            game.bluffVotes.invalid.push(playerId);
        }

        // Calcola quanti devono votare (tutti tranne chi ha proposto)
        const totalVoters = game.players.length - 1;
        const totalVotes = game.bluffVotes.valid.length + game.bluffVotes.invalid.length;

        console.log(`[VOTE] ${session.playerName} vota: ${isValid ? 'VALIDA' : 'NON VALIDA'} (${totalVotes}/${totalVoters})`);

        if (totalVotes >= totalVoters) {
            // Marca come processato per prevenire doppia elaborazione
            game.voteProcessed = true;
            // Determina il risultato
            const validVotes = game.bluffVotes.valid.length;
            const invalidVotes = game.bluffVotes.invalid.length;
            
            // IN CASO DI PAREGGIO, LA PAROLA È VALIDA
            const isAccepted = validVotes >= invalidVotes;

            const defender = this.getPlayer(game, game.lastPlayerPlayedId);
            const challenger = this.getPlayer(game, game.challengerId);
            
            console.log(`[RESULT] Voti: ${validVotes} valida, ${invalidVotes} non valida - Risultato: ${isAccepted ? 'ACCETTATA' : 'RIFIUTATA'}`);
            
            if (isAccepted) {
                // Parola accettata - vince chi l'ha proposta
                game.scores[defender.id]++;
                game.currentTurn = this.getPlayerIndex(game, challenger.id);
                
                // Applica punti doppi se attivi
                if (game.doublePointsActive && game.doublePointsActive[defender.id]) {
                    game.scores[defender.id]++; // Punto extra
                    delete game.doublePointsActive[defender.id];
                }
                
                return {
                    success: true,
                    gameId: game.id,
                    voteComplete: true,
                    data: {
                        result: 'accepted',
                        bluffPlayerName: defender.name,
                        challengerName: challenger.name,
                        word: game.bluffWord,
                        winner: defender.name,
                        votes: { valid: validVotes, invalid: invalidVotes },
                        tieBreaker: validVotes === invalidVotes ? 'Pareggio - parola accettata' : null
                    }
                };
            } else {
                // Parola rifiutata - vince chi ha chiamato bluff
                game.scores[challenger.id]++;
                game.currentTurn = this.getPlayerIndex(game, defender.id);
                
                // Applica punti doppi se attivi
                if (game.doublePointsActive && game.doublePointsActive[challenger.id]) {
                    game.scores[challenger.id]++; // Punto extra
                    delete game.doublePointsActive[challenger.id];
                }
                
                return {
                    success: true,
                    gameId: game.id,
                    voteComplete: true,
                    data: {
                        result: 'rejected',
                        bluffPlayerName: defender.name,
                        challengerName: challenger.name,
                        word: game.bluffWord,
                        winner: challenger.name,
                        votes: { valid: validVotes, invalid: invalidVotes }
                    }
                };
            }
        }
        
        return {
            success: true,
            gameId: game.id,
            voteCounted: true,
            votesRemaining: totalVoters - totalVotes
        };
    }

    admitBluff(playerId) {
        const session = this.playerSessions.get(playerId);
        if (!session) {
            return { success: false, error: { message: 'Sessione non trovata' } };
        }

        const game = this.games.get(session.gameId);
        if (!game || game.status !== 'bluffChallenge' || game.lastPlayerPlayedId !== playerId) {
            return { success: false, error: { message: 'Non puoi ammettere ora' } };
        }

        const defender = this.getPlayer(game, game.lastPlayerPlayedId);
        const challenger = this.getPlayer(game, game.challengerId);

        game.scores[challenger.id]++;
        game.currentTurn = this.getPlayerIndex(game, defender.id);
        
        return {
            success: true,
            gameId: game.id,
            data: {
                result: 'admitted',
                bluffPlayerName: defender.name,
                challengerName: challenger.name,
                winner: challenger.name
            }
        };
    }

    resetRound(gameId) {
        const game = this.games.get(gameId);
        if (!game) {
            return { success: false, error: { message: 'Partita non trovata' } };
        }

        game.status = 'inProgress';

        // Crea deck corretto in base alla modalità
        game.deck = this.prepareDeck(game.gameMode);
        game.tableCards = [];
        game.lastPlayerPlayedId = null;
        game.challengerId = null;
        game.voteProcessed = false; // Reset flag voto

        // Distribuisci carte
        const hands = this.dealCardsToPlayers(game);
        
        // Riavvia il timer se necessario
        if (game.settings.timer) {
            this.startTurnTimer(gameId);
        }
        
        return {
            success: true,
            gameId: game.id,
            game: this.sanitizeGameData(game),
            hands: hands
        };
    }

    sendChatMessage(playerId, message) {
        // Rate limiting: max 5 messaggi in 10 secondi
        if (!this.checkRateLimit(playerId, 'chat', 5, 10000)) {
            return { success: false, error: { message: 'Troppi messaggi! Rallenta.' } };
        }

        const session = this.playerSessions.get(playerId);
        if (!session) {
            return { success: false };
        }

        const game = this.games.get(session.gameId);
        if (!game) {
            return { success: false };
        }

        // Validazione messaggio
        if (!this.validateChatMessage(message)) {
            return {
                success: false,
                error: { message: 'Messaggio non valido' }
            };
        }

        const player = this.getPlayer(game, playerId);
        const sanitizedMessage = this.sanitizeChatMessage(message);

        return {
            success: true,
            gameId: game.id,
            data: {
                player: player.name,
                message: sanitizedMessage,
                timestamp: Date.now()
            }
        };
    }

    getPlayerState(playerId) {
        const session = this.playerSessions.get(playerId);
        if (!session) {
            return { success: false };
        }
        
        const game = this.games.get(session.gameId);
        if (!game) {
            return { success: false };
        }
        
        return {
            success: true,
            game: this.sanitizeGameData(game),
            hand: game.hands[playerId]
        };
    }

    removePlayer(playerId) {
        const session = this.playerSessions.get(playerId);
        if (!session) {
            return { success: false };
        }
        
        const game = this.games.get(session.gameId);
        if (!game) {
            return { success: false };
        }
        
        const playerIndex = game.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            return { success: false };
        }
        
        const player = game.players[playerIndex];
        game.players.splice(playerIndex, 1);
        delete game.hands[playerId];
        delete game.scores[playerId];
        this.rebuildPlayerIndex(game); // Ricostruisci indice dopo rimozione

        this.playerSessions.delete(playerId);
        
        // Se non ci sono più giocatori, elimina la partita e pulisci il timer
        if (game.players.length === 0) {
            this.clearGameTimer(game);
            this.games.delete(game.id);
            return {
                success: true,
                gameId: game.id,
                data: {
                    playerName: player.name
                }
            };
        }
        
        // Se l'host se ne va, assegna nuovo host
        if (game.hostId === playerId && game.players.length > 0) {
            game.hostId = game.players[0].id;
            game.players[0].isHost = true;
        }
        
        return {
            success: true,
            gameId: game.id,
            game: this.sanitizeGameData(game),
            data: {
                playerId: playerId,
                playerName: player.name,
                playersRemaining: game.players.length
            }
        };
    }
}

module.exports = GameManager;