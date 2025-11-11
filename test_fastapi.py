"""
Quick test script for FastAPI endpoints
Run this to verify the FastAPI app is working correctly
"""
import requests
import json
from typing import Optional

BASE_URL = "http://localhost:8000"


def print_section(title: str):
    """Print a formatted section header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def test_health_check():
    """Test the health check endpoint"""
    print_section("Testing Health Check")

    response = requests.get(f"{BASE_URL}/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    print("✅ Health check passed!")


def test_root_endpoint():
    """Test the root endpoint"""
    print_section("Testing Root Endpoint")

    response = requests.get(f"{BASE_URL}/")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    assert response.status_code == 200
    print("✅ Root endpoint passed!")


def test_user_registration():
    """Test user registration"""
    print_section("Testing User Registration")

    user_data = {
        "username": "test@example.com",
        "password": "TestPass123!",
        "full_name": "Test User"
    }

    response = requests.post(
        f"{BASE_URL}/api/v1/auth/register",
        json=user_data
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 201:
        print("✅ User registration successful!")
        return user_data
    elif response.status_code == 400 and "already registered" in response.json().get("detail", ""):
        print("⚠️  User already exists (this is okay for testing)")
        return user_data
    else:
        raise Exception(f"Registration failed: {response.json()}")


def test_user_login(username: str, password: str) -> Optional[str]:
    """Test user login and get JWT token"""
    print_section("Testing User Login")

    login_data = {
        "username": username,
        "password": password
    }

    response = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        data=login_data  # OAuth2 expects form data
    )

    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        token_data = response.json()
        print(f"Token Type: {token_data['token_type']}")
        print(f"Access Token: {token_data['access_token'][:50]}...")
        print("✅ Login successful!")
        return token_data["access_token"]
    else:
        print(f"❌ Login failed: {response.json()}")
        return None


def test_protected_endpoint(token: str):
    """Test accessing protected endpoint with JWT token"""
    print_section("Testing Protected Endpoint (Get Current User)")

    headers = {
        "Authorization": f"Bearer {token}"
    }

    response = requests.get(
        f"{BASE_URL}/api/v1/auth/me",
        headers=headers
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    assert response.status_code == 200
    assert "username" in response.json()
    print("✅ Protected endpoint access successful!")


def test_agents_endpoint(token: str):
    """Test agents endpoint"""
    print_section("Testing Agents Endpoint")

    headers = {
        "Authorization": f"Bearer {token}"
    }

    response = requests.get(
        f"{BASE_URL}/api/v1/agents/available",
        headers=headers
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    assert response.status_code == 200
    print("✅ Agents endpoint working!")


def test_query_endpoint(token: str):
    """Test query endpoint (placeholder)"""
    print_section("Testing Query Endpoint")

    headers = {
        "Authorization": f"Bearer {token}"
    }

    query_data = {
        "query": "What is the PV market size in Europe?",
        "agent_type": "market"
    }

    response = requests.post(
        f"{BASE_URL}/api/v1/chat/query",
        headers=headers,
        json=query_data
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    assert response.status_code == 200
    print("✅ Query endpoint working!")


def run_all_tests():
    """Run all tests in sequence"""
    print("\n" + "🚀" * 30)
    print("  FastAPI Test Suite")
    print("🚀" * 30)

    try:
        # Test public endpoints
        test_health_check()
        test_root_endpoint()

        # Test authentication
        user_data = test_user_registration()
        token = test_user_login(user_data["username"], user_data["password"])

        if token:
            # Test protected endpoints
            test_protected_endpoint(token)
            test_agents_endpoint(token)
            test_query_endpoint(token)

        print("\n" + "=" * 60)
        print("  🎉 ALL TESTS PASSED! 🎉")
        print("=" * 60)
        print("\nFastAPI is running correctly!")
        print(f"Swagger UI: {BASE_URL}/docs")
        print(f"ReDoc: {BASE_URL}/redoc")

    except Exception as e:
        print("\n" + "=" * 60)
        print("  ❌ TEST FAILED")
        print("=" * 60)
        print(f"\nError: {str(e)}")
        print("\nTroubleshooting:")
        print("1. Ensure FastAPI is running: docker-compose -f docker-compose.fastapi.yml up")
        print("2. Check logs: docker-compose -f docker-compose.fastapi.yml logs fastapi-app")
        print("3. Verify port 8000 is accessible")


if __name__ == "__main__":
    run_all_tests()
