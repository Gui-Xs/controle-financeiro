from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
import socket

# Configurar o diretório atual como raiz
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Encontrar IP local
hostname = socket.gethostname()
local_ip = socket.gethostbyname(hostname)

# Porta para o servidor
port = 8080

# Classe personalizada para servir arquivos
class CustomHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return super().end_headers()

# Iniciar servidor
print(f"Servidor iniciado em http://{local_ip}:{port}")
print("Acesse o app em seu celular usando este IP:")
print(f"http://{local_ip}:{port}")

httpd = HTTPServer(('0.0.0.0', port), CustomHandler)
httpd.serve_forever()
