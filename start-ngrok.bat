@echo off
:: Parar processos anteriores
taskkill /F /IM node.exe

:: Iniciar servidor
start node simple-server.cjs

:: Aguardar 2 segundos para o servidor iniciar
timeout /t 2

:: Iniciar ngrok com configuração
start "" ngrok.exe http 3000 --config ngrok-config.yml

:: Aguardar alguns segundos para o ngrok iniciar
timeout /t 5

:: Abrir navegador com o link do ngrok
start https://dashboard.ngrok.com/status
