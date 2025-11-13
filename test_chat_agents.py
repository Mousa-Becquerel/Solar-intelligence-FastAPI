"""
Chat & Agent Streaming Tests
Tests chat streaming with all 6 agents and conversation persistence
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
    print(f"{GREEN}[OK] {message}{RESET}")

def print_error(message):
    print(f"{RED}[FAIL] {message}{RESET}")

def print_info(message):
    print(f"{BLUE}[INFO] {message}{RESET}")

def print_warning(message):
    print(f"{YELLOW}[WARN] {message}{RESET}")

def print_section(title):
    print(f"\n{BLUE}{'=' * 70}")
    print(f"{title}")
    print(f"{'=' * 70}{RESET}\n")


class ChatAgentTester:
    def __init__(self):
        self.access_token = None
        self.user_id = None
        self.test_email = f"agent_test_{int(time.time())}@example.com"
        self.test_password = "AgentTest123!"
        self.conversation_ids = {}
        self.results = {
            "passed": 0,
            "failed": 0,
            "warnings": 0
        }

        # Agent configurations
        self.agents = [
            {"type": "market", "name": "Market Intelligence", "prompt": "What are the latest PV trends?"},
            {"type": "news", "name": "News Agent", "prompt": "Latest solar industry news?"},
            {"type": "digitalization", "name": "Digitalization", "prompt": "Digital transformation in solar?"},
            {"type": "nzia_policy", "name": "NZIA Policy", "prompt": "NZIA policy overview?"},
            {"type": "manufacturer_financial", "name": "Manufacturer Financial", "prompt": "Top solar manufacturers?"},
            {"type": "nzia_market_impact", "name": "NZIA Market Impact (Premium)", "prompt": "Market impact of NZIA?"},
        ]

    def register_and_login(self):
        """Setup: Register and login user"""
        print_section("Setup: User Registration & Login")

        # Register
        payload = {
            "first_name": "Agent",
            "last_name": "Tester",
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
            if response.status_code == 201:
                print_success("User registered")
            else:
                print_error(f"Registration failed: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Registration error: {e}")
            return False

        # Login
        try:
            login_payload = {
                "username": self.test_email,
                "password": self.test_password
            }
            response = requests.post(
                f"{BASE_URL}/auth/login",
                data=login_payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )

            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get('access_token')
                print_success(f"Login successful, token: {self.access_token[:20]}...")
                return True
            else:
                print_error(f"Login failed: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Login error: {e}")
            return False

    def create_conversation(self, agent_type):
        """Create a new conversation for an agent"""
        try:
            headers = {"Authorization": f"Bearer {self.access_token}"}
            payload = {
                "agent_type": agent_type,
                "title": f"Test conversation for {agent_type}"
            }

            response = requests.post(
                f"{BASE_URL}/conversations/",
                json=payload,
                headers=headers
            )

            if response.status_code == 201:
                data = response.json()
                conv_id = data.get('id')
                print_info(f"Created conversation {conv_id} for {agent_type}")
                return conv_id
            else:
                print_error(f"Failed to create conversation: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            print_error(f"Conversation creation error: {e}")
            return None

    def test_agent_streaming(self, agent_config):
        """Test streaming chat with a specific agent"""
        agent_type = agent_config["type"]
        agent_name = agent_config["name"]
        prompt = agent_config["prompt"]

        print_section(f"Testing: {agent_name} ({agent_type})")

        # Create conversation
        conv_id = self.create_conversation(agent_type)
        if not conv_id:
            print_error(f"Cannot test {agent_name} - conversation creation failed")
            self.results["failed"] += 1
            return False

        # Store conversation ID for later tests
        self.conversation_ids[agent_type] = conv_id

        # Send chat message
        try:
            headers = {"Authorization": f"Bearer {self.access_token}"}
            payload = {
                "message": prompt,
                "conversation_id": conv_id,
                "agent_type": agent_type
            }

            response = requests.post(
                f"{BASE_URL}/chat/send",
                json=payload,
                headers=headers,
                stream=True
            )

            if response.status_code == 200:
                # Check if it's streaming (SSE) or direct response
                content_type = response.headers.get('content-type', '')

                if 'text/event-stream' in content_type:
                    print_info(f"Receiving SSE stream from {agent_name}...")
                    chunks_received = 0
                    full_response = ""

                    for line in response.iter_lines():
                        if line:
                            decoded = line.decode('utf-8')
                            if decoded.startswith('data: '):
                                try:
                                    data = json.loads(decoded[6:])  # Remove 'data: ' prefix
                                    chunks_received += 1

                                    if data.get('type') == 'token':
                                        token = data.get('token', '')
                                        full_response += token
                                    elif data.get('type') == 'done':
                                        print_success(f"{agent_name} streaming completed")
                                        print_info(f"Chunks received: {chunks_received}")
                                        print_info(f"Response length: {len(full_response)} chars")
                                        if full_response:
                                            preview = full_response[:100] + "..." if len(full_response) > 100 else full_response
                                            print_info(f"Preview: {preview}")
                                        break
                                    elif data.get('type') == 'error':
                                        print_error(f"Stream error: {data.get('message')}")
                                        self.results["failed"] += 1
                                        return False
                                except json.JSONDecodeError:
                                    continue

                    if chunks_received > 0:
                        print_success(f"{agent_name} test passed - received {chunks_received} chunks")
                        self.results["passed"] += 1
                        return True
                    else:
                        print_error(f"{agent_name} - no chunks received")
                        self.results["failed"] += 1
                        return False

                else:
                    # Direct JSON response
                    data = response.json()
                    print_info(f"Direct response from {agent_name}")
                    print_info(f"Response: {str(data)[:200]}...")
                    print_success(f"{agent_name} test passed")
                    self.results["passed"] += 1
                    return True

            elif response.status_code == 403:
                # Agent access denied (premium agent)
                error_data = response.json()
                if error_data.get('requires_upgrade'):
                    print_warning(f"{agent_name} requires premium access (expected for premium agents)")
                    self.results["warnings"] += 1
                    return True
                else:
                    print_error(f"{agent_name} access denied: {error_data}")
                    self.results["failed"] += 1
                    return False

            elif response.status_code == 429:
                # Query limit reached
                error_data = response.json()
                print_warning(f"{agent_name} - query limit reached: {error_data}")
                self.results["warnings"] += 1
                return True

            else:
                print_error(f"{agent_name} request failed: {response.status_code} - {response.text}")
                self.results["failed"] += 1
                return False

        except Exception as e:
            print_error(f"{agent_name} test error: {e}")
            self.results["failed"] += 1
            return False

    def test_conversation_persistence(self):
        """Test that conversations are saved and retrievable"""
        print_section("Testing: Conversation Persistence")

        if not self.conversation_ids:
            print_warning("No conversations to test - skipping persistence test")
            self.results["warnings"] += 1
            return False

        try:
            headers = {"Authorization": f"Bearer {self.access_token}"}

            # Get all conversations
            response = requests.get(
                f"{BASE_URL}/conversations",
                headers=headers
            )

            if response.status_code == 200:
                conversations = response.json()
                print_info(f"Retrieved {len(conversations)} conversations")

                # Verify our test conversations exist
                found_count = 0
                for agent_type, conv_id in self.conversation_ids.items():
                    found = any(c.get('id') == conv_id for c in conversations)
                    if found:
                        found_count += 1
                        print_success(f"Found conversation for {agent_type}")
                    else:
                        print_error(f"Conversation for {agent_type} not found!")

                if found_count == len(self.conversation_ids):
                    print_success(f"All {found_count} conversations persisted correctly")
                    self.results["passed"] += 1
                    return True
                else:
                    print_error(f"Only {found_count}/{len(self.conversation_ids)} conversations found")
                    self.results["failed"] += 1
                    return False

            else:
                print_error(f"Failed to retrieve conversations: {response.status_code}")
                self.results["failed"] += 1
                return False

        except Exception as e:
            print_error(f"Persistence test error: {e}")
            self.results["failed"] += 1
            return False

    def test_conversation_messages(self):
        """Test retrieving messages from conversations"""
        print_section("Testing: Message Retrieval")

        if not self.conversation_ids:
            print_warning("No conversations to test - skipping message retrieval test")
            self.results["warnings"] += 1
            return False

        try:
            headers = {"Authorization": f"Bearer {self.access_token}"}

            # Test retrieving messages for first conversation
            agent_type, conv_id = next(iter(self.conversation_ids.items()))

            response = requests.get(
                f"{BASE_URL}/conversations/{conv_id}/messages",
                headers=headers
            )

            if response.status_code == 200:
                messages = response.json()
                print_info(f"Retrieved {len(messages)} messages from conversation {conv_id}")

                # Should have at least user message and agent response
                if len(messages) >= 2:
                    print_success(f"Messages retrieved for {agent_type} conversation")
                    self.results["passed"] += 1
                    return True
                else:
                    print_warning(f"Expected at least 2 messages, got {len(messages)}")
                    self.results["warnings"] += 1
                    return True

            else:
                print_error(f"Failed to retrieve messages: {response.status_code}")
                self.results["failed"] += 1
                return False

        except Exception as e:
            print_error(f"Message retrieval test error: {e}")
            self.results["failed"] += 1
            return False

    def print_summary(self):
        """Print test summary"""
        print_section("Test Summary")

        total = self.results["passed"] + self.results["failed"]
        success_rate = (self.results["passed"] / total * 100) if total > 0 else 0

        print(f"{GREEN}Passed: {self.results['passed']}{RESET}")
        print(f"{RED}Failed: {self.results['failed']}{RESET}")
        print(f"{YELLOW}Warnings: {self.results['warnings']}{RESET}")
        print(f"Total: {total}")
        print(f"Success Rate: {success_rate:.1f}%")

        if self.results["failed"] == 0:
            print_success("\nAll chat and agent tests passed!")
        else:
            print_error(f"\n{self.results['failed']} test(s) failed")

        return self.results["failed"] == 0

    def run_all_tests(self):
        """Run all chat and agent tests"""
        print(f"\n{BLUE}{'=' * 70}")
        print(f"Chat & Agent Streaming Tests")
        print(f"{'=' * 70}{RESET}")
        print_info(f"Base URL: {BASE_URL}")
        print_info(f"Test Email: {self.test_email}")
        print_info(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print_info(f"Testing {len(self.agents)} agents")

        # Setup
        if not self.register_and_login():
            print_error("Setup failed - cannot continue")
            return False

        # Test each agent
        for agent in self.agents:
            self.test_agent_streaming(agent)

        # Test persistence
        self.test_conversation_persistence()
        self.test_conversation_messages()

        # Print summary
        return self.print_summary()


if __name__ == "__main__":
    tester = ChatAgentTester()
    success = tester.run_all_tests()

    # Exit with appropriate code
    exit(0 if success else 1)
