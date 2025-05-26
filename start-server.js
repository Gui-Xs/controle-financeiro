const { spawn } = require('child_process');

const nodePath = process.env.NODE_PATH || 'C:\Program Files\nodejs\node.exe';
const npmPath = process.env.NPM_PATH || 'npm';

// Iniciar o servidor Vite
const server = spawn(nodePath, ['node_modules/vite/bin/vite.js'], {
    stdio: 'inherit'
});

server.on('error', (error) => {
    console.error('Erro ao iniciar o servidor:', error);
});

server.on('exit', (code) => {
    console.log(`Servidor encerrado com código ${code}`);
});
