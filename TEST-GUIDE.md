# Guida ai Test - Gioco di Parole Multiplayer

## 🚀 Avvio Rapido

### 1. Installazione e Avvio
```bash
# Nella directory del progetto
npm install
npm run dev
```

Il server si avvierà sulla porta 3000 e mostrerà tutti gli indirizzi di rete disponibili.

### 2. Apertura Client Multipli

Per testare il multiplayer, apri più finestre del browser:

**Opzione A - Browser diversi:**
- Chrome: `http://localhost:3000`
- Firefox: `http://localhost:3000`
- Safari: `http://localhost:3000`

**Opzione B - Finestre in incognito:**
- Chrome: Ctrl+Shift+N (Windows) o Cmd+Shift+N (Mac)
- Firefox: Ctrl+Shift+P (Windows) o Cmd+Shift+P (Mac)

**Opzione C - Da mobile (stesso WiFi):**
- Usa l'indirizzo di rete mostrato dal server (es: `http://192.168.1.100:3000`)

---

## ✅ Test dei Fix Implementati

### Test 1: Bug resetRound() - Modalità Battle

**Come testare:**
1. Crea partita con modalità "Battle"
2. Aspetta un altro giocatore
3. Avvia partita
4. **Verifica**: Ogni giocatore ha 8 carte (non 6)
5. **Verifica**: Ci sono carte speciali extra (Ruba Carta, Scambia Mano, Blocca, Pesca 3)
6. Gioca alcune carte
7. Chiama bluff e completa il round
8. **Verifica**: Dopo il reset, hai ancora 8 carte
9. **Verifica**: Le carte speciali sono ancora presenti

**Risultato atteso:** ✅ 8 carte per giocatore in modalità battle, anche dopo reset

---

### Test 2: Race Condition nel Voto

**Come testare:**
1. Crea partita con 3+ giocatori
2. Gioca alcune carte
3. Player 1 chiama bluff
4. Player 2 propone una parola
5. **Azione critica**: Player 3 e 4 votano SIMULTANEAMENTE (clicca entrambi nello stesso momento)
6. Controlla i punteggi nel debug panel

**Risultato atteso:** ✅ I punti sono assegnati UNA SOLA VOLTA (non duplicati)

---

### Test 3: Memory Leak nei Timer

**Come testare:**
1. Avvia il server e nota l'uso di memoria iniziale
2. Crea una partita Speed (con timer)
3. Avvia partita
4. Apri DevTools → Console del browser
5. **Disconnetti** un giocatore (chiudi la tab)
6. Controlla i log del server: deve mostrare `[CLEANUP]`
7. Crea e abbandona 5-10 partite in lobby
8. Aspetta 10 minuti
9. Controlla log: `[CLEANUP] X giochi inattivi eliminati`

**Risultato atteso:** ✅ Timer puliti correttamente, memoria non cresce indefinitamente

---

### Test 4: Validazione Input (XSS)

**Come testare:**
1. Apri DevTools → Console
2. Prova a creare partita con nome: `<script>alert("XSS")</script>`
3. **Verifica**: Errore "Nome giocatore non valido"
4. Prova nome valido: `Giovanni`
5. Entra in partita
6. Invia messaggio chat: `<script>alert("XSS")</script>`
7. **Verifica**: I caratteri `<>` sono rimossi
8. Prova messaggio lungo (300+ caratteri)
9. **Verifica**: Troncato a 200 caratteri

**Risultato atteso:** ✅ Nessun script eseguito, input sanitizzati

---

### Test 5: Sicurezza CORS

