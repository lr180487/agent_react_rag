
"""
response_service.py — RESPONSE con 5 apartados
├── síntesis
├── explicación
├── fuentes
├── recomendaciones
└── acciones propuestas
"""
from typing import Dict, Any, List, Optional

class ResponseService:
    def sintesis(self, resultados: Dict[str, Any], query: str) -> str:
        total = resultados.get("total_items", 0)
        fuentes = ", ".join(resultados.get("fuentes", []))
        return f"Síntesis: analizados {total} fragmentos sobre \"{query[:60]}...\" desde [{fuentes}]. Hallazgo clave: la información converge en respuesta estructurada."

    def explicacion(self, resultados: Dict[str, Any], analyzer: Dict) -> str:
        intent = analyzer.get("analyzer", {}).get("interpretar_intencion", {}).get("intent_raw","consulta")
        return f"Explicación: intención detectada '{intent}'. Se ejecutó plan {analyzer.get('plan',[])} y se integraron resultados con ranking por relevancia."

    def fuentes(self, resultados: Dict[str, Any]) -> List[Dict[str,str]]:
        srcs = []
        for r in resultados.get("resultados", []):
            for item in r.get("results", []) + r.get("chunks", []):
                if "url" in item:
                    srcs.append({"titulo": item.get("title",""), "url": item["url"], "tipo": "web"})
                elif "source" in item:
                    srcs.append({"titulo": item["source"], "url": f"doc://{item.get('id','')}", "tipo": "rag"})
        return srcs[:5] if srcs else [{"titulo": "Interna", "url": "db://historial", "tipo": "database"}]

    def recomendaciones(self, resultados: Dict, riesgo: str) -> List[str]:
        recs = ["Revisar fuentes citadas antes de actuar."]
        if riesgo == "alto":
            recs.append("Confirmar con humano por riesgo alto.")
        if "rag" in str(resultados.get("fuentes",[])):
            recs.append("Validar contra documento original.")
        recs.append("Iterar con pregunta más específica si falta detalle.")
        return recs

    def acciones_propuestas(self, resultados: Dict, analyzer: Dict) -> List[Dict[str,str]]:
        plan = analyzer.get("plan", [])
        acciones = [{"accion": "responder", "detalle": "Entregar síntesis al usuario"}]
        if any(p.get("tool")=="web_search" for p in plan):
            acciones.append({"accion": "notificar", "detalle": "Enviar alerta WebSocket"})
        if analyzer.get("riesgo")=="alto":
            acciones.append({"accion": "workflow", "detalle": "Disparar flujo de aprobación"})
        return acciones

    def build(self, query: str, analyzer: Dict, processor: Dict) -> Dict[str, Any]:
        resultados = processor.get("tri_result") or processor.get("resultados") or {}
        riesgo = analyzer.get("riesgo","bajo")
        return {
            "response": {
                "sintesis": self.sintesis(resultados, query),
                "explicacion": self.explicacion(resultados, analyzer),
                "fuentes": self.fuentes(resultados),
                "recomendaciones": self.recomendaciones(resultados, riesgo),
                "acciones_propuestas": self.acciones_propuestas(resultados, analyzer),
            },
            "resultados": resultados,
            "next": "USER",
            "channel": "WebSocket / Frontend"
        }
