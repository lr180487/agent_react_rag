
"""
analyzer_service.py — ANALYZER con 10 pasos exactos del diagrama
├── interpretar intención
├── clasificar solicitud
├── extraer entidades
├── analizar contexto
├── consultar memoria necesaria
├── detectar necesidad de Web Search
├── detectar necesidad de RAG
├── seleccionar herramientas
├── evaluar riesgo
└── generar plan
"""
from typing import Dict, Any, List, Optional
import re
from datetime import datetime

class AnalyzerService:
    """10 pasos secuenciales, cada uno trazable y testeable"""

    def interpretar_intencion(self, text: str) -> Dict[str, Any]:
        t = text.lower()
        if any(k in t for k in ["analiza", "resume", "resumen", "sintetiza"]):
            intent = "analisis"
        elif any(k in t for k in ["busca", "search", "encuentra", "investiga"]):
            intent = "busqueda"
        elif any(k in t for k in ["compara", "diferencia"]):
            intent = "comparacion"
        elif any(k in t for k in ["crea", "genera", "escribe"]):
            intent = "generacion"
        else:
            intent = "consulta"
        return {"intent_raw": intent, "confidence": 0.92, "text": text[:200]}

    def clasificar_solicitud(self, text: str, intencion: Dict) -> Dict[str, Any]:
        intent = intencion["intent_raw"]
        # prioridad y tipo
        tipo = "informativa" if intent in ["busqueda","consulta"] else "transformativa"
        prioridad = "alta" if any(k in text.lower() for k in ["urgente","ahora","inmediato"]) else "media"
        return {"tipo": tipo, "categoria": intent, "prioridad": prioridad}

    def extraer_entidades(self, text: str) -> Dict[str, Any]:
        # NER ligero regex
        entidades = {
            "fechas": re.findall(r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}", text),
            "emails": re.findall(r"[\w\.-]+@[\w\.-]+", text),
            "numeros": re.findall(r"\b\d+[.,]?\d*\b", text),
            "keywords": [w for w in text.split() if len(w)>4][:8],
        }
        return entidades

    def analizar_contexto(self, text: str, chat_id: Optional[str]=None, history: List[Dict]=None) -> Dict[str, Any]:
        history = history or []
        return {
            "chat_id": chat_id,
            "historial_len": len(history),
            "contexto": "con_historial" if history else "sin_historial",
            "ventana": history[-3:] if len(history)>3 else history,
        }

    def consultar_memoria_necesaria(self, text: str, contexto: Dict) -> Dict[str, Any]:
        # decide si necesita memoria corta/larga
        necesita_memoria = len(contexto.get("ventana",[]))>0 or "recuerda" in text.lower()
        return {
            "necesita_memoria": necesita_memoria,
            "tipo_memoria": "corto_plazo" if necesita_memoria else "ninguna",
            "fuente": "chat_memory" if necesita_memoria else None,
        }

    def detectar_necesidad_web_search(self, text: str, intencion: Dict) -> Dict[str, Any]:
        keywords = ["busca","internet","actual","precio","noticia","web","search","último","reciente"]
        necesita = any(k in text.lower() for k in keywords) or intencion["intent_raw"]=="busqueda"
        return {"necesita_web_search": necesita, "razon": "keywords" if necesita else "no_requiere", "provider": "tavily/serpapi" if necesita else None}

    def detectar_necesidad_rag(self, text: str, contexto: Dict) -> Dict[str, Any]:
        keywords = ["documento","pdf","contrato","analiza","resume","extrae","rag","conocimiento"]
        necesita = any(k in text.lower() for k in keywords)
        return {"necesita_rag": necesita, "razon": "document_context" if necesita else "no_requiere", "store": "pgvector" if necesita else None}

    def seleccionar_herramientas(self, web: Dict, rag: Dict, memoria: Dict) -> Dict[str, Any]:
        tools = []
        if web["necesita_web_search"]: tools.append("web_search")
        if rag["necesita_rag"]: tools.append("rag")
        if memoria["necesita_memoria"]: tools.append("memory")
        # siempre disponibles
        base = ["database","documents","external_apis","notifications","workflows"]
        # filtra por necesidad minima
        seleccion = tools + (["database"] if "analiza" in str(tools) else [])
        return {"herramientas": tools, "base_disponibles": base, "seleccion_final": seleccion or ["database"]}

    def evaluar_riesgo(self, text: str, herramientas: Dict) -> Dict[str, Any]:
        riesgos = []
        if len(text) > 2000: riesgos.append("input_largo")
        if "external_apis" in herramientas.get("seleccion_final",[]): riesgos.append("llamada_externa")
        nivel = "alto" if "llamada_externa" in riesgos else "medio" if riesgos else "bajo"
        return {"nivel": nivel, "factores": riesgos, "requiere_confirmacion": nivel=="alto"}

    def generar_plan(self, intencion: Dict, clasificacion: Dict, herramientas: Dict, riesgo: Dict) -> Dict[str, Any]:
        pasos = []
        if "web_search" in herramientas["herramientas"]:
            pasos.append({"tool": "web_search", "input": "query"})
        if "rag" in herramientas["herramientas"]:
            pasos.append({"tool": "rag", "input": "query+filters"})
        if not pasos:
            pasos.append({"tool": "database", "input": "query"})
        # siempre termina en external_api si hay riesgo bajo y herramientas seleccionadas
        return {
            "plan": pasos,
            "orden": [p["tool"] for p in pasos],
            "riesgo": riesgo["nivel"],
            "siguiente": "PROCESSOR",
            "timestamp": datetime.utcnow().isoformat(),
            "resumen": f"{intencion['intent_raw']} → {clasificacion['tipo']} → {len(pasos)} herramientas"
        }

    # --- Orquestador 10 pasos ---
    def analyze(self, text: str, chat_id: Optional[str]=None, history: List[Dict]=None) -> Dict[str, Any]:
        p1 = self.interpretar_intencion(text)
        p2 = self.clasificar_solicitud(text, p1)
        p3 = self.extraer_entidades(text)
        p4 = self.analizar_contexto(text, chat_id, history)
        p5 = self.consultar_memoria_necesaria(text, p4)
        p6 = self.detectar_necesidad_web_search(text, p1)
        p7 = self.detectar_necesidad_rag(text, p4)
        p8 = self.seleccionar_herramientas(p6, p7, p5)
        p9 = self.evaluar_riesgo(text, p8)
        p10 = self.generar_plan(p1, p2, p8, p9)
        return {
            "analyzer": {
                "interpretar_intencion": p1,
                "clasificar_solicitud": p2,
                "extraer_entidades": p3,
                "analizar_contexto": p4,
                "consultar_memoria_necesaria": p5,
                "detectar_necesidad_web_search": p6,
                "detectar_necesidad_rag": p7,
                "seleccionar_herramientas": p8,
                "evaluar_riesgo": p9,
                "generar_plan": p10,
            },
            "plan": p10["plan"],
            "herramientas": p8["seleccion_final"],
            "necesita_web_search": p6["necesita_web_search"],
            "necesita_rag": p7["necesita_rag"],
            "riesgo": p9["nivel"],
        }
