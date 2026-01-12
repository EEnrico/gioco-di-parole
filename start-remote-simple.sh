#!/bin/bash
# start-remote-simple.sh - Soluzione IMMEDIATA senza registrazioni

echo "🎮 GIOCO DI PAROLE - Setup Remoto Immediato"
echo "==========================================="
echo ""

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
echo "🌐 Creazione tunnel pubblico..."
echo ""
echo "⏳ Attendi 5-10 secondi..."
echo ""

# Usa ssh + localhost.run (nessuna registrazione richiesta!)
# -o StrictHostKeyChecking=no accetta automaticamente la chiave
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -R 80:localhost:3000 nokey@localhost.run > tunnel.log 2>&1 &
SSH_PID=$!

# Aspetta che il tunnel si stabilisca
sleep 5

# Estrai l'URL dal log
PUBLIC_URL=$(grep -o 'https://[a-z0-9-]*\.lhr\.life' tunnel.log | head -1)

if [ -z "$PUBLIC_URL" ]; then
    # Prova a estrarre formato alternativo
    PUBLIC_URL=$(grep -o 'https://[a-z0-9-]*\.localhost\.run' tunnel.log | head -1)
fi

if [ -z "$PUBLIC_URL" ]; then
    echo "❌ Errore nel creare il tunnel"
    echo ""
    echo "📋 Prova manualmente:"
    echo "   ssh -R 80:localhost:3000 nokey@localhost.run"
    echo ""
    echo "   Copia l'URL che appare e condividilo con il tuo amico"
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

echo ""
echo "⏳ Premi Ctrl+C per fermare server e tunnel..."
echo ""

# Trap per cleanup
trap cleanup EXIT INT TERM

cleanup() {
    echo ""
    echo "🛑 Arresto in corso..."

    # Ferma tunnel SSH
    if [ ! -z "$SSH_PID" ]; then
        kill $SSH_PID 2>/dev/null
        echo "   ✓ Tunnel fermato"
    fi

    # Ferma server
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
        echo "   ✓ Server fermato"
    fi

    # Pulisci file log
    rm -f tunnel.log 2>/dev/null

    echo ""
    echo "👋 Grazie per aver giocato!"
    exit 0
}

# Mantieni lo script in esecuzione
wait
