#!/bin/bash
# start-cloudflare.sh - Usa Cloudflare Tunnel (il migliore!)

echo "🎮 GIOCO DI PAROLE - Cloudflare Tunnel"
echo "======================================"
echo ""

# Verifica se cloudflared è installato
if ! command -v cloudflared &> /dev/null; then
    echo "⚠️  cloudflared non trovato!"
    echo ""
    echo "Installalo con:"
    echo "  brew install cloudflare/cloudflare/cloudflared"
    echo ""
    exit 1
fi

# Controlla se il server è già in esecuzione
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ Server già in esecuzione sulla porta 3000"
else
    echo "🚀 Avvio server..."
    npm run dev > server.log 2>&1 &
    SERVER_PID=$!
    echo "   PID: $SERVER_PID"

    # Aspetta che il server si avvii
    sleep 3

    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ Server avviato con successo!"
    else
        echo "❌ Errore avvio server. Controlla server.log"
        exit 1
    fi
fi

echo ""
echo "🌐 Creazione tunnel Cloudflare..."
echo ""
echo "⏳ Attendi qualche secondo..."
echo ""

# Avvia cloudflare tunnel
cloudflared tunnel --url http://localhost:3000 2>&1 | tee cloudflare.log &
CF_PID=$!

# Aspetta che il tunnel si stabilisci e cattura l'URL
sleep 5

# Estrai l'URL dal log
PUBLIC_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' cloudflare.log | head -1)

if [ -z "$PUBLIC_URL" ]; then
    # Aspetta ancora un po'
    sleep 3
    PUBLIC_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' cloudflare.log | head -1)
fi

if [ -z "$PUBLIC_URL" ]; then
    echo "⏳ Il tunnel si sta ancora stabilendo..."
    echo "   Controlla il log sopra per l'URL"
    echo "   Cerca una riga tipo: https://xyz.trycloudflare.com"
else
    echo "╔════════════════════════════════════════════════════╗"
    echo "║          ✅ GIOCO PRONTO PER AMICI REMOTI!         ║"
    echo "╠════════════════════════════════════════════════════╣"
    echo "║                                                    ║"
    echo "║  Condividi questo URL con il tuo amico:            ║"
    echo "║                                                    ║"
    echo "║  $PUBLIC_URL"
    echo "║                                                    ║"
    echo "╠════════════════════════════════════════════════════╣"
    echo "║  Server locale:                                    ║"
    echo "║  http://localhost:3000                             ║"
    echo "║                                                    ║"
    echo "║  Per fermare:                                      ║"
    echo "║  Ctrl+C in questo terminale                        ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo ""
    echo "📋 Copia e invia al tuo amico:"
    echo ""
    echo "   Ciao! Giochiamo insieme! 🎮"
    echo "   Apri questo link: $PUBLIC_URL"
    echo ""

    # Copia URL negli appunti
    if command -v pbcopy &> /dev/null; then
        echo "$PUBLIC_URL" | pbcopy
        echo "✅ URL copiato negli appunti!"
    fi
fi

echo ""
echo "⏳ Tunnel attivo. Premi Ctrl+C per fermare..."
echo ""

# Trap per cleanup
trap cleanup EXIT INT TERM

cleanup() {
    echo ""
    echo "🛑 Arresto in corso..."

    # Ferma cloudflared
    if [ ! -z "$CF_PID" ]; then
        kill $CF_PID 2>/dev/null
        echo "   ✓ Tunnel Cloudflare fermato"
    fi

    # Ferma server (se avviato da questo script)
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
        echo "   ✓ Server fermato"
    fi

    # Pulisci log
    rm -f cloudflare.log 2>/dev/null

    echo ""
    echo "👋 Grazie per aver giocato!"
    exit 0
}

# Mantieni lo script in esecuzione e mostra output cloudflared
wait
