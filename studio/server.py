#!/usr/bin/env python3
"""Serve only the Studio application on loopback. No upload or command API."""
import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent


class StudioHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".mjs": "text/javascript"}

    def allowed_path(self):
        path = unquote(urlsplit(self.path).path)
        allowed = path in ("/", "/index.html", "/studio.css", "/favicon.svg") or (
            path.startswith("/src/") and path.endswith(".mjs"))
        target = (ROOT / path.lstrip("/")).resolve()
        if not allowed or not target.is_relative_to(ROOT):
            self.send_error(404)
            return False
        return True

    def do_GET(self):
        if self.allowed_path():
            super().do_GET()

    def do_HEAD(self):
        if self.allowed_path():
            super().do_HEAD()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), functools.partial(StudioHandler, directory=str(ROOT)))
    print(f"Sketcy Studio: http://127.0.0.1:{server.server_port} (Ctrl+C to stop)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
