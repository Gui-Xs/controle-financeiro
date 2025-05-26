@echo off

:: Configurar Git
git config --global user.name "seu-nome"
git config --global user.email "seu-email"

:: Inicializar Git
git init
git add .
git commit -m "Primeiro commit"

:: Configurar repositório remoto
git remote add origin https://github.com/seu-usuario/nome-do-repositorio.git

:: Fazer push
git push -u origin main
