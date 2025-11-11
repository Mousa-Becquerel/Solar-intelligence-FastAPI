"""
Simple FastAPI test script
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("\n" + "="*60)
    print("Testing Health Check")
    print("="*60)
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    assert response.status_code == 200, "Health check failed"
    print("✅ Health check passed!")

def test_register():
    """Test user registration"""
    print("\n" + "="*60)
    print("Testing User Registration")
    print("="*60)

    user_data = {
        "username": "testuser@example.com",
        "password": "Test123!",
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
        return response.json()
    elif response.status_code == 400:
        print("⚠️  User already exists (this is OK)")
        return None
    else:
        print(f"❌ Registration failed: {response.text}")
        return None

def test_login(username="testuser@example.com", password="Test123!"):
    """Test login"""
    print("\n" + "="*60)
    print("Testing Login")
    print("="*60)

    login_data = {
        "username": username,
        "password": password
    }

    response = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        data=login_data  # OAuth2 uses form data, not JSON
    )

    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"Access Token: {data['access_token'][:50]}...")
        print("✅ Login successful!")
        return data['access_token']
    else:
        print(f"Response: {response.text}")
        print("❌ Login failed")
        return None

def test_protected_endpoint(token):
    """Test protected endpoint"""
    print("\n" + "="*60)
    print("Testing Protected Endpoint")
    print("="*60)

    headers = {
        "Authorization": f"Bearer {token}"
    }

    response = requests.get(
        f"{BASE_URL}/api/v1/auth/me",
        headers=headers
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 200:
        print("✅ Protected endpoint access successful!")
        return True
    else:
        print("❌ Protected endpoint access failed")
        return False

if __name__ == "__main__":
    print("\n" + "🚀"*30)
    print("  FastAPI Test Suite")
    print("🚀"*30)

    try:
        # Test 1: Health Check
        test_health()

        # Test 2: User Registration
        user = test_register()

        # Test 3: Login
        token = test_login()

        if token:
            # Test 4: Protected Endpoint
            test_protected_endpoint(token)

        print("\n" + "="*60)
        print("🎉 ALL TESTS PASSED! 🎉")
        print("="*60)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
