# 🎮 Gioco di Parole - Guida Completa al Testing

## 🚀 Quick Start

### 1. Test Automatici
```bash
# Test rapido delle funzionalità
node quick-test.js
```

**Output atteso:**
```
✅ Test passati: 13
❌ Test falliti: 0
🎉 Tutti i test passati! Il gioco è pronto.
```

### 2. Avvio Server
```bash
# Installa dipendenze (se necessario)
npm install

# Avvia in modalità sviluppo (con auto-restart)
npm run dev

# Oppure in modalità produzione
npm start
```

**Output atteso:**
```
╔════════════════════════════════════════════════════╗
║          🎮 GIOCO DI PAROLE - SERVER ATTIVO 🎮      ║
╠════════════════════════════════════════════════════╣
║  Server in ascolto sulla porta 3000                  ║
╠════════════════════════════════════════════════════╣
║  Collegamenti disponibili:                         ║
║  → http://192.168.1.XXX:3000                       ║
║  → http://localhost:3000 (solo locale)             ║
╚════════════════════════════════════════════════════╝
```

### 3. Test Multiplayer

**Opzione A - Browser multipli:**
1. Chrome: apri `http://localhost:3000`
2. Firefox: apri `http://localhost:3000`
3. Safari: apri `http://localhost:3000`

**Opzione B - Finestre incognito:**
- Chrome: `Ctrl+Shift+N` (Win) o `Cmd+Shift+N` (Mac)
- Firefox: `Ctrl+Shift+P` (Win) o `Cmd+Shift+P` (Mac)
- Apri 2-6 finestre incognito su `http://localhost:3000`

**Opzione C - Test da mobile:**
1. Assicurati che mobile e PC siano sulla stessa rete WiFi
2. Usa l'indirizzo IP mostrato dal server (es: `http://192.168.1.100:3000`)
3. Apri il browser sul mobile

---

## ✅ Checklist Test Essenziali

### Test Base (5 minuti)
- [ ] Server si avvia senza errori
- [ ] Pagina si carica correttamente
- [ ] 2 client riescono a connettersi
- [ ] Creazione partita funziona
- [ ] Join partita funziona
- [ ] Partita si avvia con 2 giocatori

### Test Modalità (10 minuti)
- [ ] **Classic**: 6 carte, nessun timer, funziona
- [ ] **Battle**: 2 giocatori, 8 carte, carte speciali extra
- [ ] **Speed**: Timer 15s visibile, carta auto-giocata alla scadenza
- [ ] **Coop**: Punteggio condiviso, obiettivo 20 punti

### Test Fix Critici (10 minuti)
- [ ] **Reset Battle**: Dopo bluff, ancora 8 carte + deck battle
- [ ] **Rate Limiting**: Spam chat bloccato dopo 5 messaggi
- [ ] **XSS**: Nome `<script>test</script>` → sanitizzato
- [ ] **Timer**: Countdown fluido, non 15 eventi/secondo
- [ ] **ID Sicuri**: IDs lunghi e random (non `game_123`)

### Test Avanzati (15 minuti)
- [ ] Bluff challenge completo
- [ ] Votazione con 3+ giocatori
- [ ] Power-ups in Battle mode
- [ ] Disconnessione giocatore
- [ ] Cleanup dopo 1 ora (lobby vuote)

---

## 🎯 Scenari di Test Dettagliati

### Scenario 1: Battle Mode Completo

**Setup:**
1. Player 1: Crea partita Battle
2. Player 2: Unisciti via Game ID

**Test:**
1. Verifica 8 carte per giocatore
2. Cerca carte speciali: Ruba Carta, Scambia Mano, Blocca, Pesca 3
3. Gioca carta "Ruba Carta" → verifica ruba carta da avversario
4. Gioca carta "Scambia Mano" → verifica scambio mani
5. Chiama bluff
6. Completa votazione
7. **CRITICO**: Verifica ancora 8 carte dopo reset

**Risultato atteso:** ✅ Tutte le feature Battle funzionano, reset corretto

---

### Scenario 2: Speed Mode + Timer

**Setup:**
1. Crea partita Speed
2. 2+ giocatori

**Test:**
1. Avvia partita
2. **Apri DevTools → Network → WS (WebSocket)**
3. Conta eventi ricevuti in 15 secondi
4. Verifica countdown fluido nell'UI
5. **NON giocare** - lascia scadere il timer
6. Verifica carta giocata automaticamente

**Risultato atteso:**
- ✅ ~3 eventi (non 15!)
- ✅ Countdown fluido
- ✅ Auto-play alla scadenza

---

### Scenario 3: Rate Limiting

**Setup:**
1. Apri DevTools → Console
2. Entra in una partita

**Test spam chat:**
```javascript
for(let i=0; i<10; i++) {
  socket.emit('chatMessage', `test${i}`);
}
```

**Risultato atteso:**
- ✅ Primi 5 messaggi inviati
- ✅ Messaggi 6-10 bloccati
- ✅ Errore: "Troppi messaggi! Rallenta."

