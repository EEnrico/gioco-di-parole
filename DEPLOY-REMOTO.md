# 🌐 Giocare con Amici Remoti - Guida Completa

## ⚡ Soluzione Più Semplice: ngrok (2 minuti)

**Perfetto per:** Giocare subito, testing, sessioni temporanee

### Setup Rapido

#### 1. Installa ngrok

**Mac:**
```bash
brew install ngrok
```

**Linux:**
```bash
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok
```

**Windows (tuo amico):**
- Scarica da: https://ngrok.com/download
- Estrai il file .zip
- Apri PowerShell nella cartella

#### 2. Avvia il Server
```bash
# Nel tuo terminale
npm run dev
```

#### 3. Crea il Tunnel ngrok
```bash
# In un SECONDO terminale
ngrok http 3000
```

**Output:**
```
ngrok

Session Status    online
Forwarding        https://abc123.ngrok.io -> http://localhost:3000
```

#### 4. Condividi l'URL
**Copia l'URL** (es: `https://abc123.ngrok.io`) e invialo al tuo amico!

**Il tuo amico:** Apre il browser e va su `https://abc123.ngrok.io`

✅ **Fatto!** Ora potete giocare insieme.

---

## 🔒 Soluzione Privata: Tailscale (VPN semplice)

**Perfetto per:** Connessione sicura, permanente, senza esporre il server a internet

### Setup

#### 1. Installa Tailscale

**Entrambi installate Tailscale:**
- Mac/Linux: https://tailscale.com/download
- Windows: https://tailscale.com/download/windows

#### 2. Crea Account (entrambi)
- Registrati gratis su https://login.tailscale.com

#### 3. Connettiti (entrambi)
- Avvia Tailscale
- Accedi con lo stesso account
- Vi connettete automaticamente alla stessa rete privata

#### 4. Trova il Tuo IP Tailscale
```bash
# Sul tuo Mac
tailscale ip -4
# Output: 100.x.y.z
```

#### 5. Avvia il Server
```bash
npm run dev
```

#### 6. Amico si Connette
**Il tuo amico** apre browser e va su: `http://100.x.y.z:3000`

✅ **Vantaggi:**
- Connessione sicura (criptata)
- Sempre stesso IP
- Nessuna scadenza
- Privato (non pubblico su internet)

---

## ☁️ Soluzione Permanente: Deploy Cloud (GRATIS)

**Perfetto per:** Giocare sempre, qualsiasi momento, con chiunque

### Opzione A: Render.com (Consigliata)

#### 1. Prepara il Repository

**Crea `.gitignore`:**
```bash
cat > .gitignore << EOF
node_modules/
.DS_Store
*.log
EOF
```

**Inizializza Git (se non fatto):**
```bash
git init
git add .
git commit -m "Initial commit"
```

**Carica su GitHub:**
1. Crea repository su https://github.com/new
2. Segui le istruzioni per push

#### 2. Deploy su Render

1. Vai su https://render.com
2. Clicca "Get Started" → Accedi con GitHub
3. "New" → "Web Service"
4. Connetti il tuo repository
5. Configurazione:
   - **Name**: `gioco-di-parole`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
6. Clicca "Create Web Service"

⏳ Aspetta 2-3 minuti...

✅ **URL pubblico:** `https://gioco-di-parole.onrender.com`

**Condividi questo URL** con chiunque vuoi!

---

### Opzione B: Railway.app

1. Vai su https://railway.app
2. "Start a New Project" → "Deploy from GitHub repo"
3. Connetti repository
4. Deploy automatico
5. Ottieni URL pubblico

---

### Opzione C: Glitch.com

1. Vai su https://glitch.com
2. "New Project" → "Import from GitHub"
3. Incolla URL repository
4. Remix e deploy
5. URL pubblico disponibile

---

## 📋 Confronto Soluzioni

| Soluzione | Setup | Permanente | Velocità | Sicurezza | Costo |
|-----------|-------|------------|----------|-----------|-------|
| **ngrok** | 2 min | ❌ (sessione) | ⚡⚡⚡ | ✅ HTTPS | Gratis |
| **Tailscale** | 5 min | ✅ | ⚡⚡⚡ | ✅✅✅ VPN | Gratis |
| **Render** | 10 min | ✅ | ⚡⚡ | ✅ HTTPS | Gratis* |
| **Railway** | 10 min | ✅ | ⚡⚡ | ✅ HTTPS | Gratis* |

