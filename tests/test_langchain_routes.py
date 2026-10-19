from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_langchain_status_reports_dependency_and_configuration():
    response = client.get("/api/langchain/status")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "has_langchain" in body
    assert "ready" in body["langchain"]
    assert "api_key_configured" in body["langchain"]


def test_langchain_status_versioned_alias():
    response = client.get("/api/v1/langchain/status")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_invoke_requires_nonempty_text():
    response = client.post("/api/langchain/invoke", json={"text": ""})
    assert response.status_code == 422
