// client.js - Logica Client

// ==================== VARIABILI GLOBALI ====================
let socket = null;
let userId = null;
let gameId = null;
let selectedCard = null;
let gameData = null;
let myHand = [];
let selectedMode = 'classic';
let debugEnabled = false;
let myPowerUps = null;

// Timer locale
let localTimerInterval = null;
let timerEndTime = null;

// ==================== DEBUG FUNCTIONS ====================
function toggleDebug() {
    debugEnabled = !debugEnabled;
    const panel = document.getElementById('debug-panel');
    panel.style.display = debugEnabled ? 'block' : 'none';
    
    if (debugEnabled) {
        debugLog('Debug panel attivato');
    }
}

function debugLog(message, type = 'info') {
    if (!debugEnabled) return;
    
    const log = document.getElementById('debug-log');
    const line = document.createElement('div');
    line.className = 'debug-line';
    const time = new Date().toLocaleTimeString();
    line.textContent = `[${time}] ${message}`;
    log.appendChild(line);
    
    // Mantieni solo le ultime 50 righe
    while (log.children.length > 50) {
        log.removeChild(log.firstChild);
    }
    
    log.scrollTop = log.scrollHeight;
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// ==================== SOCKET INITIALIZATION ====================
function initSocket() {
    debugLog('Inizializzazione socket...');
    
    socket = io(window.location.origin, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
    });

    // Connection events
    socket.on('connect', () => {
        debugLog('Connesso al server!');
        document.getElementById('socket-id').textContent = socket.id;
        updateConnectionStatus(true);
    });

    socket.on('disconnect', () => {
        debugLog('Disconnesso dal server');
        updateConnectionStatus(false);
    });

    socket.on('connect_error', (error) => {
        debugLog(`Errore connessione: ${error.message}`, 'error');
    });

    // Game events
    socket.on('connected', (data) => {
        debugLog(`Connesso con ID: ${data.socketId}`);
        userId = data.socketId;
    });

    socket.on('gameCreated', (data) => {
        debugLog(`Partita creata! ID: ${data.gameId}`);
        userId = data.userId;
        gameId = data.gameId;
        document.getElementById('game-id').textContent = gameId;
        closeModal('start-modal');
        showMessage('Partita creata! Attendi altri giocatori...');
    });

    socket.on('gameJoined', (data) => {
        debugLog(`Unito alla partita: ${data.gameId}`);
        userId = data.userId;
        gameId = data.gameId;
        document.getElementById('game-id').textContent = gameId;
        closeModal('start-modal');
        showMessage('Ti sei unito alla partita!');
    });

    socket.on('gameUpdate', (data) => {
        debugLog('Aggiornamento partita ricevuto');
        if (data.game) {
            gameData = data.game;
            updateGameUI(data.game);
        }
        if (data.message) {
            debugLog(data.message);
        }
    });

    socket.on('handUpdate', (data) => {
        debugLog(`Aggiornamento mano: ${data.hand.length} carte`);
        myHand = data.hand;
        updateHandUI(data.hand);
    });

    socket.on('gameStarted', (data) => {
        debugLog('Partita iniziata!');
        if (data.game) {
            gameData = data.game;
            updateGameUI(data.game);
        }
        // Mostra timer box se la modalità è Speed
        if (data.timerActive || gameData?.gameMode === 'speed') {
            document.getElementById('timer-box').style.display = 'block';
        }
        // Mostra power-ups se abilitati
        if (data.powerupsEnabled) {
            document.getElementById('powerups-section').style.display = 'block';
            updatePowerUps();
        }
        showMessage(data.message);
    });
    
    socket.on('powerUpUsed', (data) => {
        debugLog(`Power-up usato: ${data.powerUpType}`);
        showMessage(data.effect);
        if (data.remainingPowerUps) {
            myPowerUps = data.remainingPowerUps;
            updatePowerUps();
        }
        if (data.newCard) {
            myHand.push(data.newCard);
            updateHandUI(myHand);
        }
        if (data.revealedCard) {
            showMessage(`${data.revealedCard.player} ha: ${data.revealedCard.card.value}`);
        }
    });

    socket.on('timerStart', (data) => {
        debugLog(`Timer iniziato: ${data.duration}s`);
        startLocalTimer(data.duration, data.startTime, data.playerId);
    });

    socket.on('timerSync', (data) => {
        // Sincronizzazione opzionale dal server per prevenire drift
        syncLocalTimer(data.timeLeft, data.playerId);
    });

    socket.on('timerExpired', (data) => {
        debugLog(`Timer scaduto per ${data.player}`);
        stopLocalTimer();
        showMessage(data.message);
    });

    socket.on('bluffChallenge', (data) => {
        debugLog('Sfida bluff iniziata');
        handleBluffChallenge(data);
    });
    
    socket.on('bluffVote', (data) => {
        debugLog('Votazione bluff iniziata');
        handleBluffVote(data);
    });
    
    socket.on('waitingForVotes', (data) => {
        debugLog('In attesa dei voti degli altri giocatori');
        closeModal('bluff-modal');
        showMessage(data.message);
    });

    socket.on('bluffResult', (data) => {
        debugLog(`Risultato bluff: ${data.result}`);
        closeModal('bluff-modal');
        
        let resultMessage = `${data.winner} ha vinto il round! `;
        if (data.votes) {
            resultMessage += `(Voti: ${data.votes.valid} valida, ${data.votes.invalid} non valida)`;
        }
        showMessage(resultMessage);
    });

    socket.on('chatMessage', (data) => {
        addChatMessage(data.player, data.message);
    });

    socket.on('error', (data) => {
        debugLog(`Errore: ${data.message}`, 'error');
        showMessage(data.message);
    });

    socket.on('powerUpsUpdate', (data) => {
        debugLog('Power-ups ricevuti');
        myPowerUps = data.powerUps;
        updatePowerUps();
    });
    
    socket.on('powerUpEffect', (data) => {
        debugLog(`Effetto power-up: ${data.effect}`);
        // Mostra notifica dell'effetto
        if (data.player !== userId) {
            showMessage(data.effect);
        }
    });
}

