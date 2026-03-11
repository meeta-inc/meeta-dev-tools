#!/bin/bash

# CSV to DynamoDB Import Script Runner
# This script handles dependencies and runs the import

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CSV_FILE="data/csv/selected.csv"
TABLE_NAME="ai-navi-attributes-uat1"
REGION="ap-northeast-1"

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}DynamoDB CSV Import Tool${NC}"
echo -e "${GREEN}=========================================${NC}"

# Check if boto3 is installed
echo -e "\n${YELLOW}Checking dependencies...${NC}"
if ! python3 -c "import boto3" 2>/dev/null; then
    echo -e "${YELLOW}boto3 not found. Installing...${NC}"
    pip3 install boto3 --user --break-system-packages
else
    echo -e "${GREEN}✓ boto3 is installed${NC}"
fi

# Check AWS credentials
echo -e "\n${YELLOW}Checking AWS credentials...${NC}"
if aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${GREEN}✓ AWS credentials are configured${NC}"
    aws sts get-caller-identity --query "Account" --output text | xargs -I {} echo "  Account: {}"
else
    echo -e "${RED}✗ AWS credentials not configured${NC}"
    echo "Please configure AWS credentials using 'aws configure'"
    exit 1
fi

# Check if CSV file exists
echo -e "\n${YELLOW}Checking CSV file...${NC}"
if [ -f "$CSV_FILE" ]; then
    echo -e "${GREEN}✓ CSV file found: $CSV_FILE${NC}"
    LINE_COUNT=$(wc -l < "$CSV_FILE")
    echo "  Lines in file: $LINE_COUNT"
else
    echo -e "${RED}✗ CSV file not found: $CSV_FILE${NC}"
    exit 1
fi

# Parse command line arguments
DRY_RUN=""
OVERWRITE=""

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN="--dry-run"
            echo -e "\n${YELLOW}Running in DRY RUN mode${NC}"
            ;;
        --overwrite)
            OVERWRITE="--overwrite"
            echo -e "\n${YELLOW}OVERWRITE mode enabled${NC}"
            ;;
    esac
done

# Run the import
echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}Starting import process...${NC}"
echo -e "${GREEN}=========================================${NC}"

python3 import_csv_to_dynamodb.py \
    --csv "$CSV_FILE" \
    --table "$TABLE_NAME" \
    --region "$REGION" \
    $DRY_RUN \
    $OVERWRITE

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✓ Import completed successfully!${NC}"
else
    echo -e "\n${RED}✗ Import failed!${NC}"
    exit 1
fi