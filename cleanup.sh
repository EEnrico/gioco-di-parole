#!/bin/bash
# cleanup.sh - Pulisce processi rimasti in esecuzione

echo "🧹 Pulizia processi..."

# Trova e ferma tutti i processi node sulla porta 3000
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "   Trovato processo sulla porta 3000"
    lsof -ti:3000 | xargs kill -9
    echo "   ✅ Processo fermato"
else
    echo "   ✅ Nessun processo da fermare"
fi

# Ferma eventuali tunnel ngrok
pkill -f ngrok 2>/dev/null && echo "   ✅ ngrok fermato" || true

# Ferma eventuali tunnel ssh
pkill -f "ssh -R 80:localhost:3000" 2>/dev/null && echo "   ✅ tunnel ssh fermato" || true

echo ""
echo "✨ Pulizia completata!"
echo ""
echo "Ora puoi eseguire:"
echo "  npm run dev"
echo "  npm run remote-now"
