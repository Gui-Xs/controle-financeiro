$nodePath = "C:\Program Files\nodejs\node.exe"
$vitePath = "node_modules\vite\bin\vite.js"

# Parar processos Node.js existentes
try {
    Stop-Process -Name node -Force -ErrorAction SilentlyContinue
} catch {
    Write-Host "Nenhum processo Node.js encontrado"
}

# Iniciar o servidor Vite
Write-Host "Iniciando servidor Vite na porta 5174..."
& $nodePath $vitePath
