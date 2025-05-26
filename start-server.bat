@echo off
setlocal enabledelayedexpansion

:: Configurar firewall para a porta 3000
netsh advfirewall firewall add rule name="Financeiro App" dir=in action=allow protocol=TCP localport=3000

:: Iniciar o servidor
node simple-server.cjs

:: Remover regra do firewall quando o servidor for fechado
netsh advfirewall firewall delete rule name="Financeiro App"