// ==================== UI UPDATE FUNCTIONS ====================
function updateConnectionStatus(connected) {
    const status = document.getElementById('connection-status');
    const text = document.getElementById('connection-text');
    
    if (connected) {
        status.className = 'connection-status status-connected';
        text.textContent = '🟢 Connesso';
    } else {
        status.className = 'connection-status status-disconnected';
        text.textContent = '🔴 Disconnesso';
    }
}

function updateGameUI(game) {
    if (!game) return;

    document.getElementById('game-status').textContent = game.status;
    document.getElementById('deck-count').textContent = game.deckCount || 0;
    document.getElementById('game-mode').textContent = 
        game.gameMode ? game.gameMode.charAt(0).toUpperCase() + game.gameMode.slice(1) : 'Classica';

    // Update players
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';
    
    if (game.players && game.players.length > 0) {
        document.getElementById('player-count').textContent = game.players.length;
        
        // Modalità cooperativa - mostra punteggio del team
        if (game.gameMode === 'coop' && game.teamScore !== undefined) {
            const teamCard = document.createElement('div');
            teamCard.className = 'player-card';
            teamCard.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
            teamCard.innerHTML = `
                <span>🤝 Team Score</span>
                <span class="player-score">${game.teamScore || 0} / ${game.targetScore || 20}</span>
            `;
            playersList.appendChild(teamCard);
        }
        
        game.players.forEach((player, index) => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
            if (index === game.currentTurn) {
                playerCard.classList.add('current-turn');
            }
            
            // In modalità cooperativa non mostra punteggi individuali
            if (game.gameMode === 'coop') {
                playerCard.innerHTML = `
                    <span>${player.isHost ? '👑' : '👤'} ${player.name}</span>
                `;
            } else {
                playerCard.innerHTML = `
                    <span>${player.isHost ? '👑' : '👤'} ${player.name}</span>
                    <span class="player-score">${game.scores[player.id] || 0}</span>
                `;
            }
            
            playersList.appendChild(playerCard);
        });

        // Update current turn
        if (game.players[game.currentTurn]) {
            document.getElementById('current-turn').textContent = 
                game.players[game.currentTurn].name;
        }
    }

    // Update table cards
    const tableCards = document.getElementById('table-cards');
    tableCards.innerHTML = '';
    
    if (game.tableCards && game.tableCards.length > 0) {
        game.tableCards.forEach(card => {
            const cardEl = createCardElement(card);
            // Evidenzia le carte rilevanti per il bluff (lettere e jolly)
            if (card.type === 'letter' || (card.type === 'special' && card.value === 'Joker')) {
                cardEl.style.border = '2px solid rgba(255, 193, 7, 0.5)';
            }
            tableCards.appendChild(cardEl);
        });
    } else {
        tableCards.innerHTML = '<span class="empty-message">Nessuna carta sul tavolo</span>';
    }

    // Update buttons
    updateButtons(game);
}

