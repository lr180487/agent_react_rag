
"""
routes_analyzer.py — ENDPOINTS ANALYZER (10) → PROCESSOR (7) → RESPONSE (5) → USER
Flujo: Usuario → FastAPI → ANALYZER (10 pasos) → PROCESSOR (7 + tri) → PROCESSOR RESULT → RESPONSE (5) → USER (WebSocket/Frontend)
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os

from app.services.analyzer_service import AnalyzerService
from app.services.processor_service import ProcessorService
from app.services.response_service import ResponseService

router = APIRouter(prefix="/api/v1/analyzer", tags=["Analyzer → Processor → Response"])

# ---------- Schemas ----------
class AnalyzeRequest(BaseModel):
    text: str = Field(..., example="Analiza el contrato y busca penalidades por demora")
    chat_id: Optional[str] = None
    history: Optional[List[Dict[str, Any]]] = None

class ProcessorRequest(BaseModel):
    query: str = Field(..., example="penalidades por demora")
    plan: List[Dict[str, Any]] = Field(..., example=[{"tool": "web_search"}, {"tool": "rag"}])
    chat_id: Optional[str] = None

class ExecuteRequest(BaseModel):
    text: str = Field(..., example="Analiza X y busca información sobre Y")
    chat_id: Optional[str] = None
    history: Optional[List[Dict[str, Any]]] = None

# ---------- Helpers LLM ----------
def get_active_llm():
    try:
        from app.api.routes_llm import _DB as LLM_DB, _ACTIVE_ID
        if _ACTIVE_ID and _ACTIVE_ID in LLM_DB:
            c = LLM_DB[_ACTIVE_ID]
            return {"provider": c["provider"], "model": c["model"], "api_key": c["api_key"], "temperature": c.get("temperature",0.7), "source": "db"}
    except: pass
    return {
        "provider": os.getenv("LLM_PROVIDER","openai"),
        "model": os.getenv("LLM_MODEL","gpt-4o-mini"),
        "api_key": os.getenv("OPENAI_API_KEY","sk-mock"),
        "temperature": 0.7,
        "source": "env"
    }

# ---------- Services singletons ----------
analyzer_svc = AnalyzerService()
processor_svc = ProcessorService()
response_svc = ResponseService()

# ---------- Endpoints ----------

@router.post("/analyze", summary="ANALYZER — 10 pasos: interpretar → generar plan")
async def analyze(req: AnalyzeRequest):
    result = analyzer_svc.analyze(req.text, chat_id=req.chat_id, history=req.history or [])
    llm = get_active_llm()
    result["llm"] = {"provider": llm["provider"], "model": llm["model"], "source": llm["source"]}
    result["next"] = "PROCESSOR"
    return result

@router.post("/process", summary="PROCESSOR — 7 ramas + tri Web Search/RAG/External → Resultados")
async def process_endpoint(req: ProcessorRequest):
    tri = await processor_svc.process(req.query, req.plan, chat_id=req.chat_id)
    llm = get_active_llm()
    tri["llm"] = {"provider": llm["provider"], "model": llm["model"]}
    return tri

@router.post("/execute", summary="ANALYZER → PROCESSOR → PROCESSOR RESULT → RESPONSE → USER (completo)")
async def execute(req: ExecuteRequest):
    """
    Flujo completo corregido del diagrama:
    1. ANALYZER 10 pasos
    2. PROCESSOR 7 ramas + tri (Web Search / RAG / External API) → Resultados
    3. PROCESSOR RESULT
    4. RESPONSE 5 apartados (síntesis, explicación, fuentes, recomendaciones, acciones)
    5. USER vía WebSocket/Frontend
    """
    llm = get_active_llm()
    # 1. ANALYZER
    analyzer_result = analyzer_svc.analyze(req.text, chat_id=req.chat_id, history=req.history or [])
    plan = analyzer_result["plan"]
    # 2. PROCESSOR
    processor_result = await processor_svc.process(req.text, plan, chat_id=req.chat_id)
    resultados = processor_result["tri_result"]
    # 3. PROCESSOR RESULT (ya en processor_result)
    # 4. RESPONSE
    response_result = response_svc.build(req.text, analyzer_result, processor_result)
    # 5. USER (preparar payload WebSocket)
    return {
        "flow": "ANALYZER (10) → PROCESSOR (7 + tri) → PROCESSOR RESULT → RESPONSE (5) → USER",
        "analyzer": analyzer_result["analyzer"],
        "plan": plan,
        "processor": processor_result["processor"],
        "tri_result": resultados,
        "processor_result": {"resultados": resultados, "total": resultados.get("total_items",0)},
        "response": response_result["response"],
        "llm": {"provider": llm["provider"], "model": llm["model"], "source": llm["source"]},
        "next": "USER",
        "channel": "WebSocket / Frontend",
        "sintesis": response_result["response"]["sintesis"],
        "fuentes": response_result["response"]["fuentes"],
    }

@router.get("/status", summary="Estado del pipeline")
def status():
    llm = get_active_llm()
    return {
        "analyzer": {"pasos": ["interpretar_intencion","clasificar_solicitud","extraer_entidades","analizar_contexto","consultar_memoria_necesaria","detectar_necesidad_web_search","detectar_necesidad_rag","seleccionar_herramientas","evaluar_riesgo","generar_plan"], "status": "ok"},
        "processor": {"ramas": ["Web Search","RAG","Database","Documents","External APIs","Notifications","Workflows"], "tri": ["Web Search","RAG","External API"], "status": "ok"},
        "response": {"apartados": ["sintesis","explicacion","fuentes","recomendaciones","acciones_propuestas"], "status": "ok"},
        "llm": {"provider": llm["provider"], "model": llm["model"], "source": llm["source"]},
        "flow": "ANALYZER → PROCESSOR → Resultados → PROCESSOR RESULT → RESPONSE → USER",
        "connected": bool(llm.get("api_key"))
    }
