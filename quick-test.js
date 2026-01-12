// quick-test.js - Test Rapido delle Funzionalità
const GameManager = require('./game-logic');

console.log('🧪 AVVIO TEST RAPIDI\n');

// Mock io
const mockIo = {
    to: () => ({
        emit: (event, data) => {
            // Silenzioso per i test
        }
    })
};

const gameManager = new GameManager(mockIo);
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        testsPassed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Errore: ${error.message}`);
        testsFailed++;
    }
}

// Test 1: Validazione Input
test('Validazione nome giocatore', () => {
    const valid = gameManager.validatePlayerName('Mario');
    const invalid1 = gameManager.validatePlayerName('M');
    const tooLong = gameManager.validatePlayerName('a'.repeat(100));

    if (!valid) throw new Error('Nome valido rifiutato');
    if (invalid1) throw new Error('Nome troppo corto accettato');
    if (tooLong) throw new Error('Nome troppo lungo accettato');

    // Test XSS: verifica che i caratteri pericolosi vengano rimossi
    const xssName = '<script>alert()</script>';
    const sanitized = gameManager.sanitizeString(xssName);
    if (sanitized.includes('<') || sanitized.includes('>')) {
        throw new Error('XSS non sanitizzato');
    }
});

// Test 2: Sanitizzazione
test('Sanitizzazione XSS', () => {
    const sanitized = gameManager.sanitizeString('<script>alert("XSS")</script>');
    if (sanitized.includes('<') || sanitized.includes('>')) {
        throw new Error('Caratteri pericolosi non rimossi');
    }
});

// Test 3: Generazione ID sicura
test('Generazione ID sicura', () => {
    const id1 = gameManager.generateGameId();
    const id2 = gameManager.generateGameId();

    if (!id1.startsWith('game_')) throw new Error('ID malformato');
    if (id1.length < 20) throw new Error('ID troppo corto');
    if (id1 === id2) throw new Error('IDs non univoci');
});

// Test 4: Validazione modalità gioco
test('Validazione modalità gioco', () => {
    const valid1 = gameManager.validateGameMode('classic');
    const valid2 = gameManager.validateGameMode('battle');
    const invalid = gameManager.validateGameMode('hacker');

    if (!valid1 || !valid2) throw new Error('Modalità valida rifiutata');
    if (invalid) throw new Error('Modalità invalida accettata');
});

// Test 5: Creazione gioco
test('Creazione gioco con validazione', () => {
    const result = gameManager.createGame('player1', {
        playerName: 'TestPlayer',
        gameMode: 'classic'
    });

    if (!result.success) throw new Error('Creazione fallita');
    if (!result.gameId) throw new Error('GameID mancante');
});

// Test 6: Creazione gioco con input invalido
test('Rifiuto input invalido', () => {
    const result = gameManager.createGame('player2', {
        playerName: 'X', // Troppo corto
        gameMode: 'classic'
    });

    if (result.success) throw new Error('Input invalido accettato');
});

// Test 7: Rate limiting
test('Rate limiting funzionante', () => {
    const playerId = 'test_player';

    // Prova 10 azioni (limite è 5)
    let blocked = false;
    for (let i = 0; i < 10; i++) {
        const allowed = gameManager.checkRateLimit(playerId, 'testAction', 5, 10000);
        if (!allowed) {
            blocked = true;
            break;
        }
    }

    if (!blocked) throw new Error('Rate limit non applicato');
});

// Test 8: Deck creazione
test('Creazione deck corretto', () => {
    const normalDeck = gameManager.createDeck();
    const battleDeck = gameManager.createBattleDeck();

    if (normalDeck.length < 100) throw new Error('Deck normale troppo piccolo');
    if (battleDeck.length <= normalDeck.length) throw new Error('Battle deck non ha carte extra');
});

// Test 9: Helper prepareDeck
test('Helper prepareDeck', () => {
    const classicDeck = gameManager.prepareDeck('classic');
    const battleDeck = gameManager.prepareDeck('battle');

    if (battleDeck.length <= classicDeck.length) {
        throw new Error('prepareDeck non distingue le modalità');
    }
});

// Test 10: Player index map
test('Player index map', () => {
    const game = {
        players: [
            { id: 'p1', name: 'Player1' },
            { id: 'p2', name: 'Player2' },
            { id: 'p3', name: 'Player3' }
        ]
    };

    gameManager.rebuildPlayerIndex(game);

    const index = gameManager.getPlayerIndex(game, 'p2');
    const player = gameManager.getPlayer(game, 'p2');

    if (index !== 1) throw new Error('Index non corretto');
    if (player.name !== 'Player2') throw new Error('Player non trovato');
});

// Test 11: Cleanup timer
test('Cleanup timer', () => {
    const game = {
        turnTimer: {
            timeout: setTimeout(() => {}, 1000),
            syncInterval: setInterval(() => {}, 1000)
        }
    };

    gameManager.clearGameTimer(game);

    if (game.turnTimer !== null) throw new Error('Timer non pulito');
});

// Test 12: Sanitizzazione chat
test('Sanitizzazione messaggio chat', () => {
    const longMessage = 'a'.repeat(300);
    const sanitized = gameManager.sanitizeChatMessage(longMessage);

    if (sanitized.length > 200) throw new Error('Messaggio non troncato');
});

// Test 13: Validazione messaggio chat
test('Validazione messaggio chat', () => {
    const valid = gameManager.validateChatMessage('Ciao!');
    const tooLong = gameManager.validateChatMessage('a'.repeat(300));
    const empty = gameManager.validateChatMessage('');

    if (!valid) throw new Error('Messaggio valido rifiutato');
    if (tooLong) throw new Error('Messaggio troppo lungo accettato');
    if (empty) throw new Error('Messaggio vuoto accettato');
});

// Cleanup
gameManager.games.clear();
gameManager.playerSessions.clear();
gameManager.rateLimits.clear();

// Report finale
console.log('\n' + '='.repeat(50));
console.log(`✅ Test passati: ${testsPassed}`);
console.log(`❌ Test falliti: ${testsFailed}`);
console.log('='.repeat(50));

if (testsFailed > 0) {
    console.log('\n⚠️  Alcuni test sono falliti. Verifica il codice.');
    process.exit(1);
} else {
    console.log('\n🎉 Tutti i test passati! Il gioco è pronto.');
    process.exit(0);
}