function updateHandUI(hand) {
    const handContainer = document.getElementById('player-hand');
    handContainer.innerHTML = '';
    
    if (hand && hand.length > 0) {
        hand.forEach((card, index) => {
            const cardEl = createCardElement(card);
            cardEl.onclick = () => selectCard(index);
            handContainer.appendChild(cardEl);
        });
    } else {
        handContainer.innerHTML = '<span class="empty-message">Nessuna carta in mano</span>';
    }
}

function createCardElement(card) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    
    if (card.type === 'special') {
        cardEl.classList.add('special');
        if (card.value === 'Joker') {
            cardEl.classList.add('joker');
            cardEl.textContent = '🃏';
        } else if (card.value === 'Cambio Turno') {
            cardEl.textContent = '↔️';
        } else if (card.value === 'Ruba Carta') {
            cardEl.textContent = '🎯';
        } else if (card.value === 'Scambia Mano') {
            cardEl.textContent = '🔄';
        } else if (card.value === 'Blocca') {
            cardEl.textContent = '🚫';
        } else if (card.value === 'Pesca 3') {
            cardEl.textContent = '+3';
            cardEl.style.fontSize = '2rem';
        } else {
            cardEl.textContent = card.value;
        }
    } else {
        cardEl.textContent = card.value;
    }
    
    return cardEl;
}

function updateButtons(game) {
    const startBtn = document.getElementById('start-btn');
    const playBtn = document.getElementById('play-btn');
    const bluffBtn = document.getElementById('bluff-btn');

    // Start button - only for host in lobby
    if (game.status === 'lobby' && game.hostId === userId) {
        startBtn.style.display = 'inline-block';
        startBtn.disabled = game.players.length < 2;
    } else {
        startBtn.style.display = 'none';
    }

    // Play button - only on your turn
    if (game.status === 'inProgress' && 
        game.players[game.currentTurn] && 
        game.players[game.currentTurn].id === userId) {
        playBtn.disabled = false;
    } else {
        playBtn.disabled = true;
    }

    // Bluff button - solo se ci sono lettere/jolly sul tavolo
    if (game.status === 'inProgress' && 
        game.lastPlayerPlayedId && 
        game.lastPlayerPlayedId !== userId) {
        
        // Controlla se ci sono lettere o jolly sul tavolo
        const hasBluffableCards = game.tableCards && game.tableCards.some(card => 
            card.type === 'letter' || 
            (card.type === 'special' && card.value === 'Joker')
        );
        
        bluffBtn.disabled = !hasBluffableCards;
        
        if (!hasBluffableCards && game.tableCards && game.tableCards.length > 0) {
            bluffBtn.title = 'Non ci sono lettere sul tavolo per chiamare bluff';
        } else {
            bluffBtn.title = '';
        }
    } else {
        bluffBtn.disabled = true;
    }
}

