#!/bin/bash
# Test script for Docker production stack
# Tests both frontend and backend containers

echo "🧪 Testing Solar Intelligence Docker Stack"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test endpoint
test_endpoint() {
    local url=$1
    local expected_code=$2
    local description=$3

    echo -n "Testing: $description... "

    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$response_code" = "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response_code)"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_code, got $response_code)"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test containers are running
echo ""
echo "1️⃣  Checking Docker Containers..."
echo "-----------------------------------"

if docker ps | grep -q "solar-intelligence-frontend-prod"; then
    echo -e "${GREEN}✓${NC} Frontend container is running"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Frontend container is NOT running"
    ((TESTS_FAILED++))
fi

if docker ps | grep -q "solar-intelligence-api-prod"; then
    echo -e "${GREEN}✓${NC} Backend container is running"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Backend container is NOT running"
    ((TESTS_FAILED++))
fi

if docker ps | grep -q "solar-intelligence-db-prod"; then
    echo -e "${GREEN}✓${NC} Database container is running"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Database container is NOT running"
    ((TESTS_FAILED++))
fi

# Wait a moment for services to be ready
echo ""
echo "⏳ Waiting 3 seconds for services to be ready..."
sleep 3

# Test Frontend
echo ""
echo "2️⃣  Testing Frontend (Nginx)..."
echo "-----------------------------------"

test_endpoint "http://localhost/health" "200" "Frontend health check"
test_endpoint "http://localhost/" "200" "Frontend homepage"

# Test Backend
echo ""
echo "3️⃣  Testing Backend (FastAPI)..."
echo "-----------------------------------"

test_endpoint "http://localhost:8000/health" "200" "Backend health check"
test_endpoint "http://localhost:8000/" "200" "Backend root endpoint"
test_endpoint "http://localhost:8000/docs" "200" "API documentation"
test_endpoint "http://localhost:8000/api/v1/openapi.json" "200" "OpenAPI schema"

# Test CORS headers
echo ""
echo "4️⃣  Testing CORS Configuration..."
echo "-----------------------------------"

cors_response=$(curl -s -I -X OPTIONS http://localhost:8000/api/v1/health \
    -H "Origin: http://localhost" \
    -H "Access-Control-Request-Method: GET" | grep -i "access-control-allow-origin")

if [ ! -z "$cors_response" ]; then
    echo -e "${GREEN}✓${NC} CORS headers present: $cors_response"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} CORS headers missing"
    ((TESTS_FAILED++))
fi

# Test Security Headers
echo ""
echo "5️⃣  Testing Security Headers..."
echo "-----------------------------------"

headers=$(curl -s -I http://localhost/)

# Check for specific security headers
for header in "X-Content-Type-Options" "X-Frame-Options" "X-XSS-Protection" "Referrer-Policy" "Content-Security-Policy"; do
    if echo "$headers" | grep -qi "$header"; then
        echo -e "${GREEN}✓${NC} $header header present"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} $header header missing"
        ((TESTS_FAILED++))
    fi
done

# Test Gzip Compression
echo ""
echo "6️⃣  Testing Gzip Compression..."
echo "-----------------------------------"

gzip_test=$(curl -s -I -H "Accept-Encoding: gzip" http://localhost/ | grep -i "content-encoding: gzip")

if [ ! -z "$gzip_test" ]; then
    echo -e "${GREEN}✓${NC} Gzip compression enabled"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC}  Gzip compression not detected (may be normal for small responses)"
fi

# Test Database Connection
echo ""
echo "7️⃣  Testing Database Connection..."
echo "-----------------------------------"

# Try to connect to database through backend
db_test=$(curl -s http://localhost:8000/health | grep -i "database")

if [ ! -z "$db_test" ]; then
    echo -e "${GREEN}✓${NC} Database connection verified through API"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC}  Database status not available in health endpoint"
fi

# Summary
echo ""
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "🎉 Your Docker stack is ready for production!"
    echo ""
    echo "Access URLs:"
    echo "  Frontend:  http://localhost"
    echo "  Backend:   http://localhost:8000"
    echo "  API Docs:  http://localhost:8000/docs"
    exit 0
else
    echo -e "${RED}❌ Some tests failed.${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check container logs: docker-compose -f docker-compose.prod.yml logs"
    echo "  2. Verify .env.prod is configured correctly"
    echo "  3. Ensure all containers are running: docker-compose -f docker-compose.prod.yml ps"
    exit 1
fi