---

### Scenario 4: XSS Protection

**Test 1 - Nome giocatore:**
1. Nome: `<script>alert("XSS")</script>`
2. **Risultato**: Errore "Nome giocatore non valido"

**Test 2 - Dopo sanitizzazione:**
1. Nome: `Mario<script>`
2. **Risultato**: Accettato come "Marioscript" (caratteri `<>` rimossi)

**Test 3 - Chat:**
1. Messaggio: `Ciao <img src=x onerror=alert(1)>`
2. **Risultato**: Mostrato come "Ciao img src=x onerror=alert(1)"

**Risultato atteso:** ✅ Nessuno script eseguito

---

### Scenario 5: Cleanup Automatico

**Test rapido (modifica temporanea):**

1. Apri `game-logic.js` linea 38
2. Cambia `3600000` → `60000` (1 minuto invece di 1 ora)
3. Riavvia server
4. Crea 3 partite in lobby (NON avviarle)
5. Aspetta 10 minuti
6. Controlla log server

**Risultato atteso:**
```
[CLEANUP] 3 giochi inattivi eliminati
```

**IMPORTANTE:** Ripristina il valore originale dopo il test!

---

## 🐛 Debugging

### Debug Panel
1. Clicca "🔧 Debug" in alto a destra
2. Vedi informazioni real-time:
   - Socket ID
   - Game ID
   - Status
   - Player count
   - Log eventi

### Log Server
Cerca questi messaggi:
```
[GAME] Partita creata        ← Partita creata
[VOTE] Player vota           ← Voto registrato
[RESULT] Voti: X valida...   ← Risultato votazione
[CLEANUP] X giochi...        ← Cleanup eseguito
```

### Problemi Comuni

**Timer non visibile:**
- Verifica modalità Speed selezionata
- Controlla console errori

**Disconnessioni frequenti:**
- Verifica rete stabile
- Aumenta `pingTimeout` in server.js se necessario

**CORS errors:**
- Normale in locale
- In produzione, configura `ALLOWED_ORIGINS`

---

## 📊 Verifica Performance

### Network Traffic
1. DevTools → Network → WS
2. Osserva traffico durante turno
3. **PRIMA dell'ottimizzazione**: ~15 eventi/turno
4. **DOPO ottimizzazione**: ~3 eventi/turno

### Memory Usage
```bash
# Linux/Mac
top -p $(pgrep -f "node server.js")

# Windows (PowerShell)
Get-Process node | Select-Object Name,WorkingSet
```

**Risultato atteso:**
- Memoria stabile (non cresce continuamente)
- Nessun leak dopo disconnessioni

---

## ✨ Test Funzionalità Extra

### Power-Ups (Battle Mode)
1. Verifica 4 tipi disponibili:
   - Double Points (1x)
   - Skip Turn (1x)
   - Reveal Card (1x)
   - Extra Draw (2x)
2. Usa ogni power-up
3. Verifica contatore si aggiorna

### Bluff Challenge
1. Player A gioca carta
2. Player B chiama bluff
3. Player A propone parola
4. Altri giocatori votano
5. Verifica:
   - Maggioranza determina risultato
   - Pareggio = parola accettata
   - Punti assegnati correttamente

### Chat
1. Invia messaggio normale
2. Invia messaggio con `<script>`
3. Invia messaggio lunghissimo (300+ caratteri)
4. Verifica tutti sanitizzati/troncati

---

## 🎯 Acceptance Criteria

Il gioco è pronto quando:

- ✅ Tutti i 13 test automatici passano
- ✅ Multiplayer funziona con 2-6 giocatori
- ✅ Tutte e 4 le modalità sono giocabili
- ✅ Nessun XSS possibile
- ✅ Rate limiting blocca spam
- ✅ Timer ottimizzato (3 eventi invece di 15)
- ✅ Nessun memory leak
- ✅ Cleanup automatico funziona
- ✅ Battle mode mantiene 8 carte dopo reset

---

## 📝 Report Issues

Se trovi problemi:

1. **Raccogli informazioni:**
   - DevTools Console (errori in rosso)
   - Log server
   - Passi per riprodurre

2. **Informazioni ambiente:**
   - Browser e versione
   - Node.js versione (`node --version`)
   - OS

3. **Screenshot/Video:**
   - Aiutano a capire il problema

---

## 🚀 Deploy Produzione

### Variabili Ambiente
```bash
export PORT=3000
export ALLOWED_ORIGINS="https://tuodominio.com,https://www.tuodominio.com"
export NODE_ENV=production
```

### Test Produzione
1. Deploy su server
2. Apri da browser esterno
3. Test completo con amici
4. Monitoraggio errori

---

## 📚 File di Riferimento

- `TEST-GUIDE.md` - Guida dettagliata ai test
- `quick-test.js` - Test automatici
- `CLAUDE.md` - Documentazione per sviluppatori
- `package.json` - Comandi npm disponibili

---

Buon testing! 🎮✨