// ==================== GAME MODE SELECTION ====================
function selectMode(element) {
    // Rimuovi selezione precedente
    document.querySelectorAll('.mode-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Aggiungi selezione
    element.classList.add('selected');
    selectedMode = element.dataset.mode;
    debugLog(`Modalità selezionata: ${selectedMode}`);
}

// ==================== GAME ACTIONS ====================
function createGame() {
    const name = document.getElementById('player-name').value.trim() || 'Giocatore';
    const powerupsEnabled = document.getElementById('powerups-setting').checked;
    
    debugLog(`Creazione partita: ${name}, Modalità: ${selectedMode}`);
    
    socket.emit('createGame', {
        playerName: name,
        gameMode: selectedMode,
        settings: {
            powerups: powerupsEnabled
        }
    });
}

function joinGame() {
    const name = document.getElementById('player-name').value.trim() || 'Giocatore';
    debugLog(`Unione a partita come ${name}`);
    socket.emit('joinGame', { playerName: name });
}

function startGame() {
    debugLog('Avvio partita...');
    socket.emit('startGame');
}

function selectCard(index) {
    const cards = document.querySelectorAll('#player-hand .card');
    
    if (selectedCard === index) {
        cards[index].classList.remove('selected');
        selectedCard = null;
        debugLog(`Carta ${index} deselezionata`);
    } else {
        cards.forEach(c => c.classList.remove('selected'));
        cards[index].classList.add('selected');
        selectedCard = index;
        debugLog(`Carta ${index} selezionata: ${myHand[index].value}`);
    }
}

function playSelectedCard() {
    if (selectedCard === null) {
        showMessage('Seleziona una carta da giocare!');
        return;
    }
    
    debugLog(`Giocando carta ${selectedCard}`);
    socket.emit('playCard', selectedCard);
    selectedCard = null;
}

function callBluff() {
    debugLog('Chiamando bluff...');
    socket.emit('callBluff');
}

function handleBluffChallenge(data) {
    const modal = document.getElementById('bluff-modal');
    const message = document.getElementById('bluff-message');
    const letters = document.getElementById('bluff-letters');
    const wordInput = document.getElementById('bluff-word');
    const submitBtn = document.getElementById('submit-word-btn');
    const admitBtn = document.getElementById('admit-bluff-btn');
    const closeBtn = document.querySelector('#bluff-modal .btn-warning'); // Bottone chiudi

    // Salva le lettere del tavolo per la validazione (inclusi jolly)
    window.tableLetters = data.tableLetters;
    
    // Conta i jolly
    window.jokerCount = data.tableLetters.filter(l => l === 'Joker').length;
    window.normalLetters = data.tableLetters.filter(l => l !== 'Joker');
    
    letters.textContent = `Lettere sul tavolo: ${data.tableLetters.map(l => l === 'Joker' ? '🃏' : l).join(' ')}`;

    if (data.defenderId === userId) {
        // Sei il difensore - NON puoi chiudere il modal
        message.textContent = 'Sei stato sfidato! Proponi una parola che contenga TUTTE le lettere o ammetti il bluff.';
        wordInput.style.display = 'block';
        submitBtn.style.display = 'inline-block';
        admitBtn.style.display = 'inline-block';
        
        // NASCONDI il bottone chiudi per il difensore
        if (closeBtn) {
            closeBtn.style.display = 'none';
        }
        
        // Disabilita ESC per il difensore
        document.onkeydown = function(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                return false;
            }
        };
        
        // Reset input e validazione
        wordInput.value = '';
        submitBtn.disabled = true;
        
        // Aggiungi validazione in tempo reale
        wordInput.oninput = validateWordInput;
    } else {
        // Sei uno spettatore
        message.textContent = `${data.defenderName} sta proponendo una parola...`;
        wordInput.style.display = 'none';
        submitBtn.style.display = 'none';
        admitBtn.style.display = 'none';
        
        // Mostra il bottone chiudi per gli spettatori
        if (closeBtn) {
            closeBtn.style.display = 'inline-block';
        }
    }

    showModal('bluff-modal');
}

