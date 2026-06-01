"""
Cognitive Logix - Frontend SPA sunucusu
Frontend'i (Vite build / frontend/dist) ayri bir portta sunar.
- /assets/*.js  ve  /assets/*.css  -> dogru MIME ile servis edilir
- /dashboard, /fraud gibi React Router yollari  -> index.html'e fallback yapar
- Boylece backend'in (FastAPI) statik dosya sorunlarindan etkilenmez.

Kullanim:
    python serve_frontend.py            # varsayilan port 5173
    python serve_frontend.py 5174       # ozel port
"""
import http.server
import mimetypes
import os
import socketserver
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "frontend" / "dist"
INDEX = DIST / "index.html"

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/wasm", ".wasm")


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

    def do_GET(self):
        rel = self.path.split("?", 1)[0].lstrip("/")
        fs_path = DIST / rel
        if rel and fs_path.is_file():
            return super().do_GET()
        if INDEX.exists():
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            data = INDEX.read_bytes()
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        self.send_error(404, "Frontend dist not found")

    def log_message(self, fmt, *args):
        pass


def main():
    port = 5173
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass

    if not INDEX.exists():
        print(f"[ERROR] frontend/dist/index.html bulunamadi: {INDEX}", file=sys.stderr)
        print("  -> 'cd frontend && npm run build' calistirin.", file=sys.stderr)
        sys.exit(1)

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", port), SPAHandler) as httpd:
        print(f"[Frontend] http://127.0.0.1:{port}/ uzerinde calisiyor")
        print(f"[Frontend] Sunulan klasor: {DIST}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("[Frontend] Kapatildi.")


if __name__ == "__main__":
    main()
