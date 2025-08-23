# AI Navi Chat API Test Automation Makefile
# This Makefile provides convenient commands for running various test scenarios

# Default configuration
GRADE ?= elementary
CATEGORY ?= 
TEST_ID ?= 
CONCURRENCY ?= 5
DURATION ?= 60
TARGET_RPS ?= 2
NO_SLACK ?= false
MODEL ?= anthropic

# FAQ test configuration
INTERVAL ?= 1
MAX_RETRIES ?= 5
JSON_FILE ?= src/data/json/all-test-cases.json
FAQ_JSON_FILE = src/data/json/314-chatbot-faq-test-cases.json

# Colors for output
GREEN = \033[0;32m
YELLOW = \033[0;33m
RED = \033[0;31m
NC = \033[0m # No Color

.PHONY: help install build test test-single test-grade test-category load-test performance-test clean

help: ## Display this help message
	@echo "$(GREEN)AI Navi Chat API Test Automation$(NC)"
	@echo "=================================="
	@echo ""
	@echo "Available commands:"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(YELLOW)Examples:$(NC)"
	@echo "  make test-single TEST_ID=ELEMENTARY_A-1"
	@echo "  make test-single-model TEST_ID=ELEMENTARY_A-1 MODEL=openai"
	@echo "  make test-grade GRADE=middle"
	@echo "  make test-category CATEGORY='授業・カリキュラム'"
	@echo "  make load-test CONCURRENCY=10 DURATION=120"
	@echo "  make faq-all"

install: ## Install dependencies
	@echo "$(GREEN)Installing dependencies...$(NC)"
	npm install

build: ## Build TypeScript code
	@echo "$(GREEN)Building TypeScript...$(NC)"
	npm run build
	@echo "$(GREEN)Copying config files...$(NC)"
	cp -r config dist/config 2>/dev/null || true
	cp -r src/utils dist/src/utils 2>/dev/null || true

test: build ## Run basic test suite (alias for test-grade)
	@$(MAKE) test-grade GRADE=$(GRADE)

test-single: build ## Run a single test case (requires TEST_ID)
	@if [ -z "$(TEST_ID)" ]; then \
		echo "$(RED)Error: TEST_ID is required for single test$(NC)"; \
		echo "Usage: make test-single TEST_ID=ELEMENTARY_A-1"; \
		exit 1; \
	fi
	@echo "$(GREEN)Running single test: $(TEST_ID)$(NC)"
	@if [ "$(NO_SLACK)" = "true" ]; then \
		node scripts/run-tests.js --id=$(TEST_ID) --concurrency=1 --no-slack; \
	else \
		node scripts/run-tests.js --id=$(TEST_ID) --concurrency=1; \
	fi

test-single-model: build ## Run a single test with specific AI model (requires TEST_ID and MODEL)
	@if [ -z "$(TEST_ID)" ]; then \
		echo "$(RED)Error: TEST_ID is required for single test$(NC)"; \
		echo "Usage: make test-single-model TEST_ID=ELEMENTARY_A-1 MODEL=openai"; \
		exit 1; \
	fi
	@echo "$(GREEN)Running single test: $(TEST_ID) with model: $(MODEL)$(NC)"
	@if [ "$(NO_SLACK)" = "true" ]; then \
		node scripts/run-tests.js --id=$(TEST_ID) --model=$(MODEL) --concurrency=1 --no-slack; \
	else \
		node scripts/run-tests.js --id=$(TEST_ID) --model=$(MODEL) --concurrency=1; \
	fi

test-grade: build ## Run tests filtered by grade
	@echo "$(GREEN)Running tests for grade: $(GRADE) with $(MODEL) model$(NC)"
	@if [ "$(NO_SLACK)" = "true" ]; then \
		node scripts/run-tests.js --grade=$(GRADE) --concurrency=1 --no-slack --model=$(MODEL); \
	else \
		node scripts/run-tests.js --grade=$(GRADE) --concurrency=1 --model=$(MODEL); \
	fi

test-grade-model: build ## Run tests filtered by grade with specific AI model
	@echo "$(GREEN)Running tests for grade: $(GRADE) with model: $(MODEL)$(NC)"
	@if [ "$(NO_SLACK)" = "true" ]; then \
		node scripts/run-tests.js --grade=$(GRADE) --model=$(MODEL) --concurrency=1 --no-slack; \
	else \
		node scripts/run-tests.js --grade=$(GRADE) --model=$(MODEL) --concurrency=1; \
	fi

test-category: build ## Run tests filtered by category (requires CATEGORY)
	@if [ -z "$(CATEGORY)" ]; then \
		echo "$(RED)Error: CATEGORY is required for category test$(NC)"; \
		echo "Usage: make test-category CATEGORY='授業・カリキュラム'"; \
		exit 1; \
	fi
	@echo "$(GREEN)Running tests for category: $(CATEGORY)$(NC)"
	@if [ "$(NO_SLACK)" = "true" ]; then \
		node scripts/run-tests.js --category="$(CATEGORY)" --concurrency=1 --no-slack; \
	else \
		node scripts/run-tests.js --category="$(CATEGORY)" --concurrency=1; \
	fi

test-all: build ## Run all available tests (including FAQ)
	@echo "$(GREEN)Running all tests (general + FAQ) with $(MODEL) model...$(NC)"
	@echo "Merging test cases..."
	@node scripts/merge-test-cases.js
	@echo ""
	@if [ "$(NO_SLACK)" = "true" ]; then \
		node scripts/run-tests.js --json-file=src/data/json/merged-test-cases.json --concurrency=1 --no-slack --model=$(MODEL); \
	else \
		node scripts/run-tests.js --json-file=src/data/json/merged-test-cases.json --concurrency=1 --model=$(MODEL); \
	fi
	@echo ""
	@echo "$(GREEN)All tests completed!$(NC)"

test-dry-run: build ## Run tests in dry-run mode (no actual API calls)
	@echo "$(GREEN)Running dry-run tests for grade: $(GRADE)$(NC)"
	@node scripts/run-tests.js --grade=$(GRADE) --dry-run --no-slack

load-test: build ## Run load tests with specified parameters
	@echo "$(GREEN)Running load test...$(NC)"
	@echo "Parameters: Concurrency=$(CONCURRENCY), Duration=$(DURATION)s, Target RPS=$(TARGET_RPS)"
	@ARGS="--max-concurrency=$(CONCURRENCY) --target-rps=$(TARGET_RPS) --duration=$(DURATION)"; \
	if [ -n "$(GRADE)" ] && [ "$(GRADE)" != "all" ]; then \
		ARGS="$$ARGS --grade=$(GRADE)"; \
	fi; \
	node scripts/run-load-test.js $$ARGS

load-test-light: ## Run light load test (quick performance check)
	@$(MAKE) load-test CONCURRENCY=3 DURATION=30 TARGET_RPS=1

load-test-heavy: ## Run heavy load test (stress testing)
	@$(MAKE) load-test CONCURRENCY=15 DURATION=180 TARGET_RPS=5

performance-test: build ## Run performance monitoring test
	@echo "$(GREEN)Running performance test for grade: $(GRADE)$(NC)"
	@node scripts/run-load-test.js --grade=$(GRADE) --max-concurrency=5 --target-rps=2 --duration=60

generate-faq: ## Generate FAQ test cases from Excel
	@echo "$(GREEN)Generating FAQ test cases...$(NC)"
	@node scripts/generate-faq-cases.js

validate-env: ## Validate environment configuration
	@echo "$(GREEN)Validating environment configuration...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(RED)Error: .env file not found$(NC)"; \
		echo "Please create .env file from .env.example"; \
		exit 1; \
	fi
	@echo "$(GREEN)Environment file exists$(NC)"
	@node -e "try { require('dotenv').config(); console.log('✅ Environment variables loaded successfully'); } catch(e) { console.error('❌ Environment validation failed:', e.message); process.exit(1); }"

check-api: build validate-env ## Check API connection health
	@echo "$(GREEN)Checking API connection...$(NC)"
	@node -e "
	const { AINaviChatClient } = require('./dist/src/api/client');
	const client = new AINaviChatClient();
	client.healthCheck().then(result => {
		if (result) {
			console.log('✅ API connection healthy');
			process.exit(0);
		} else {
			console.log('❌ API connection failed');
			process.exit(1);
		}
	}).catch(error => {
		console.error('❌ Health check error:', error.message);
		process.exit(1);
	});"

test-integration: build validate-env check-api ## Run integration tests (build + validate + API check + basic test)
	@echo "$(GREEN)Running integration test suite...$(NC)"
	@$(MAKE) test-single TEST_ID=ELEMENTARY_A-1 NO_SLACK=true

clean: ## Clean build artifacts and reports
	@echo "$(GREEN)Cleaning build artifacts...$(NC)"
	@rm -rf dist/
	@rm -rf reports/
	@rm -rf node_modules/.cache/
	@echo "$(GREEN)Clean completed$(NC)"

clean-all: clean ## Clean everything including node_modules
	@echo "$(GREEN)Cleaning all artifacts including dependencies...$(NC)"
	@rm -rf node_modules/
	@echo "$(GREEN)Complete clean finished$(NC)"

status: ## Show current test environment status
	@echo "$(GREEN)Test Environment Status$(NC)"
	@echo "======================="
	@echo "Node.js Version: $$(node --version 2>/dev/null || echo 'Not installed')"
	@echo "NPM Version: $$(npm --version 2>/dev/null || echo 'Not installed')"
	@echo "Build Status: $$([ -d 'dist' ] && echo '✅ Built' || echo '❌ Not built')"
	@echo "Environment: $$([ -f '.env' ] && echo '✅ Configured' || echo '❌ Missing .env')"
	@echo "Test Cases: $$([ -f 'src/data/json/all-test-cases.json' ] && echo '✅ Available' || echo '❌ Missing')"
	@echo ""
	@echo "Available Test Cases:"
	@if [ -f 'src/data/json/all-test-cases.json' ]; then \
		node -e "
		const cases = require('./src/data/json/all-test-cases.json');
		const grades = {}; 
		cases.forEach(c => grades[c.grade] = (grades[c.grade] || 0) + 1);
		Object.entries(grades).forEach(([grade, count]) => console.log('  ' + grade + ': ' + count + ' cases'));
		console.log('  Total: ' + cases.length + ' cases');
		"; \
	else \
		echo "  No test cases found"; \
	fi

# Advanced test scenarios
test-smoke: ## Run smoke tests (essential functionality)
	@echo "$(GREEN)Running smoke tests...$(NC)"
	@$(MAKE) test-single TEST_ID=ELEMENTARY_A-1 NO_SLACK=true
	@$(MAKE) test-single TEST_ID=MIDDLE_A-1 NO_SLACK=true
	@$(MAKE) test-single TEST_ID=HIGH_A-1 NO_SLACK=true

test-regression: ## Run regression tests (comprehensive coverage)
	@echo "$(GREEN)Running regression tests...$(NC)"
	@CONCURRENCY=1 $(MAKE) test-grade GRADE=elementary NO_SLACK=true
	@CONCURRENCY=1 $(MAKE) test-grade GRADE=middle NO_SLACK=true
	@CONCURRENCY=1 $(MAKE) test-grade GRADE=high NO_SLACK=true

test-nightly: ## Run nightly test suite (full coverage with load testing)
	@echo "$(GREEN)Running nightly test suite...$(NC)"
	@$(MAKE) test-all NO_SLACK=true
	@$(MAKE) load-test-light
	@$(MAKE) performance-test GRADE=elementary

# GitHub Actions integration helpers
ci-test: build ## Run tests suitable for CI environment
	@echo "$(GREEN)Running CI tests...$(NC)"
	@$(MAKE) test-single TEST_ID=ELEMENTARY_A-1 NO_SLACK=true

ci-full: ## Run full CI test suite
	@echo "$(GREEN)Running full CI test suite...$(NC)"
	@$(MAKE) test-regression

# Development helpers
dev-setup: clean install build generate-faq ## Complete development setup
	@echo "$(GREEN)Development setup completed!$(NC)"
	@$(MAKE) status

dev-test: ## Quick development test
	@$(MAKE) test-dry-run GRADE=elementary

# =============================================================================
# FAQ Test Commands (314 Chatbot FAQ Test Cases)
# =============================================================================

faq-all: ## Run all 47 FAQ test cases
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)47개 FAQ 테스트 전체 실행 시작 - $(MODEL) 모델$(NC)"
	@echo "$(GREEN)========================================$(NC)"
	@echo "테스트 파일: $(FAQ_JSON_FILE)"
	@echo "모델: $(MODEL)"
	@echo "병렬 실행: 1개 (순차 실행)"
	@echo "인터벌: $(INTERVAL)초"
	@echo "최대 재시도: $(MAX_RETRIES)회"
	@echo ""
	node scripts/run-tests.js \
		--json-file=$(FAQ_JSON_FILE) \
		--concurrency=1 \
		--interval=$(INTERVAL) \
		--max-retries=$(MAX_RETRIES) \
		--model=$(MODEL) || true
	@echo ""
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)FAQ 전체 테스트 완료!$(NC)"
	@echo "$(GREEN)========================================$(NC)"

faq-single: ## Run a single FAQ test (requires ID)
	@if [ -z "$(ID)" ]; then \
		echo "$(RED)Error: 테스트 ID를 지정해주세요$(NC)"; \
		echo "사용법: make faq-single ID=INFANT-001"; \
		exit 1; \
	fi
	@echo "$(YELLOW)========================================$(NC)"
	@echo "$(YELLOW)FAQ 단일 테스트 실행: $(ID)$(NC)"
	@echo "$(YELLOW)========================================$(NC)"
	@echo "테스트 파일: $(FAQ_JSON_FILE)"
	@echo "테스트 ID: $(ID)"
	@echo "모델: $(MODEL)"
	@echo ""
	node scripts/run-tests.js \
		--json-file=$(FAQ_JSON_FILE) \
		--id=$(ID) \
		--interval=$(INTERVAL) \
		--max-retries=$(MAX_RETRIES) \
		--model=$(MODEL) || true
	@echo ""
	@echo "$(YELLOW)========================================$(NC)"
	@echo "$(YELLOW)FAQ 단일 테스트 완료!$(NC)"
	@echo "$(YELLOW)========================================$(NC)"

faq-single-plus: ## Run a specific FAQ test + N additional tests (requires ID, N)
	@if [ -z "$(ID)" ]; then \
		echo "$(RED)Error: 테스트 ID를 지정해주세요$(NC)"; \
		echo "사용법: make faq-single-plus ID=ELEM-005 N=3"; \
		exit 1; \
	fi
	@if [ -z "$(N)" ]; then \
		echo "$(RED)Error: 추가 테스트 개수를 지정해주세요$(NC)"; \
		echo "사용법: make faq-single-plus ID=ELEM-005 N=3"; \
		exit 1; \
	fi
	@echo "$(YELLOW)========================================$(NC)"
	@echo "$(YELLOW)FAQ 테스트 실행: $(ID) + $(N)개 추가$(NC)"
	@echo "$(YELLOW)========================================$(NC)"
	@echo "테스트 파일: $(FAQ_JSON_FILE)"
	@echo "시작 테스트 ID: $(ID)"
	@echo "추가 테스트 개수: $(N)개"
	@echo "인터벌: $(INTERVAL)초"
	@echo ""
	node scripts/run-tests.js \
		--json-file=$(FAQ_JSON_FILE) \
		--id=$(ID) \
		--additional-cases=$(N) \
		--interval=$(INTERVAL) \
		--max-retries=$(MAX_RETRIES) || true
	@echo ""
	@echo "$(YELLOW)========================================$(NC)"
	@echo "$(YELLOW)FAQ 테스트 $(ID) + $(N)개 완료!$(NC)"
	@echo "$(YELLOW)========================================$(NC)"

# FAQ test shortcuts
test-infant: ## Quick test for infant FAQ (INFANT-001)
	@$(MAKE) faq-single ID=INFANT-001

test-elem: ## Quick test for elementary FAQ (ELEM-001)
	@$(MAKE) faq-single ID=ELEM-001

test-middle: ## Quick test for middle school FAQ (MIDDLE-001)
	@$(MAKE) faq-single ID=MIDDLE-001

test-high: ## Quick test for high school FAQ (HIGH-001)
	@$(MAKE) faq-single ID=HIGH-001

# Grade-specific FAQ tests
test-all-infant: ## Run all infant FAQ tests (15 cases)
	@echo "$(GREEN)유아 FAQ 테스트 15개 실행$(NC)"
	node scripts/run-tests.js \
		--json-file=$(FAQ_JSON_FILE) \
		--grade=preschool \
		--interval=$(INTERVAL) \
		--max-retries=$(MAX_RETRIES) || true

test-all-elem: ## Run all elementary FAQ tests (11 cases)
	@echo "$(GREEN)초등 FAQ 테스트 11개 실행$(NC)"
	node scripts/run-tests.js \
		--json-file=$(FAQ_JSON_FILE) \
		--grade=elementary \
		--interval=$(INTERVAL) \
		--max-retries=$(MAX_RETRIES) || true

test-all-middle: ## Run all middle school FAQ tests (8 cases)
	@echo "$(GREEN)중등 FAQ 테스트 8개 실행$(NC)"
	node scripts/run-tests.js \
		--json-file=$(FAQ_JSON_FILE) \
		--grade=middle \
		--interval=$(INTERVAL) \
		--max-retries=$(MAX_RETRIES) || true

test-all-high: ## Run all high school FAQ tests (12 cases)
	@echo "$(GREEN)고등 FAQ 테스트 12개 실행$(NC)"
	node scripts/run-tests.js \
		--json-file=$(FAQ_JSON_FILE) \
		--grade=high \
		--interval=$(INTERVAL) \
		--max-retries=$(MAX_RETRIES) || true

# =============================================================================
# Model-specific Test Commands
# =============================================================================

test-compare-models: build ## Compare results between anthropic and openai models for a single test
	@if [ -z "$(TEST_ID)" ]; then \
		echo "$(RED)Error: TEST_ID is required for model comparison$(NC)"; \
		echo "Usage: make test-compare-models TEST_ID=ELEMENTARY_A-1"; \
		exit 1; \
	fi
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)Comparing AI Models for test: $(TEST_ID)$(NC)"
	@echo "$(GREEN)========================================$(NC)"
	@echo ""
	@echo "$(YELLOW)Testing with Anthropic model...$(NC)"
	@node scripts/run-tests.js --id=$(TEST_ID) --model=anthropic --concurrency=1 --no-slack || true
	@echo ""
	@echo "$(YELLOW)Testing with OpenAI model...$(NC)"
	@node scripts/run-tests.js --id=$(TEST_ID) --model=openai --concurrency=1 --no-slack || true
	@echo ""
	@echo "$(GREEN)Model comparison completed!$(NC)"

test-anthropic: build ## Run test with Anthropic model (requires TEST_ID)
	@if [ -z "$(TEST_ID)" ]; then \
		echo "$(RED)Error: TEST_ID is required$(NC)"; \
		echo "Usage: make test-anthropic TEST_ID=ELEMENTARY_A-1"; \
		exit 1; \
	fi
	@echo "$(GREEN)Testing with Anthropic model: $(TEST_ID)$(NC)"
	@node scripts/run-tests.js --id=$(TEST_ID) --model=anthropic --concurrency=1

test-openai: build ## Run test with OpenAI model (requires TEST_ID)
	@if [ -z "$(TEST_ID)" ]; then \
		echo "$(RED)Error: TEST_ID is required$(NC)"; \
		echo "Usage: make test-openai TEST_ID=ELEMENTARY_A-1"; \
		exit 1; \
	fi
	@echo "$(GREEN)Testing with OpenAI model: $(TEST_ID)$(NC)"
	@node scripts/run-tests.js --id=$(TEST_ID) --model=openai --concurrency=1

test-faq-model: ## Run FAQ test with specific model (requires ID and MODEL)
	@if [ -z "$(ID)" ]; then \
		echo "$(RED)Error: 테스트 ID를 지정해주세요$(NC)"; \
		echo "사용법: make test-faq-model ID=INFANT-001 MODEL=openai"; \
		exit 1; \
	fi
	@echo "$(YELLOW)========================================$(NC)"
	@echo "$(YELLOW)FAQ 테스트 실행 - Model: $(MODEL), ID: $(ID)$(NC)"
	@echo "$(YELLOW)========================================$(NC)"
	@node scripts/run-tests.js \
		--json-file=$(FAQ_JSON_FILE) \
		--id=$(ID) \
		--model=$(MODEL) \
		--interval=$(INTERVAL) \
		--max-retries=$(MAX_RETRIES) || true
	@echo ""
	@echo "$(YELLOW)FAQ 테스트 완료!$(NC)"

# Show default target
.DEFAULT_GOAL := help