function validateWordInput() {
    const wordInput = document.getElementById('bluff-word');
    const word = wordInput.value.trim().toUpperCase();
    const submitBtn = document.getElementById('submit-word-btn');
    const message = document.getElementById('bluff-validation-message');
    
    if (!window.tableLetters || !word) {
        submitBtn.disabled = true;
        if (message) message.textContent = '';
        return;
    }
    
    // Calcola lunghezza minima richiesta (lettere normali + jolly)
    const minLength = window.normalLetters.length + window.jokerCount;
    
    // Controlla la lunghezza
    if (word.length < minLength) {
        submitBtn.disabled = true;
        if (message) {
            message.textContent = `❌ La parola deve avere almeno ${minLength} lettere (${window.normalLetters.length} lettere + ${window.jokerCount} jolly)`;
            message.style.color = '#FF5252';
        }
        return;
    }
    
    // Controlla se la parola contiene tutte le lettere normali
    const wordLetters = word.split('');
    const normalLettersCopy = [...window.normalLetters];
    let allLettersPresent = true;
    
    for (let letter of normalLettersCopy) {
        const index = wordLetters.indexOf(letter.toUpperCase());
        if (index === -1) {
            allLettersPresent = false;
            break;
        }
        wordLetters.splice(index, 1);
    }
    
    if (allLettersPresent) {
        submitBtn.disabled = false;
        if (message) {
            message.textContent = '✅ La parola è valida e può essere proposta!';
            message.style.color = '#4CAF50';
        }
    } else {
        submitBtn.disabled = true;
        if (message) {
            const missingLetters = normalLettersCopy.filter(l => 
                !word.includes(l.toUpperCase())
            );
            message.textContent = `❌ Mancano le lettere: ${missingLetters.join(', ')}`;
            message.style.color = '#FF5252';
        }
    }
}

function submitWord() {
    const word = document.getElementById('bluff-word').value.trim();
    if (!word) {
        showMessage('Inserisci una parola!');
        return;
    }
    
    // Rivalidazione finale
    const wordUpper = word.toUpperCase();
    const minLength = window.normalLetters.length + window.jokerCount;
    
    // Verifica lunghezza minima
    if (wordUpper.length < minLength) {
        showMessage(`La parola deve avere almeno ${minLength} lettere!`);
        return;
    }
    
    // Verifica che contenga tutte le lettere normali
    const wordLetters = wordUpper.split('');
    for (let letter of window.normalLetters) {
        const index = wordLetters.indexOf(letter.toUpperCase());
        if (index === -1) {
            showMessage('La parola deve contenere TUTTE le lettere del tavolo!');
            return;
        }
        wordLetters.splice(index, 1);
    }
    
    debugLog(`Inviando parola valida: ${word} (lunghezza: ${wordUpper.length}, minima: ${minLength})`);
    socket.emit('submitBluffWord', word);
    document.getElementById('bluff-word').value = '';
}

