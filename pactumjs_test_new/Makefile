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
	@echo "  make test-grade GRADE=middle"
	@echo "  make test-category CATEGORY='授業・カリキュラム'"
	@echo "  make load-test CONCURRENCY=10 DURATION=120"
	@echo "  make performance-test GRADE=high"

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

test-grade: build ## Run tests filtered by grade
	@echo "$(GREEN)Running tests for grade: $(GRADE)$(NC)"
	@if [ "$(NO_SLACK)" = "true" ]; then \
		node scripts/run-tests.js --grade=$(GRADE) --concurrency=1 --no-slack; \
	else \
		node scripts/run-tests.js --grade=$(GRADE) --concurrency=1; \
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

test-all: build ## Run all available tests
	@echo "$(GREEN)Running all tests...$(NC)"
	@if [ "$(NO_SLACK)" = "true" ]; then \
		node scripts/run-tests.js --concurrency=1 --no-slack; \
	else \
		node scripts/run-tests.js --concurrency=1; \
	fi

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

# Show default target
.DEFAULT_GOAL := help