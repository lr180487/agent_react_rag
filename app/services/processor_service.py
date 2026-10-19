
"""
processor_service.py — PROCESSOR con 7 ramas + tri Split
├── Web Search
├── RAG
├── Database
├── Documents
├── External APIs
├── Notifications
└── Workflows

Tri: Web Search / RAG / External API → Resultados
"""
from typing import Dict, Any, List, Optional
import asyncio
import re

class ProcessorService:
    async def web_search(self, query: str) -> Dict[str, Any]:
        # mock Tavily/SerpAPI — en prod: httpx -> api.tavily.com
        return {
            "tool": "web_search",
            "query": query,
            "internet": True,
            "results": [
                {"title": "Resultado 1", "url": "https://example.com/1", "snippet": f"Info sobre {query[:40]}...", "score": 0.92},
                {"title": "Resultado 2", "url": "https://example.com/2", "snippet": "Datos complementarios...", "score": 0.84},
            ],
            "latency_ms": 180,
        }

    async def rag(self, query: str, chat_id: Optional[str]=None) -> Dict[str, Any]:
        # mock pgvector
        return {
            "tool": "rag",
            "query": query,
            "store": "pgvector",
            "chunks": [
                {"id": "doc_1::c42", "text": "Contrato cláusula 5: penalidad 5% por demora...", "score": 0.89, "source": "contrato.pdf"},
                {"id": "doc_2::c11", "text": "Anexo memoria técnica...", "score": 0.81, "source": "memoria.md"},
            ],
            "filters": {"chat_id": chat_id},
        }

    async def database(self, query: str, chat_id: Optional[str]=None) -> Dict[str, Any]:
        return {"tool": "database", "query": query, "rows": [{"id": 1, "content": "historial previo"}], "engine": "PostgreSQL"}

    async def documents(self, query: str) -> Dict[str, Any]:
        return {"tool": "documents", "query": query, "parser": "MarkItDown", "docs": ["accion.md","percepcion.md"]}

    async def external_apis(self, query: str) -> Dict[str, Any]:
        return {"tool": "external_apis", "query": query, "apis": ["rest","tools"], "status": "ok"}

    async def notifications(self, payload: Dict) -> Dict[str, Any]:
        return {"tool": "notifications", "sent": True, "channel": "websocket"}

    async def workflows(self, plan: List[Dict]) -> Dict[str, Any]:
        return {"tool": "workflows", "executed": plan, "status": "scheduled"}

    # --- Tri Processor: Web Search / RAG / External API → Resultados ---
    async def tri_processor(self, query: str, plan: List[Dict], chat_id: Optional[str]=None) -> Dict[str, Any]:
        tasks = []
        tools = [p["tool"] for p in plan]
        if "web_search" in tools:
            tasks.append(self.web_search(query))
        if "rag" in tools:
            tasks.append(self.rag(query, chat_id))
        if "external_apis" in tools or "external_api" in tools:
            tasks.append(self.external_apis(query))
        if not tasks:
            tasks.append(self.database(query, chat_id))
        results = await asyncio.gather(*tasks)
        # Normaliza
        merged = {"query": query, "fuentes": [r["tool"] for r in results], "resultados": results}
        # Rank simple por score
        all_snippets = []
        for r in results:
            for key in ["results","chunks","rows"]:
                if key in r:
                    all_snippets.extend(r[key])
        merged["total_items"] = len(all_snippets)
        return merged

    async def process(self, query: str, plan: List[Dict], chat_id: Optional[str]=None) -> Dict[str, Any]:
        # Ejecuta 7 ramas según plan, pero para diagrama ejecuta tri
        tri = await self.tri_processor(query, plan, chat_id)
        # Ejecuta complementarios
        extras = {}
        if "documents" in [p["tool"] for p in plan]:
            extras["documents"] = await self.documents(query)
        if "notifications" in [p["tool"] for p in plan]:
            extras["notifications"] = await self.notifications({"query": query})
        return {
            "processor": {
                "web_search": "ejecutado" if "web_search" in tri["fuentes"] else "skip",
                "rag": "ejecutado" if "rag" in tri["fuentes"] else "skip",
                "database": "ejecutado" if "database" in tri["fuentes"] else "skip",
                "documents": extras.get("documents", "skip"),
                "external_apis": "ejecutado" if "external_apis" in tri["fuentes"] else "skip",
                "notifications": extras.get("notifications", "skip"),
                "workflows": "skip",
            },
            "tri_result": tri,
            "resultados": tri,
            "next": "PROCESSOR RESULT",
        }
