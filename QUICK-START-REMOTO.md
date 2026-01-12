# 🚀 Gioca con Amico Remoto - 2 MINUTI

## Metodo Super Veloce (Consigliato)

### 1. Installa ngrok (solo prima volta)
```bash
brew install ngrok
```

### 2. Usa lo script automatico
```bash
./start-remote.sh
```

**Output:**
```
╔════════════════════════════════════════════════════╗
║          ✅ GIOCO PRONTO PER AMICI REMOTI!         ║
╠════════════════════════════════════════════════════╣
║  Condividi questo URL con il tuo amico:            ║
║  https://abc123.ngrok.io                           ║
╚════════════════════════════════════════════════════╝

✅ URL copiato negli appunti!
```

### 3. Invia URL all'amico
L'URL è **già copiato**! Incollalo su WhatsApp/Telegram/Email.

### 4. Giocate!
- **Tu**: Crea partita
- **Amico**: Apre l'URL → Unisciti → Inserisci Game ID

✅ **FATTO!**

---

## Metodo Manuale (se preferisci)

### Terminale 1 - Server
```bash
npm run dev
```

### Terminale 2 - Tunnel
```bash
ngrok http 3000
```

Copia l'URL `https://xyz.ngrok.io` e invialo all'amico.

---

## ❓ FAQ Rapide

**Q: Quanto dura la sessione?**
A: Finché tieni lo script/server attivo. Quando chiudi, l'URL smette di funzionare.

**Q: Posso giocare con più amici?**
A: Sì! Fino a 6 giocatori. Tutti usano lo stesso URL.

**Q: L'URL funziona su mobile?**
A: Sì! Funziona su qualsiasi dispositivo con browser.

**Q: Serve tenere il Mac acceso?**
A: Sì, il server gira sul tuo Mac. Per una soluzione permanente vedi `DEPLOY-REMOTO.md`.

**Q: L'URL cambia ogni volta?**
A: Sì con ngrok free. Per URL fisso vedi `DEPLOY-REMOTO.md` (Render/Railway).

**Q: È sicuro?**
A: Sì! ngrok usa HTTPS (connessione criptata).

---

## 🎮 Esempio Messaggio per Amico

```
Ciao! 🎮

Giochiamo al gioco di carte?

Link: https://abc123.ngrok.io

Apri il link e clicca "Unisciti a Partita"!
Ti mando il Game ID appena creo la partita.

Ci vediamo! 🃏
```

---

## 🛑 Fermare il Gioco

Premi `Ctrl+C` nel terminale dove gira lo script.

---

## 📚 Guide Complete

- **Dettagli deploy**: `DEPLOY-REMOTO.md`
- **Testing**: `TEST-GUIDE.md`
- **Documentazione**: `CLAUDE.md`

---

🎉 **Buon divertimento!**
