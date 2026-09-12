#!/usr/bin/env python3
"""
Servidor de desarrollo para FORTNITE CLASH.

Hace lo mismo que `python3 -m http.server 8000` pero manda cabeceras de
NO-CACHE. Sin eso, al editar un modulo el navegador puede seguir usando
la version vieja que tiene guardada y parece que los cambios "no salen".

    python3 dev-server.py          -> http://localhost:8000
    python3 dev-server.py 8080     -> otro puerto
"""

import http.server
import os
import sys

PUERTO = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
RAIZ = os.path.dirname(os.path.abspath(__file__))


class SinCache(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=RAIZ, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    print(f'FORTNITE CLASH -> http://localhost:{PUERTO}  (Ctrl+C para parar)')
    http.server.HTTPServer(('127.0.0.1', PUERTO), SinCache).serve_forever()
