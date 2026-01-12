#!/bin/bash
# start-remote.sh - Avvia il gioco per amici remoti

echo "🎮 GIOCO DI PAROLE - Setup Remoto"
echo "=================================="
echo ""

# Controlla se ngrok è installato
if ! command -v ngrok &> /dev/null; then
    echo "⚠️  ngrok non trovato!"
    echo ""
    echo "Installalo con:"
    echo "  brew install ngrok"
    echo ""
    echo "Oppure scarica da: https://ngrok.com/download"
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
echo "🌐 Avvio tunnel ngrok..."
echo ""

# Avvia ngrok e cattura l'URL
ngrok http 3000 > /dev/null &
NGROK_PID=$!

# Aspetta che ngrok si avvii
sleep 2

# Ottieni l'URL pubblico
PUBLIC_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$PUBLIC_URL" ]; then
    echo "❌ Errore: impossibile ottenere URL da ngrok"
    echo "   Prova ad aprire manualmente: http://localhost:4040"
    exit 1
fi

echo "╔════════════════════════════════════════════════════╗"
echo "║          ✅ GIOCO PRONTO PER AMICI REMOTI!         ║"
echo "╠════════════════════════════════════════════════════╣"
echo "║                                                    ║"
echo "║  Condividi questo URL con il tuo amico:            ║"
echo "║                                                    ║"
echo "║  $PUBLIC_URL"
echo "║                                                    ║"
echo "╠════════════════════════════════════════════════════╣"
echo "║  Dashboard ngrok:                                  ║"
echo "║  http://localhost:4040                             ║"
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

# Copia URL negli appunti (se disponibile)
if command -v pbcopy &> /dev/null; then
    echo "$PUBLIC_URL" | pbcopy
    echo "✅ URL copiato negli appunti!"
elif command -v xclip &> /dev/null; then
    echo "$PUBLIC_URL" | xclip -selection clipboard
    echo "✅ URL copiato negli appunti!"
fi

echo ""
echo "⏳ Premi Ctrl+C per fermare server e tunnel..."
echo ""

# Trap per cleanup
trap cleanup EXIT INT TERM

cleanup() {
    echo ""
    echo "🛑 Arresto in corso..."

    # Ferma ngrok
    if [ ! -z "$NGROK_PID" ]; then
        kill $NGROK_PID 2>/dev/null
        echo "   ✓ Tunnel ngrok fermato"
    fi

    # Ferma server (se avviato da questo script)
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
        echo "   ✓ Server fermato"
    fi

    echo ""
    echo "👋 Grazie per aver giocato!"
    exit 0
}

# Mantieni lo script in esecuzione
wait
