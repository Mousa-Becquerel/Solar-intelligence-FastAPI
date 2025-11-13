"""
End-to-End Authentication Testing Script
Tests registration, login, token refresh, and protected endpoints
"""
import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

# Test colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_success(message):
    print(f"{GREEN}✓ {message}{RESET}")

def print_error(message):
    print(f"{RED}✗ {message}{RESET}")

def print_info(message):
    print(f"{BLUE}ℹ {message}{RESET}")

def print_warning(message):
    print(f"{YELLOW}⚠ {message}{RESET}")

def print_section(title):
    print(f"\n{BLUE}{'=' * 60}")
    print(f"{title}")
    print(f"{'=' * 60}{RESET}\n")


class AuthTester:
    def __init__(self):
        self.access_token = None
        self.refresh_token = None
        self.user_id = None
        self.test_email = f"test_user_{int(time.time())}@example.com"
        self.test_password = "TestPassword123!"
        self.results = {
            "passed": 0,
            "failed": 0,
            "warnings": 0
        }

    def test_health_check(self):
        """Test 0: Health Check"""
        print_section("Test 0: Health Check")
        try:
            response = requests.get(f"{BASE_URL}/health/status")
            if response.status_code == 200:
                data = response.json()
                print_success(f"Health check passed: {json.dumps(data, indent=2)}")
                self.results["passed"] += 1
                return True
            else:
                print_error(f"Health check failed: {response.status_code}")
                self.results["failed"] += 1
                return False
        except Exception as e:
            print_error(f"Health check error: {str(e)}")
            self.results["failed"] += 1
            return False

    def test_registration(self):
        """Test 1: User Registration"""
        print_section("Test 1: User Registration")

        payload = {
            "first_name": "Test",
            "last_name": "User",
            "email": self.test_email,
            "password": self.test_password,
            "job_title": "QA Engineer",
            "company_name": "Test Company",
            "country": "United States",
            "company_size": "1-10",
            "terms_agreement": True,
            "communications": False
        }

        try:
            response = requests.post(f"{BASE_URL}/auth/register", json=payload)
            print_info(f"Status Code: {response.status_code}")

            if response.status_code == 201:
                data = response.json()
                print_success("User registered successfully")
                print_info(f"User ID: {data.get('user', {}).get('id')}")
                print_info(f"Email: {data.get('user', {}).get('email')}")

                # Store tokens
                self.access_token = data.get('access_token')
                self.refresh_token = data.get('refresh_token')
                self.user_id = data.get('user', {}).get('id')

                if self.access_token and self.refresh_token:
                    print_success("Tokens received")
                    self.results["passed"] += 1
                    return True
                else:
                    print_warning("Tokens not received in registration response")
                    self.results["warnings"] += 1
                    return True

            elif response.status_code == 400:
                error = response.json()
                print_error(f"Registration failed: {error.get('detail')}")
                self.results["failed"] += 1
                return False
            else:
                print_error(f"Unexpected status code: {response.status_code}")
                print_error(f"Response: {response.text}")
                self.results["failed"] += 1
                return False

        except Exception as e:
            print_error(f"Registration error: {str(e)}")
            self.results["failed"] += 1
            return False

    def test_login(self):
        """Test 2: User Login"""
        print_section("Test 2: User Login")

        payload = {
            "username": self.test_email,  # OAuth2 uses 'username' field
            "password": self.test_password
        }

        try:
            # OAuth2 expects form data, not JSON
            response = requests.post(
                f"{BASE_URL}/auth/login",
                data=payload,  # Use data instead of json
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )

            print_info(f"Status Code: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print_success("Login successful")

                # Update tokens
                self.access_token = data.get('access_token')
                self.refresh_token = data.get('refresh_token')

                print_info(f"Access token: {self.access_token[:20]}...")
                print_info(f"Refresh token: {self.refresh_token[:20] if self.refresh_token else 'None'}...")
                print_info(f"Token type: {data.get('token_type')}")

                self.results["passed"] += 1
                return True
            else:
                print_error(f"Login failed: {response.status_code}")
                print_error(f"Response: {response.text}")
                self.results["failed"] += 1
                return False

        except Exception as e:
            print_error(f"Login error: {str(e)}")
            self.results["failed"] += 1
            return False

    def test_get_current_user(self):
        """Test 3: Get Current User (Protected Endpoint)"""
        print_section("Test 3: Get Current User (Protected Endpoint)")

        if not self.access_token:
            print_error("No access token available. Skipping test.")
            self.results["failed"] += 1
            return False

        try:
            headers = {"Authorization": f"Bearer {self.access_token}"}
            response = requests.get(f"{BASE_URL}/auth/me", headers=headers)

            print_info(f"Status Code: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print_success("Retrieved current user")
                print_info(f"User ID: {data.get('id')}")
                print_info(f"Email: {data.get('email')}")
                print_info(f"Plan: {data.get('plan', 'free')}")
                self.results["passed"] += 1
                return True
            elif response.status_code == 401:
                print_error("Unauthorized - token may be invalid")
                self.results["failed"] += 1
                return False
            else:
                print_error(f"Unexpected status code: {response.status_code}")
                print_error(f"Response: {response.text}")
                self.results["failed"] += 1
                return False

        except Exception as e:
            print_error(f"Get current user error: {str(e)}")
            self.results["failed"] += 1
            return False

    def test_refresh_token(self):
        """Test 4: Token Refresh"""
        print_section("Test 4: Token Refresh")

        if not self.refresh_token:
            print_warning("No refresh token available. Skipping test.")
            self.results["warnings"] += 1
            return False

        try:
            payload = {"refresh_token": self.refresh_token}
            response = requests.post(f"{BASE_URL}/auth/refresh", json=payload)

            print_info(f"Status Code: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print_success("Token refreshed successfully")

                # Update access token
                old_token = self.access_token
                self.access_token = data.get('access_token')

                print_info(f"Old token: {old_token[:20] if old_token else 'None'}...")
                print_info(f"New token: {self.access_token[:20]}...")

                # Test new token works
                headers = {"Authorization": f"Bearer {self.access_token}"}
                test_response = requests.get(f"{BASE_URL}/auth/me", headers=headers)

                if test_response.status_code == 200:
                    print_success("New token validated successfully")
                    self.results["passed"] += 1
                    return True
                else:
                    print_error("New token validation failed")
                    self.results["failed"] += 1
                    return False

            else:
                print_error(f"Token refresh failed: {response.status_code}")
                print_error(f"Response: {response.text}")
                self.results["failed"] += 1
                return False

        except Exception as e:
            print_error(f"Token refresh error: {str(e)}")
            self.results["failed"] += 1
            return False

    def test_protected_endpoint_without_token(self):
        """Test 5: Protected Endpoint Without Token"""
        print_section("Test 5: Protected Endpoint Without Token (Should Fail)")

        try:
            response = requests.get(f"{BASE_URL}/auth/me")

            print_info(f"Status Code: {response.status_code}")

            if response.status_code == 401:
                print_success("Correctly rejected request without token")
                self.results["passed"] += 1
                return True
            else:
                print_error(f"Expected 401, got {response.status_code}")
                print_warning("Security issue: Protected endpoint accessible without token!")
                self.results["failed"] += 1
                return False

        except Exception as e:
            print_error(f"Test error: {str(e)}")
            self.results["failed"] += 1
            return False

    def test_protected_endpoint_with_invalid_token(self):
        """Test 6: Protected Endpoint With Invalid Token"""
        print_section("Test 6: Protected Endpoint With Invalid Token (Should Fail)")

        try:
            headers = {"Authorization": "Bearer invalid_token_12345"}
            response = requests.get(f"{BASE_URL}/auth/me", headers=headers)

            print_info(f"Status Code: {response.status_code}")

            if response.status_code == 401:
                print_success("Correctly rejected request with invalid token")
                self.results["passed"] += 1
                return True
            else:
                print_error(f"Expected 401, got {response.status_code}")
                print_warning("Security issue: Protected endpoint accessible with invalid token!")
                self.results["failed"] += 1
                return False

        except Exception as e:
            print_error(f"Test error: {str(e)}")
            self.results["failed"] += 1
            return False

    def test_user_profile(self):
        """Test 7: Get User Profile"""
        print_section("Test 7: Get User Profile")

        if not self.access_token:
            print_error("No access token available. Skipping test.")
            self.results["failed"] += 1
            return False

        try:
            headers = {"Authorization": f"Bearer {self.access_token}"}
            response = requests.get(f"{BASE_URL}/profile", headers=headers)

            print_info(f"Status Code: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print_success("Retrieved user profile")
                print_info(f"Profile: {json.dumps(data, indent=2)}")
                self.results["passed"] += 1
                return True
            else:
                print_error(f"Profile fetch failed: {response.status_code}")
                print_error(f"Response: {response.text}")
                self.results["failed"] += 1
                return False

        except Exception as e:
            print_error(f"Profile fetch error: {str(e)}")
            self.results["failed"] += 1
            return False

    def test_logout(self):
        """Test 8: User Logout"""
        print_section("Test 8: User Logout")

        if not self.access_token:
            print_error("No access token available. Skipping test.")
            self.results["failed"] += 1
            return False

        try:
            headers = {"Authorization": f"Bearer {self.access_token}"}
            response = requests.post(f"{BASE_URL}/auth/logout", headers=headers)

            print_info(f"Status Code: {response.status_code}")

            if response.status_code == 200:
                print_success("Logout successful")

                # Test that token is invalidated
                test_response = requests.get(f"{BASE_URL}/auth/me", headers=headers)

                if test_response.status_code == 401:
                    print_success("Token correctly invalidated after logout")
                    self.results["passed"] += 1
                    return True
                else:
                    print_warning("Token still valid after logout - may be expected behavior")
                    self.results["warnings"] += 1
                    return True

            else:
                print_error(f"Logout failed: {response.status_code}")
                print_error(f"Response: {response.text}")
                self.results["failed"] += 1
                return False

        except Exception as e:
            print_error(f"Logout error: {str(e)}")
            self.results["failed"] += 1
            return False

    def print_summary(self):
        """Print test summary"""
        print_section("Test Summary")

        total = self.results["passed"] + self.results["failed"]

        print(f"{GREEN}Passed: {self.results['passed']}{RESET}")
        print(f"{RED}Failed: {self.results['failed']}{RESET}")
        print(f"{YELLOW}Warnings: {self.results['warnings']}{RESET}")
        print(f"Total: {total}")

        if self.results["failed"] == 0:
            print_success("\nAll authentication tests passed!")
        else:
            print_error(f"\n{self.results['failed']} test(s) failed")

        return self.results["failed"] == 0

    def run_all_tests(self):
        """Run all authentication tests"""
        print(f"\n{BLUE}{'=' * 60}")
        print(f"Authentication End-to-End Testing")
        print(f"{'=' * 60}{RESET}")
        print_info(f"Base URL: {BASE_URL}")
        print_info(f"Test Email: {self.test_email}")
        print_info(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        # Run tests in sequence
        self.test_health_check()
        self.test_registration()
        self.test_login()
        self.test_get_current_user()
        self.test_refresh_token()
        self.test_protected_endpoint_without_token()
        self.test_protected_endpoint_with_invalid_token()
        self.test_user_profile()
        self.test_logout()

        # Print summary
        return self.print_summary()


if __name__ == "__main__":
    tester = AuthTester()
    success = tester.run_all_tests()

    # Exit with appropriate code
    exit(0 if success else 1)