*Piano gratuito con limiti (500h/mese Render, 500h/mese Railway)

---

## 🎯 Quale Scegliere?

### Per Giocare ORA (2 minuti)
```bash
# Setup velocissimo
brew install ngrok     # o scarica per Windows/Linux
npm run dev           # In un terminale
ngrok http 3000       # In un altro terminale

# Condividi l'URL https://xyz.ngrok.io
```
👉 **Consiglio: ngrok**

---

### Per Giocare SPESSO (5 minuti)
```bash
# Installa Tailscale (entrambi)
# Avvia Tailscale (entrambi)
# Trova IP: tailscale ip -4
# Avvia server: npm run dev

# Amico usa: http://100.x.y.z:3000
```
👉 **Consiglio: Tailscale**

---

### Per Giocare SEMPRE (10 minuti)
```bash
# Deploy su cloud
# 1. Push su GitHub
# 2. Deploy su Render/Railway
# 3. URL permanente tipo: https://gioco.onrender.com
```
👉 **Consiglio: Render.com**

---

## 🚀 Setup Consigliato Step-by-Step

### Metodo 1: ngrok (RAPIDO)

```bash
# PASSO 1: Sul tuo Mac
brew install ngrok

# PASSO 2: Avvia server
cd /Users/enricoerba/openprojects/personal/carte
npm run dev

# PASSO 3: In un NUOVO terminale (Cmd+T)
ngrok http 3000

# PASSO 4: Copia l'URL tipo: https://abc123.ngrok.io

# PASSO 5: Invia l'URL al tuo amico via WhatsApp/Telegram/Email

# AMICO: Apre browser → incolla URL → GIOCA!
```

**Limitazioni:**
- URL cambia ogni volta che riavvii ngrok
- Sessione scade dopo inattività
- Devi tenere il Mac acceso

---

### Metodo 2: Render (PERMANENTE)

```bash
# PASSO 1: Prepara repository
cd /Users/enricoerba/openprojects/personal/carte

# Crea .gitignore se non esiste
cat > .gitignore << 'EOF'
node_modules/
.DS_Store
*.log
.env
EOF

# PASSO 2: Inizializza Git
git init
git add .
git commit -m "Gioco di parole multiplayer"

# PASSO 3: Crea repository su GitHub
# Vai su: https://github.com/new
# Nome: gioco-di-parole
# Pubblica o Privata: a tua scelta
# Clicca "Create repository"

# PASSO 4: Carica codice
git remote add origin https://github.com/TUO_USERNAME/gioco-di-parole.git
git branch -M main
git push -u origin main

# PASSO 5: Deploy su Render
# 1. Vai su https://render.com
# 2. Sign up with GitHub
# 3. New → Web Service
# 4. Connetti repository "gioco-di-parole"
# 5. Configurazione:
#    - Build Command: npm install
#    - Start Command: npm start
# 6. Deploy

# PASSO 6: Aspetta 3-5 minuti
# Ottieni URL: https://gioco-di-parole.onrender.com

# PASSO 7: Condividi URL con amico
```

**Vantaggi:**
- URL permanente
- Sempre online
- Non serve tenere Mac acceso
- Chiunque può accedere

---

## 🔧 Configurazioni Extra

### Render: Variabili Ambiente

Nel dashboard Render, aggiungi:
```
ALLOWED_ORIGINS=https://gioco-di-parole.onrender.com
NODE_ENV=production
```

### ngrok: Account Gratuito (opzionale)

1. Registrati su https://ngrok.com
2. Ottieni authtoken
3. Configura:
```bash
ngrok config add-authtoken TUO_TOKEN
```

**Vantaggi con account:**
- URL personalizzato (es: `myname.ngrok.io`)
- Sessioni più lunghe
- Statistiche

---

## 📱 Test con Amico

### Checklist Pre-Gaming

