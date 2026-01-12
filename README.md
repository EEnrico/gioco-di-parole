# 🎮 Gioco di Parole Multiplayer

Un gioco di carte multiplayer in tempo reale dove i giocatori competono usando le proprie abilità con le parole.

## 🌐 Gioca Ora

**[https://gioco-di-parole.onrender.com](https://gioco-di-parole.onrender.com)**

## ✨ Caratteristiche

- **Multiplayer in tempo reale** con Socket.IO
- **4 modalità di gioco** uniche
- **Sistema di power-up** strategici
- **Meccanica di bluff** con votazione democratica
- **Chat in-game** per comunicare con gli altri giocatori
- **Responsive design** per desktop e mobile
- **Sicurezza ottimizzata** (protezione XSS, rate limiting, CORS)

## 🎯 Modalità di Gioco

### 🎴 Classica
La modalità tradizionale dove i giocatori giocano carte e formano parole a turno.
- 2-6 giocatori
- 6 carte per giocatore
- Turni classici

### ⚔️ Battle
Modalità competitiva con più carte e azione frenetica.
- 2-6 giocatori
- 8 carte per giocatore
- Ritmo accelerato

### ⏱️ Speed
Modalità veloce con timer e pressione temporale.
- 2-6 giocatori
- 6 carte per giocatore
- 15 secondi per turno

### 🤝 Cooperativa
Lavorate insieme per raggiungere un obiettivo comune di parole.
- 2-6 giocatori
- 6 carte per giocatore
- Obiettivo di squadra: 15 parole

## 💫 Power-ups

I power-up aggiungono strategia e caos al gioco:

- **👁️ Spia**: Guarda le carte di un avversario
- **🎴 Carta Extra**: Pesca una carta aggiuntiva
- **⏭️ Salta Turno**: Fa saltare il turno all'avversario successivo
- **🔄 Scambio**: Scambia tutte le tue carte con nuove
- **🛡️ Scudo**: Protegge dai power-up nemici per un turno

## 🎲 Come Giocare

1. **Crea o Unisciti a una Partita**
   - Crea una nuova partita e condividi il Game ID
   - Oppure unisciti a una partita esistente inserendo il codice

2. **Gioca le Tue Carte**
   - Nel tuo turno, seleziona una carta e forma una parola
   - Puoi bluffare dichiarando lettere che non hai!

3. **Chiama il Bluff**
   - Se sospetti un bluff, sfida il giocatore
   - Proponi la vera lettera e lascia votare gli altri

4. **Usa i Power-ups**
   - Attiva strategicamente i power-up per ottenere vantaggio
   - Disponibili solo in modalità Battle e Speed

5. **Vinci**
   - Modalità competitive: Sbarazzati di tutte le tue carte
   - Modalità cooperativa: Raggiungete l'obiettivo insieme

## 🛠️ Tecnologie Utilizzate

- **Backend**: Node.js, Express
- **Real-time**: Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Deployment**: Render.com
- **Version Control**: Git, GitHub

## 🚀 Installazione Locale

Per sviluppatori che vogliono contribuire o eseguire il gioco localmente:

```bash
# Clona il repository
git clone https://github.com/EEnrico/gioco-di-parole.git

# Entra nella directory
cd gioco-di-parole

# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev

# Il server sarà disponibile su http://localhost:3000
```

## 📁 Struttura del Progetto

```
carte/
├── server.js           # Server Express e gestione Socket.IO
├── game-logic.js       # Logica di gioco, gestione stati e turni
├── client.js           # Logica client e comunicazione Socket.IO
├── index.html          # Interfaccia utente
├── style.css           # Stili dell'applicazione
├── package.json        # Dipendenze e configurazione
└── CLAUDE.md           # Documentazione per sviluppatori
```

## 🔐 Sicurezza

Il gioco implementa diverse misure di sicurezza:

- Sanitizzazione input (protezione XSS)
- Rate limiting per prevenire spam
- CORS configurato per origini sicure
- ID di gioco crittograficamente sicuri
- Validazione lato server per tutte le azioni

## 📝 Documentazione per Sviluppatori

Per informazioni dettagliate sull'architettura, eventi Socket.IO e logica di gioco, consulta [CLAUDE.md](CLAUDE.md).

## 🤝 Contribuire

Le pull request sono benvenute! Per modifiche importanti, apri prima un issue per discutere cosa vorresti cambiare.

## 📄 Licenza

[MIT](LICENSE)

## 👤 Autore

Enrico Erba - [@EEnrico](https://github.com/EEnrico)

---

**Buon divertimento!** 🎉