**Come testare:**
1. Apri DevTools → Console in un browser
2. Esegui:
```javascript
fetch('http://localhost:3000')
  .then(r => r.text())
  .then(console.log)
```
3. **Verifica**: Connessione OK (stesso dominio)
4. Da un sito esterno (es: https://example.com), apri console e prova:
```javascript
io('http://localhost:3000')
```
5. **Verifica**: In produzione dovrebbe bloccare (in dev permette localhost)

**Risultato atteso:** ✅ CORS configurato correttamente

---

### Test 6: Generazione ID Sicura

**Come testare:**
1. Crea 5 partite diverse
2. Controlla gli ID nel debug panel
3. **Verifica**: IDs lunghi e random (es: `game_a3f8c2d5e9b1f4a7`)
4. **Verifica**: Tutti diversi tra loro
5. **Verifica**: Non predicibili (non sequenziali)

**Risultato atteso:** ✅ IDs crittograficamente sicuri

---

### Test 7: Cleanup Automatico Giochi

**Come testare:**
1. Crea 3 partite in lobby e NON avviarle
2. Lascia il server in esecuzione
3. Dopo 1 ora, controlla log server
4. **Verifica**: Log mostra `[CLEANUP] 3 giochi inattivi eliminati`

**Test rapido (modifica temporanea):**
1. In `game-logic.js` linea 38, cambia `3600000` in `10000` (10 secondi)
2. Crea partite in lobby
3. Aspetta 10 minuti
4. Verifica cleanup nei log

**Risultato atteso:** ✅ Giochi vecchi eliminati automaticamente

---

### Test 8: Ottimizzazione Timer

**Come testare:**
1. Apri DevTools → Network tab
2. Filtra per "WebSocket" o "WS"
3. Crea partita Speed (con timer)
4. Avvia partita
5. **Conta** quanti eventi ricevi durante 15 secondi
6. **Verifica**: Ricevi ~3 eventi (start + 2-3 sync + expired)
7. **NON** 15 eventi come prima!

**Visual test:**
1. Guarda il timer nell'interfaccia
2. **Verifica**: Scorre fluido (aggiornamento rapido)
3. **Verifica**: Cambia colore a 10s (giallo) e 5s (rosso)

**Risultato atteso:** ✅ ~87% meno traffico, animazione fluida

---

### Test 9: Rate Limiting

**Come testare:**
1. Apri DevTools → Console
2. Durante il tuo turno, esegui:
```javascript
// Spam playCard
for(let i=0; i<10; i++) {
  socket.emit('playCard', 0);
}
```
3. **Verifica**: Dopo 5 richieste, ricevi errore "Troppe azioni! Rallenta."

4. Test chat spam:
```javascript
// Spam chat
for(let i=0; i<10; i++) {
  socket.emit('chatMessage', 'test');
}
```
5. **Verifica**: Dopo 5 messaggi, errore "Troppi messaggi! Rallenta."

**Risultato atteso:** ✅ Rate limiting attivo, spam bloccato

---

### Test 10: Ottimizzazione Ricerche Giocatori

**Come testare:**
1. Crea partita con 6 giocatori
2. Apri DevTools → Performance
3. Avvia registrazione
4. Gioca 10 turni
5. Ferma registrazione
6. **Verifica**: Nessuna funzione `find()` o `findIndex()` nei flame charts
7. **Verifica**: Performance fluida anche con molti giocatori

**Risultato atteso:** ✅ Ricerche O(1) invece di O(n)

---

### Test 11: Refactoring Codice Duplicato

**Come testare:**
1. Modalità Battle: verifica 8 carte + deck speciale
2. Reset round in Battle: verifica ancora 8 carte + deck speciale
3. Modalità Classic: verifica 6 carte + deck normale
4. Reset round in Classic: verifica ancora 6 carte + deck normale

**Risultato atteso:** ✅ Comportamento coerente, nessun bug dopo reset

---

## 🎮 Test delle Modalità di Gioco

### Classic Mode
- 2-6 giocatori
- 6 carte per giocatore
- Carte speciali base (Joker, Cambio Turno)
- Vincitore: più punti alla fine

### Battle Mode
- Esattamente 2 giocatori
- 8 carte per giocatore
- Carte speciali extra (Ruba Carta, Scambia Mano, Blocca, Pesca 3)
- Power-ups abilitati di default
- Più competitivo

### Speed Mode
- 2-6 giocatori
- Timer 15 secondi per turno
- Se scade: carta giocata automaticamente
- Test timer: verifica countdown e scadenza

### Cooperative Mode
- 2+ giocatori
- Punteggio di squadra condiviso
- Obiettivo: raggiungere 20 punti insieme
- Test: tutti collaborano per vincere

---

## 🐛 Debug e Troubleshooting

### Attivare Debug Panel
1. Clicca bottone "🔧 Debug" in alto a destra
2. Vedi: Socket ID, Game ID, Status, Player count
3. Log eventi in tempo reale

### Log Server
Il server mostra:
```
[GAME] Partita creata
[VOTE] Giocatore vota
[RESULT] Risultato votazione
[CLEANUP] Giochi eliminati
```

### Problemi Comuni

**Timer non si vede:**
- Verifica modalità Speed attivata
- Controlla timer-box in index.html
- Apri console: cerca errori

**CORS errors:**
- Normale in sviluppo locale
- Configura ALLOWED_ORIGINS in produzione

**Disconnessioni:**
- Controlla firewall
- Verifica rete stabile
- Aumenta pingTimeout in server.js

---

## 📊 Test di Performance

### Load Test (opzionale)
```bash
# Installa artillery
npm install -g artillery

# Crea file test.yml
artillery quick --count 10 --num 50 http://localhost:3000
```

### Monitoraggio Memoria
```bash
# Linux/Mac
top -p $(pgrep -f "node server.js")

# Windows
tasklist | findstr node
```

---

## ✅ Checklist Test Completa

- [ ] Server si avvia senza errori
- [ ] Connessione client funziona
- [ ] Multiplayer (2+ browser) funziona
- [ ] Tutte le 4 modalità avviabili
- [ ] Timer funziona in Speed mode
- [ ] Power-ups funzionano in Battle
- [ ] Bluff challenge + voting funziona
- [ ] Chat funziona
- [ ] Validazione input blocca XSS
- [ ] Rate limiting blocca spam
- [ ] Reset round mantiene modalità corretta
- [ ] Disconnessione pulisce gioco
- [ ] Debug panel mostra info corrette

---

## 🚀 Test in Produzione

### Deploy su Server
```bash
# Imposta variabili ambiente
export ALLOWED_ORIGINS="https://tuodominio.com,https://www.tuodominio.com"
export PORT=3000

# Avvia
npm start
```

### Test da Mobile
1. Assicurati server e mobile sulla stessa rete
2. Usa indirizzo IP mostrato dal server
3. Testa touch interactions
4. Verifica responsive design

---

## 📝 Report Bug

Se trovi problemi:
1. Apri DevTools → Console
2. Copia errori (rossi)
3. Controlla log server
4. Annota passi per riprodurre
5. Verifica versione Node.js (`node --version`)

---

Buon testing! 🎮
