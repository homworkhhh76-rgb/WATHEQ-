#!/usr/bin/env python3
"""Optional localhost launcher. Requires Python 3; no packages or internet."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import webbrowser
ROOT=Path(__file__).resolve().parent
if __name__=='__main__':
    address=('127.0.0.1',8765)
    handler=partial(SimpleHTTPRequestHandler,directory=str(ROOT))
    print('Rawan ERP: http://localhost:8765 — Ctrl+C to stop')
    with ThreadingHTTPServer(address,handler) as server:
        webbrowser.open('http://localhost:8765/index.html')
        try: server.serve_forever()
        except KeyboardInterrupt: pass