**Tu (host):**
- [ ] Server avviato (`npm run dev`)
- [ ] Tunnel attivo (ngrok o Tailscale)
- [ ] URL condiviso con amico
- [ ] Firewall non blocca porte

**Amico (client):**
- [ ] Browser aggiornato (Chrome/Firefox/Safari)
- [ ] JavaScript abilitato
- [ ] URL corretto ricevuto
- [ ] Connessione internet stabile

### Test Connessione

**Amico prova:**
```
1. Apri browser
2. Vai su URL ricevuto
3. Vedi la pagina del gioco?
   ✅ SI → Funziona!
   ❌ NO → Vedi sotto
```

### Troubleshooting

**Amico non si connette:**

1. **Verifica URL corretto**
   - ngrok: `https://xyz.ngrok.io` (HTTPS!)
   - Tailscale: `http://100.x.y.z:3000`
   - Render: `https://nome.onrender.com`

2. **Controlla console browser (F12)**
   - Errori in rosso?
   - Screenshot e invia

3. **Prova da tuo telefono (4G)**
   - Stessa rete? NON funziona
   - 4G/5G? Dovrebbe funzionare

4. **Verifica server attivo**
   ```bash
   # Sul tuo Mac
   curl http://localhost:3000
   # Deve rispondere con HTML
   ```

---

## 🎮 Primo Gioco Remoto

### Setup Sessione

1. **Tu:** Avvia server e tunnel
2. **Condividi:** Invia URL all'amico
3. **Amico:** Apre URL nel browser
4. **Tu:** Crea partita (Classic/Battle/Speed/Coop)
5. **Amico:** Join con Game ID
6. **Tu:** Start game
7. **🎉 GIOCATE!**

### Chat Vocale (opzionale)

Per parlare durante il gioco:
- Discord: https://discord.com
- Google Meet: https://meet.google.com
- WhatsApp/Telegram call

---

## 💡 Tips & Tricks

### ngrok Pro Tips

**URL statico (con account free):**
```bash
# Dopo aver configurato authtoken
ngrok http 3000 --domain=yourname.ngrok-free.app
```

**Ispeziona traffico:**
- Apri: http://localhost:4040
- Vedi tutte le richieste in tempo reale

### Render Pro Tips

**Evita cold start (piano free):**
- Render mette in sleep dopo 15 min inattività
- Primo accesso: attendi 30-60 secondi
- Usa UptimeRobot per ping ogni 14 min (gratis)

**Log in tempo reale:**
- Dashboard Render → Logs
- Vedi console.log del server

### Tailscale Pro Tips

**IP fisso facile da ricordare:**
```bash
# Nel Tailscale admin
# Machines → tuo-mac → Edit → Set IP
# Scegli: 100.100.100.1
```

**Condividi con amico NON su Tailscale:**
```bash
# Usa Funnel (beta)
tailscale funnel 3000
# Genera URL pubblico
```

---

## 🆘 Supporto

### Problemi Comuni

**ngrok: "ERR_NGROK_3200"**
- Server locale non risponde
- Verifica: `curl localhost:3000`

**Tailscale: "Cannot connect"**
- Entrambi su stesso account?
- Firewall blocca Tailscale?

**Render: "Application failed to respond"**
- Controlla logs nel dashboard
- Verifica `npm start` funziona localmente

---

## 📞 Invita Amico (Template)

### Per ngrok:
```
Ciao! 🎮

Giochiamo al gioco di parole!

Link: https://abc123.ngrok.io

Apri il link, clicca "Unisciti" e usa questo ID:
Game ID: game_xyz123

Ci vediamo in partita!
```

### Per Render (permanente):
```
Ciao! 🎮

Ho creato un gioco multiplayer di carte!

Link: https://gioco-di-parole.onrender.com

Funziona sempre, salvalo nei preferiti!

Quando giochi:
1. Apri il link
2. Clicca "Unisciti a Partita"
3. Usa il mio Game ID (te lo mando quando creo partita)

Oppure crea TU una partita e dimmi il tuo ID!

Buon divertimento! 🎉
```

---

Scegli il metodo e dimmi se hai bisogno di aiuto! 🚀
