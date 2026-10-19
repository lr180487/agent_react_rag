"""
main.py — Backend ANALYZER → PROCESSOR → RESPONSE (corregido)
Sincronizado con interfaz.html / nuevo-chat.html
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pathlib import Path
import logging

# Routers
try:
    from app.api.routes_analyzer import router as analyzer_router
except ImportError:
    analyzer_router = None

try:
    from app.api.routes_langchain import router as langchain_router
except ImportError:
    langchain_router = None

try:
    from app.api.routes_llm import router as llm_router
except ImportError:
    llm_router = None

try:
    from app.api.routes_health import router as health_router
except ImportError:
    health_router = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Backend ANALYZER → PROCESSOR → RESPONSE",
    description="""
    **Flujo:** Usuario → FastAPI → ANALYZER (10) → PROCESSOR (7 + tri) → RESPONSE (5) → USER (WS/Frontend)
    **WebSocket:** WS /ws/langchain cada 2s + GET /api/langchain/status
    """,
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers - ANTES de estáticos
if health_router:
    app.include_router(health_router, prefix="/api/v1", tags=["Health"])
    logger.info("✓ health_router en /api/v1")

if langchain_router:
    app.include_router(langchain_router)
    logger.info("✓ langchain_router en /ws/langchain y /api/langchain/status")

if analyzer_router:
    app.include_router(analyzer_router)
    logger.info("✓ analyzer_router en /api/v1/analyzer")

if llm_router:
    app.include_router(llm_router)
    logger.info("✓ llm_router en /api/v1/llm")

# Frontend - detección robusta
FRONTEND_CANDIDATES = [
    Path("/home/user/agente_react_rag/frontend"),
    Path(__file__).resolve().parent.parent / "frontend",
    Path(__file__).resolve().parents[2] / "agente_react_rag" / "frontend",
    Path(__file__).resolve().parent / "frontend",
]
frontend_dir = None
for cand in FRONTEND_CANDIDATES:
    if cand.exists() and (cand / "index.html").exists():
        frontend_dir = cand
        break

root_dir = Path("/home/user")
BASE_DIR = Path(__file__).resolve().parent.parent

if frontend_dir:
    app.mount("/frontend", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
    logger.info(f"✓ Frontend en /frontend → {frontend_dir}")

# Montar /static solo si root tiene archivos sueltos (evita conflicto con frontend)
if (root_dir / "interfaz.html").exists():
    try:
        app.mount("/static", StaticFiles(directory=str(root_dir)), name="static")
        logger.info("✓ Static en /static → /home/user")
    except Exception:
        pass
elif frontend_dir:
    # Fallback: usa frontend para /static también
    try:
        app.mount("/static", StaticFiles(directory=str(frontend_dir), html=True), name="static-fallback")
        logger.info(f"✓ Static fallback → {frontend_dir}")
    except Exception:
        pass

# Health - ANTES del catch-all
@app.get("/health", tags=["Health"])
def health():
    return {
        "status": "ok",
        "flow": "ANALYZER (10) → PROCESSOR (7+tri) → RESPONSE (5) → USER → WS",
        "analyzer": "10 pasos",
        "processor": "7 ramas + tri",
        "response": "5 apartados",
        "websocket": "/ws/langchain",
        "frontend": "/frontend/ , /interfaz.html , /nuevo-chat.html",
    }

# Assets en root (evita 404 en /llm-config.js etc.) - ANTES del catch-all
ASSET_FILES = ["llm-config.js", "script.js", "nuevo-chat.js", "chat.js", "analyzer.js", "processor.js", "response.js", "app.js", "main.js", "favicon.png", "favicon.svg", "favicon.ico"]
for asset in ASSET_FILES:
    def _make_asset_handler(fname=asset):
        async def _asset():
            for base in [frontend_dir, root_dir, BASE_DIR / "frontend"]:
                if base and (base / fname).exists():
                    return FileResponse(str(base / fname))
            return HTMLResponse(f"404 {fname} no encontrado", status_code=404)
        return _asset
    app.get(f"/{asset}", tags=["Frontend-Assets"])(_make_asset_handler(asset))

# Root - ANTES del catch-all
@app.get("/", response_class=HTMLResponse, tags=["Root"])
async def root():
    for cand in [
        frontend_dir / "index.html" if frontend_dir else None,
        frontend_dir / "interfaz.html" if frontend_dir else None,
        root_dir / "interfaz.html",
        BASE_DIR / "frontend" / "index.html",
    ]:
        if cand and cand.exists():
            return FileResponse(str(cand))
    return HTMLResponse(content="""
    <html><body style="font-family:monospace;padding:32px">
    <h3>Backend 2.1</h3>
    <p>Flow: ANALYZER (10) → PROCESSOR (7+tri) → RESPONSE (5) → USER</p>
    <ul>
      <li><a href="/docs">/docs</a></li>
      <li><a href="/api/langchain/status">/api/langchain/status</a> · WS <code>/ws/langchain</code></li>
      <li><a href="/frontend/">/frontend/</a> | <a href="/interfaz.html">/interfaz.html</a></li>
    </ul>
    </body></html>
    """)

# HTML directos
for fname in ["interfaz.html", "nuevo-chat.html", "dashboard.html", "index.html", "redirigir.html"]:
    def _make_handler(name=fname):
        async def _handler():
            for base in [frontend_dir, root_dir, BASE_DIR / "frontend"]:
                if base and (base / name).exists():
                    return FileResponse(str(base / name))
            return HTMLResponse(f"<h1>404 {name} no encontrado</h1>", status_code=404)
        return _handler
    app.get(f"/{fname}", response_class=HTMLResponse, tags=["Frontend"])(_make_handler(fname))
    app.get(f"/{fname.replace('.html','')}", response_class=HTMLResponse, tags=["Frontend"])(_make_handler(fname))

# Catch-all AL FINAL - solo para archivos con extensión
@app.get("/{full_path:path}", tags=["Frontend-CatchAll"], include_in_schema=False)
async def serve_frontend_assets(request: Request, full_path: str):
    if full_path.startswith(("api/", "ws/", "docs", "redoc", "openapi.json", "health", "frontend/", "static/")):
        return HTMLResponse("Not found", status_code=404)
    if "." not in full_path:
        return HTMLResponse("Not found", status_code=404)
    for base in [frontend_dir, root_dir, BASE_DIR / "frontend"]:
        if base:
            candidate = base / full_path
            try:
                candidate.resolve().relative_to(base.resolve())
            except ValueError:
                continue
            if candidate.exists() and candidate.is_file():
                return FileResponse(str(candidate))
    return HTMLResponse(f"404 {full_path} no encontrado", status_code=404)

@app.on_event("startup")
async def on_startup():
    logger.info("🚀 Backend 2.1 — ANALYZER 10 | PROCESSOR 7 | RESPONSE 5 | WS /ws/langchain")
    if frontend_dir:
        logger.info(f"   Frontend: {frontend_dir}")

@app.on_event("shutdown")
async def on_shutdown():
    logger.info("🛑 Backend detenido")
