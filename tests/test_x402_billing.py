import pytest
import os
import time
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch

# Set env vars to enable payment enforcement and use a test wallet address
os.environ["RAKSHASTRA_X402_ENABLED"] = "1"
os.environ["RAKSHASTRA_TESTING"] = "1"

# We must import after setting env vars so middleware reads them correctly
from rakshastra_cli.web_server import app
from rakshastra_state import SessionDB

# Configure a valid Algorand address format for recipient address in payments config mock
VALID_RECIPIENT_WALLET = "RAKSHASTRAFIVEEIGHTCHARACTERSADDRESSFORTESTINGPURPOSES2345"

@pytest.fixture(autouse=True)
def setup_test_config():
    """Mock the config loader to return a valid recipient wallet address."""
    with patch("rakshastra_cli.web_server.load_x402_config") as mock_load:
        mock_load.return_value = {
            "provider": "algorand",
            "network": "testnet",
            "price_per_request_algo": 0.05,
            "recipient_wallet_address": VALID_RECIPIENT_WALLET,
            "protected_endpoints": [
                "/api/v1/threat/analyze-text",
                "/api/v1/entity/correlate",
                "/api/v1/report/generate"
            ]
        }
        # Clean the verified transactions table before every test
        db = SessionDB()
        def clean_db(conn):
            conn.execute("DELETE FROM verified_x402_txs")
        db._execute_write(clean_db)
        yield

@pytest.fixture
def client():
    return TestClient(app)

def test_x402_missing_header(client):
    """Verify that requests to protected endpoints fail with 402 if header is missing."""
    response = client.post("/api/v1/threat/analyze-text", json={"text": "MDMA stuff"})
    assert response.status_code == 402
    assert "X-Algorand-Tx header missing" in response.json()["detail"]

def test_x402_mock_transaction_success(client):
    """Verify that a valid mock transaction ID bypasses indexer query and returns 200."""
    headers = {"X-Algorand-Tx": "MOCK_TX_SUCCESS_12345"}
    payload = {
        "text": "need party stamps for weekend dm for MDMA rates",
        "has_image": True,
        "ocr_text": "contact telegram @DirectMedsExpress"
    }
    response = client.post("/api/v1/threat/analyze-text", json=payload, headers=headers)
    assert response.status_code == 200
    assert "drug_probability_score" in response.json()

def test_x402_replay_prevention(client):
    """Verify that using the same transaction ID twice returns 403 Forbidden."""
    headers = {"X-Algorand-Tx": "MOCK_TX_REPLAY_9999"}
    payload = {"text": "MDMA stuff"}
    
    # First request should succeed (using valid mock bypass)
    response1 = client.post("/api/v1/threat/analyze-text", json=payload, headers=headers)
    assert response1.status_code == 200
    
    # Second request with same tx_id should fail with 403
    response2 = client.post("/api/v1/threat/analyze-text", json=payload, headers=headers)
    assert response2.status_code == 403
    assert "Replay Attack Detected" in response2.json()["detail"]

@patch("httpx.AsyncClient.get", new_callable=AsyncMock)
def test_x402_live_indexer_success(mock_get, client):
    """Mock the live indexer response and verify a successful confirmed transaction flow."""
    mock_tx_id = "REAL_TX_ID_1111111111111111111111111111111111111111111"
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "transaction": {
            "id": mock_tx_id,
            "type": "pay",
            "payment-transaction": {
                "receiver": VALID_RECIPIENT_WALLET,
                "amount": 50000  # 0.05 ALGO
            },
            "round-time": int(time.time()),
            "sender": "SENDER_WALLET_ADDRESS_12345"
        }
    }
    mock_get.return_value = mock_response

    headers = {"X-Algorand-Tx": mock_tx_id}
    payload = {"text": "MDMA stuff"}
    
    response = client.post("/api/v1/threat/analyze-text", json=payload, headers=headers)
    assert response.status_code == 200
    assert "drug_probability_score" in response.json()

@patch("httpx.AsyncClient.get", new_callable=AsyncMock)
def test_x402_indexer_insufficient_fee(mock_get, client):
    """Verify 402 error is returned if transaction paid amount is less than expected fee."""
    mock_tx_id = "REAL_TX_ID_INSUFFICIENT"
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "transaction": {
            "id": mock_tx_id,
            "type": "pay",
            "payment-transaction": {
                "receiver": VALID_RECIPIENT_WALLET,
                "amount": 40000  # Requires 50000 microAlgos
            },
            "round-time": int(time.time()),
            "sender": "SENDER_WALLET_ADDRESS_12345"
        }
    }
    mock_get.return_value = mock_response

    headers = {"X-Algorand-Tx": mock_tx_id}
    payload = {"text": "MDMA stuff"}
    
    response = client.post("/api/v1/threat/analyze-text", json=payload, headers=headers)
    assert response.status_code == 402
    assert "Insufficient fee" in response.json()["detail"]

@patch("httpx.AsyncClient.get", new_callable=AsyncMock)
def test_x402_indexer_recipient_mismatch(mock_get, client):
    """Verify 402 error is returned if receiver wallet address is incorrect."""
    mock_tx_id = "REAL_TX_ID_MISMATCH"
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "transaction": {
            "id": mock_tx_id,
            "type": "pay",
            "payment-transaction": {
                "receiver": "WRONGRECIPIENTFIVEEIGHTCHARACTERSADDRESSFORTESTINGPURP2345",
                "amount": 50000
            },
            "round-time": int(time.time()),
            "sender": "SENDER_WALLET_ADDRESS_12345"
        }
    }
    mock_get.return_value = mock_response

    headers = {"X-Algorand-Tx": mock_tx_id}
    payload = {"text": "MDMA stuff"}
    
    response = client.post("/api/v1/threat/analyze-text", json=payload, headers=headers)
    assert response.status_code == 402
    assert "Recipient wallet address mismatch" in response.json()["detail"]

@patch("httpx.AsyncClient.get", new_callable=AsyncMock)
def test_x402_indexer_old_transaction(mock_get, client):
    """Verify 402 error is returned if transaction timestamp is older than 2 hours."""
    mock_tx_id = "REAL_TX_ID_OLD"
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "transaction": {
            "id": mock_tx_id,
            "type": "pay",
            "payment-transaction": {
                "receiver": VALID_RECIPIENT_WALLET,
                "amount": 50000
            },
            # 3 hours ago (10800 seconds)
            "round-time": int(time.time()) - 10800,
            "sender": "SENDER_WALLET_ADDRESS_12345"
        }
    }
    mock_get.return_value = mock_response

    headers = {"X-Algorand-Tx": mock_tx_id}
    payload = {"text": "MDMA stuff"}
    
    response = client.post("/api/v1/threat/analyze-text", json=payload, headers=headers)
    assert response.status_code == 402
    assert "Transaction timestamp is older than 2 hours" in response.json()["detail"]