function handleBluffVote(data) {
    const modal = document.getElementById('bluff-modal');
    const message = document.getElementById('bluff-message');
    const letters = document.getElementById('bluff-letters');
    const wordInput = document.getElementById('bluff-word');
    const submitBtn = document.getElementById('submit-word-btn');
    const admitBtn = document.getElementById('admit-bluff-btn');
    const closeBtn = document.querySelector('#bluff-modal .btn-warning');
    
    // Nascondi elementi precedenti
    wordInput.style.display = 'none';
    submitBtn.style.display = 'none';
    admitBtn.style.display = 'none';
    
    // Mostra votazione
    letters.textContent = `Parola proposta: ${data.word}`;
    
    // Controlla se sei chi ha proposto la parola
    if (data.proposerId === userId) {
        message.textContent = 'Hai proposto questa parola. Attendi il voto degli altri giocatori...';
        
        // Chi ha proposto NON vede i bottoni di voto
        const buttonsContainer = document.getElementById('bluff-modal-buttons');
        buttonsContainer.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div class="loading-spinner"></div>
                <p style="margin-top: 10px;">In attesa dei voti...</p>
            </div>
        `;
        
        // Può chiudere il modal mentre aspetta
        if (closeBtn) {
            closeBtn.style.display = 'inline-block';
        }
    } else {
        message.textContent = 'Vota se questa parola è valida in italiano:';
        
        // Solo gli altri votano
        const buttonsContainer = document.getElementById('bluff-modal-buttons');
        buttonsContainer.innerHTML = `
            <button class="btn" onclick="voteWord(true)">✅ Valida</button>
            <button class="btn btn-secondary" onclick="voteWord(false)">❌ Non Valida</button>
        `;
        
        // I votanti possono chiudere dopo aver votato
        if (closeBtn) {
            closeBtn.style.display = 'none'; // Nascosto finché non votano
        }
    }
    
    showModal('bluff-modal');
}

function voteWord(isValid) {
    socket.emit('voteBluffWord', isValid);
    closeModal('bluff-modal');
    showMessage('Voto inviato! Attendi il risultato...');
}

function admitBluff() {
    debugLog('Ammettendo bluff...');
    
    // Riabilita ESC dopo aver ammesso
    document.onkeydown = null;
    
    socket.emit('admitBluff');
    closeModal('bluff-modal');
}

function admitBluff() {
    debugLog('Ammettendo bluff...');
    socket.emit('admitBluff');
    closeModal('bluff-modal');
}

function sendChat() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;
    
    socket.emit('chatMessage', message);
    input.value = '';
}

function addChatMessage(author, message) {
    const container = document.getElementById('chat-messages');
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
    messageEl.innerHTML = `<span class="chat-author">${author}:</span> ${message}`;
    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
}

function requestState() {
    debugLog('Richiedendo stato aggiornato...');
    socket.emit('requestState');
}

// ==================== TIMER FUNCTIONS ====================
function startLocalTimer(duration, startTime, playerId) {
    // Ferma timer esistente
    stopLocalTimer();

    // Calcola quando il timer scade
    timerEndTime = startTime + (duration * 1000);

    const timerBox = document.getElementById('timer-box');
    timerBox.style.display = 'block';

    // Imposta effetto visivo se è il mio turno
    if (playerId === userId) {
        timerBox.classList.add('my-turn-timer');
    } else {
        timerBox.classList.remove('my-turn-timer');
    }

    // Aggiorna immediatamente
    updateTimerDisplay(playerId);

    // Avvia countdown locale (aggiornamento ogni 100ms per fluidità)
    localTimerInterval = setInterval(() => {
        updateTimerDisplay(playerId);
    }, 100);

    debugLog(`Timer locale avviato: ${duration}s`);
}

function stopLocalTimer() {
    if (localTimerInterval) {
        clearInterval(localTimerInterval);
        localTimerInterval = null;
    }
    timerEndTime = null;

    const timerBox = document.getElementById('timer-box');
    timerBox.classList.remove('my-turn-timer');
}

function syncLocalTimer(timeLeft, playerId) {
    // Sincronizza il timer locale con il server (se c'è drift)
    if (timerEndTime) {
        const currentTime = Date.now();
        const serverEndTime = currentTime + (timeLeft * 1000);

        // Se c'è una differenza > 1 secondo, sincronizza
        if (Math.abs(serverEndTime - timerEndTime) > 1000) {
            debugLog(`Timer sincronizzato: differenza di ${Math.abs(serverEndTime - timerEndTime)}ms`);
            timerEndTime = serverEndTime;
        }
    }
}

function updateTimerDisplay(playerId) {
    const timerDisplay = document.getElementById('timer-display');

    if (!timerEndTime) {
        timerDisplay.textContent = '-';
        return;
    }

    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((timerEndTime - now) / 1000));

    timerDisplay.textContent = remaining + 's';

    // Cambia colore in base al tempo rimanente
    if (remaining <= 5) {
        timerDisplay.className = 'timer-display timer-danger';
    } else if (remaining <= 10) {
        timerDisplay.className = 'timer-display timer-warning';
    } else {
        timerDisplay.className = 'timer-display';
    }

    // Se il tempo è scaduto localmente, ferma il timer
    if (remaining <= 0) {
        stopLocalTimer();
    }
}

// ==================== POWER-UP FUNCTIONS ====================
function usePowerUp(type) {
    if (!myPowerUps || !myPowerUps[type] || myPowerUps[type] <= 0) {
        showMessage('Power-up non disponibile!');
        return;
    }
    
    debugLog(`Usando power-up: ${type}`);
    socket.emit('usePowerUp', type);
}

function updatePowerUps() {
    if (!myPowerUps) return;
    
    const powerUpTypes = ['doublePoints', 'skipTurn', 'revealCard', 'extraDraw'];
    
    powerUpTypes.forEach(type => {
        const countEl = document.getElementById(`${type}-count`);
        const btnEl = document.querySelector(`[data-powerup="${type}"]`);
        
        if (countEl && btnEl) {
            const count = myPowerUps[type] || 0;
            countEl.textContent = count;
            btnEl.disabled = count <= 0;
        }
    });
}

// ==================== MODAL FUNCTIONS ====================
function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
    
    // Se è il modal del bluff, disabilita ESC
    if (modalId === 'bluff-modal') {
        document.onkeydown = function(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                return false;
            }
        };
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
    
    // Riabilita ESC quando chiudi il modal del bluff
    if (modalId === 'bluff-modal') {
        document.onkeydown = null;
    }
}

function showMessage(text) {
    document.getElementById('message-text').textContent = text;
    showModal('message-modal');
    
    // Auto-chiudi dopo 3 secondi
    setTimeout(() => {
        closeModal('message-modal');
    }, 3000);
}

// ==================== INITIALIZATION ====================
window.addEventListener('load', () => {
    console.log('Gioco di Parole - Inizializzazione...');
    initSocket();
    
    // Imposta nome casuale di default
    const randomNames = ['Mario', 'Luigi', 'Peach', 'Yoshi', 'Toad', 'Bowser'];
    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    document.getElementById('player-name').value = randomName;
    
    // Aggiungi supporto touch per dispositivi mobili
    if ('ontouchstart' in window) {
        initTouchSupport();
    }
});

// ==================== TOUCH SUPPORT ====================
function initTouchSupport() {
    // Mostra hint per mobile
    const mobileHint = document.querySelector('.mobile-hint');
    if (mobileHint) {
        mobileHint.style.display = 'block';
    }
    
    // Previeni scroll accidentale durante il gioco
    document.addEventListener('touchmove', function(e) {
        if (e.target.closest('.player-hand') || e.target.closest('.table-cards')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Migliora la responsività dei tap
    let touchTimeout;
    document.addEventListener('touchstart', function(e) {
        if (e.target.classList.contains('card')) {
            e.target.classList.add('touched');
            clearTimeout(touchTimeout);
        }
    });
    
    document.addEventListener('touchend', function(e) {
        if (e.target.classList.contains('card')) {
            touchTimeout = setTimeout(() => {
                e.target.classList.remove('touched');
            }, 300);
        }
    });
    
    // Gestisci swipe per giocare carte
    let touchStartY = 0;
    let touchCard = null;
    
    document.addEventListener('touchstart', function(e) {
        if (e.target.classList.contains('card') && e.target.closest('.player-hand')) {
            touchStartY = e.touches[0].clientY;
            touchCard = e.target;
        }
    });
    
    document.addEventListener('touchend', function(e) {
        if (touchCard && e.changedTouches[0]) {
            const touchEndY = e.changedTouches[0].clientY;
            const swipeDistance = touchStartY - touchEndY;
            
            // Se swipe verso l'alto di almeno 50px, gioca la carta
            if (swipeDistance > 50 && touchCard.parentElement === document.getElementById('player-hand')) {
                const cards = Array.from(document.getElementById('player-hand').children);
                const index = cards.indexOf(touchCard);
                if (index !== -1 && selectedCard === index) {
                    playSelectedCard();
                }
            }
            touchCard = null;
        }
    });
    
    debugLog('Supporto touch attivato');
}