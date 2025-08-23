#!/bin/bash

# Model comparison script for FAQ tests
TEST_ID=${1:-INFANT-001}

echo "=========================================="
echo "🔬 Model Comparison Test: $TEST_ID"
echo "=========================================="
echo ""

# Test with Anthropic
echo "🔵 Testing with Anthropic model..."
echo "----------------------------------------"
node scripts/run-tests.js \
    --json-file=src/data/json/314-chatbot-faq-test-cases.json \
    --id=$TEST_ID \
    --model=anthropic \
    --no-slack \
    --no-gsheet 2>&1 | grep -E "(responseTime|Response Time|성공|실패)"

echo ""

# Test with OpenAI  
echo "🟢 Testing with OpenAI model..."
echo "----------------------------------------"
node scripts/run-tests.js \
    --json-file=src/data/json/314-chatbot-faq-test-cases.json \
    --id=$TEST_ID \
    --model=openai \
    --no-slack \
    --no-gsheet 2>&1 | grep -E "(responseTime|Response Time|성공|실패)"

echo ""
echo "=========================================="
echo "✅ Model comparison completed!"
echo "=========================================="