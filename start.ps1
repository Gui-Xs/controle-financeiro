$nodePath = "C:\Program Files\nodejs\node.exe"
$vitePath = "node_modules\vite\bin\vite.js"

Write-Host "Iniciando servidor..."
& $nodePath $vitePath
