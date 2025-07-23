.PHONY: help test-health test-chat test-chat-with-token test-invalid-token generate-token start build clean test test-coverage test-watch

# Default target
help:
	@echo "🚀 AI Navi Backend Mock API Test Commands"
	@echo ""
	@echo "Available commands:"
	@echo "  make start                 - Start the mock server"
	@echo "  make build                 - Build the TypeScript project"
	@echo "  make generate-token        - Generate a test JWE token"
	@echo "  make test-health           - Test health endpoint"
	@echo "  make test-chat             - Test chat endpoint with valid token"
	@echo "  make test-chat-with-token  - Generate token and test chat endpoint"
	@echo "  make test-invalid-token    - Test chat endpoint with invalid token"
	@echo "  make test-all              - Run all API tests"
	@echo "  make test                  - Run Jest unit tests"
	@echo "  make test-coverage         - Run Jest tests with coverage"
	@echo "  make test-watch            - Run Jest tests in watch mode"
	@echo "  make clean                 - Clean build artifacts"
	@echo ""

# Server management
start:
	@echo "🚀 Starting AI Navi Backend Mock Server..."
	npm start

build:
	@echo "🔨 Building TypeScript project..."
	npm run build

clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf dist/

# Token generation
generate-token:
	@echo "🔑 Generating test JWE token..."
	@node generate-token.mjs

# API Tests
test-health:
	@echo "🏥 Testing Health API..."
	@curl -s -w "\n📊 Status: %{http_code}\n" \
		http://localhost:3001/ai-navi/health | jq . 2>/dev/null || echo "Response received (jq formatting failed)"

test-chat: export TOKEN := $(shell node generate-token.mjs | grep -E '^eyJ' | head -1)
test-chat:
	@echo "💬 Testing Chat API with generated token..."
	@if [ -z "$(TOKEN)" ]; then \
		echo "❌ Failed to generate token. Make sure the server dependencies are installed."; \
		exit 1; \
	fi
	@curl -s -w "\n📊 Status: %{http_code}\n" \
		-X POST http://localhost:3001/students/chat \
		-H "Content-Type: application/json" \
		-H "X-JWE-Token: $(TOKEN)" \
		-d '{ \
			"clientId": "RS000001", \
			"appId": "0001", \
			"gradeId": "elementary", \
			"userId": "testuser123", \
			"message": "안녕하세요! 수학 문제를 도와주세요.", \
			"sessionId": "test-session-123" \
		}' | jq . 2>/dev/null || echo "Response received (jq formatting failed)"

test-chat-with-token:
	@echo "🔑 Generating token and testing chat API..."
	@TOKEN=$$(node generate-token.mjs | grep -E '^eyJ' | head -1) && \
	echo "Generated Token: $$TOKEN" && \
	echo "💬 Testing Chat API..." && \
	curl -s -w "\n📊 Status: %{http_code}\n" \
		-X POST http://localhost:3001/students/chat \
		-H "Content-Type: application/json" \
		-H "X-JWE-Token: $$TOKEN" \
		-d '{ \
			"clientId": "RS000001", \
			"appId": "0001", \
			"gradeId": "high", \
			"userId": "student456", \
			"message": "영어 문법에 대해 질문이 있어요." \
		}' | jq . 2>/dev/null || echo "Response received (jq formatting failed)"

test-invalid-token:
	@echo "❌ Testing Chat API with invalid token..."
	@curl -s -w "\n📊 Status: %{http_code}\n" \
		-X POST http://localhost:3001/students/chat \
		-H "Content-Type: application/json" \
		-H "X-JWE-Token: invalid.token.here" \
		-d '{ \
			"clientId": "RS000001", \
			"appId": "0001", \
			"gradeId": "middle", \
			"userId": "testuser789", \
			"message": "이 토큰은 유효하지 않습니다." \
		}' | jq . 2>/dev/null || echo "Response received (jq formatting failed)"

test-validation:
	@echo "🔍 Testing request validation..."
	@echo "Testing invalid clientId format..."
	@TOKEN=$$(node generate-token.mjs | grep -E '^eyJ' | head -1) && \
	curl -s -w "\n📊 Status: %{http_code}\n" \
		-X POST http://localhost:3001/students/chat \
		-H "Content-Type: application/json" \
		-H "X-JWE-Token: $$TOKEN" \
		-d '{ \
			"clientId": "invalid", \
			"appId": "0001", \
			"gradeId": "elementary", \
			"userId": "testuser", \
			"message": "테스트 메시지" \
		}' | jq . 2>/dev/null || echo "Response received (jq formatting failed)"

test-missing-fields:
	@echo "🔍 Testing missing required fields..."
	@TOKEN=$$(node generate-token.mjs | grep -E '^eyJ' | head -1) && \
	curl -s -w "\n📊 Status: %{http_code}\n" \
		-X POST http://localhost:3001/students/chat \
		-H "Content-Type: application/json" \
		-H "X-JWE-Token: $$TOKEN" \
		-d '{ \
			"appId": "0001", \
			"gradeId": "elementary", \
			"message": "clientId가 없는 요청입니다." \
		}' | jq . 2>/dev/null || echo "Response received (jq formatting failed)"

test-all: test-health test-chat-with-token test-invalid-token test-validation test-missing-fields
	@echo "✅ All API tests completed!"

# Jest Unit Tests
test:
	@echo "🧪 Running Jest unit tests..."
	npm test

test-coverage:
	@echo "📊 Running Jest tests with coverage..."
	npm run test:coverage

test-watch:
	@echo "👀 Running Jest tests in watch mode..."
	npm run test:watch

# Development helpers
dev-info:
	@echo "📚 Development Information:"
	@echo "  Server URL: http://localhost:3001"
	@echo "  API Docs: http://localhost:3001/docs"
	@echo "  Health Check: http://localhost:3001/ai-navi/health"
	@echo "  Chat Endpoint: POST http://localhost:3001/students/chat"
	@echo ""
	@echo "🔧 Required Headers for Chat API:"
	@echo "  Content-Type: application/json"
	@echo "  X-JWE-Token: [generated token]"

# Quick curl examples
curl-examples:
	@echo "📋 Quick curl examples:"
	@echo ""
	@echo "Health Check:"
	@echo "curl http://localhost:3001/ai-navi/health"
	@echo ""
	@echo "Chat API (replace TOKEN with actual token):"
	@echo 'curl -X POST http://localhost:3001/students/chat \'
	@echo '  -H "Content-Type: application/json" \'
	@echo '  -H "X-JWE-Token: TOKEN" \'
	@echo '  -d '"'"'{ \'
	@echo '    "clientId": "RS000001", \'
	@echo '    "appId": "0001", \'
	@echo '    "gradeId": "elementary", \'
	@echo '    "userId": "testuser123", \'
	@echo '    "message": "안녕하세요!" \'
	@echo '  }'"'"