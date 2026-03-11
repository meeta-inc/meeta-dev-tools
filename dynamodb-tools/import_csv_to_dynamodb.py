#!/usr/bin/env python3
"""
DynamoDB CSV Import Script
Imports CSV data into DynamoDB table while preserving existing data
"""

import csv
import json
import boto3
import sys
from decimal import Decimal
from typing import Dict, Any, List
import argparse
from datetime import datetime

def parse_dynamodb_format(value: str, field_name: str = None) -> Any:
    """
    Parse DynamoDB formatted string values into proper Python/DynamoDB types
    """
    if not value or value == '':
        return None
    
    # Handle JSON-like DynamoDB format (e.g., {"S":"value"} or {"N":"123"})
    if value.startswith('{') and value.endswith('}'):
        try:
            # Replace double quotes with single quotes for parsing
            parsed = json.loads(value)
            
            # Check if it's a DynamoDB typed value
            if len(parsed) == 1:
                type_key = list(parsed.keys())[0]
                type_value = parsed[type_key]
                
                if type_key == 'S':  # String
                    return type_value
                elif type_key == 'N':  # Number
                    return Decimal(type_value)
                elif type_key == 'M':  # Map
                    return parse_dynamodb_map(type_value)
                elif type_key == 'L':  # List
                    return parse_dynamodb_list(type_value)
                elif type_key == 'BOOL':  # Boolean
                    return type_value
                elif type_key == 'NULL':  # Null
                    return None
            
            # If not a typed value, return as is
            return parsed
        except json.JSONDecodeError:
            pass
    
    # Handle arrays in DynamoDB format (e.g., [{"M":{"name":{"S":"value"}}}])
    if value.startswith('[') and value.endswith(']'):
        try:
            parsed = json.loads(value)
            return parse_dynamodb_list(parsed)
        except json.JSONDecodeError:
            pass
    
    # Handle numbers
    if field_name and field_name in ['priority', 'order']:
        try:
            return Decimal(value)
        except:
            pass
    
    # Return as string by default
    return value


def parse_dynamodb_map(map_value: Dict) -> Dict:
    """Parse DynamoDB Map format"""
    result = {}
    for key, value in map_value.items():
        if isinstance(value, dict) and len(value) == 1:
            type_key = list(value.keys())[0]
            type_value = value[type_key]
            
            if type_key == 'S':
                result[key] = type_value
            elif type_key == 'N':
                result[key] = Decimal(type_value)
            elif type_key == 'M':
                result[key] = parse_dynamodb_map(type_value)
            elif type_key == 'L':
                result[key] = parse_dynamodb_list(type_value)
            elif type_key == 'BOOL':
                result[key] = type_value
            elif type_key == 'NULL':
                result[key] = None
            else:
                result[key] = value
        else:
            result[key] = value
    return result


def parse_dynamodb_list(list_value: List) -> List:
    """Parse DynamoDB List format"""
    result = []
    for item in list_value:
        if isinstance(item, dict):
            if 'M' in item:
                result.append(parse_dynamodb_map(item['M']))
            elif 'S' in item:
                result.append(item['S'])
            elif 'N' in item:
                result.append(Decimal(item['N']))
            elif 'L' in item:
                result.append(parse_dynamodb_list(item['L']))
            elif 'BOOL' in item:
                result.append(item['BOOL'])
            elif 'NULL' in item:
                result.append(None)
            else:
                result.append(item)
        else:
            result.append(item)
    return result


def csv_to_dynamodb_items(csv_file_path: str) -> List[Dict[str, Any]]:
    """
    Convert CSV file to DynamoDB items format
    """
    items = []
    
    with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        
        for row in reader:
            item = {}
            
            for field_name, value in row.items():
                if value:  # Skip empty values
                    parsed_value = parse_dynamodb_format(value, field_name)
                    if parsed_value is not None:
                        item[field_name] = parsed_value
            
            if item:  # Only add non-empty items
                items.append(item)
    
    return items


def check_item_exists(table, pk: str, sk: str) -> bool:
    """
    Check if an item already exists in the table
    """
    try:
        response = table.get_item(
            Key={
                'PK': pk,
                'SK': sk
            }
        )
        return 'Item' in response
    except Exception as e:
        print(f"Error checking item existence: {e}")
        return False


def import_to_dynamodb(table_name: str, items: List[Dict[str, Any]], 
                      region: str = 'ap-northeast-1', 
                      overwrite: bool = False) -> Dict[str, int]:
    """
    Import items to DynamoDB table
    """
    dynamodb = boto3.resource('dynamodb', region_name=region)
    table = dynamodb.Table(table_name)
    
    stats = {
        'total': len(items),
        'imported': 0,
        'skipped': 0,
        'failed': 0
    }
    
    for i, item in enumerate(items, 1):
        try:
            # Check if item exists (using PK and SK)
            if 'PK' in item and 'SK' in item:
                exists = check_item_exists(table, item['PK'], item['SK'])
                
                if exists and not overwrite:
                    print(f"[{i}/{stats['total']}] Skipping existing item: PK={item['PK']}, SK={item['SK']}")
                    stats['skipped'] += 1
                    continue
                elif exists and overwrite:
                    print(f"[{i}/{stats['total']}] Overwriting existing item: PK={item['PK']}, SK={item['SK']}")
            
            # Import the item
            table.put_item(Item=item)
            print(f"[{i}/{stats['total']}] Successfully imported: PK={item.get('PK', 'N/A')}, SK={item.get('SK', 'N/A')}")
            stats['imported'] += 1
            
        except Exception as e:
            print(f"[{i}/{stats['total']}] Failed to import item: {e}")
            print(f"  Item data: {json.dumps(item, default=str)[:200]}...")
            stats['failed'] += 1
    
    return stats


def main():
    parser = argparse.ArgumentParser(description='Import CSV data to DynamoDB table')
    parser.add_argument('--csv', type=str, required=True, help='Path to CSV file')
    parser.add_argument('--table', type=str, required=True, help='DynamoDB table name')
    parser.add_argument('--region', type=str, default='ap-northeast-1', help='AWS region (default: ap-northeast-1)')
    parser.add_argument('--overwrite', action='store_true', help='Overwrite existing items')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be imported without actually importing')
    
    args = parser.parse_args()
    
    print(f"\n{'='*60}")
    print(f"DynamoDB CSV Import Tool")
    print(f"{'='*60}")
    print(f"CSV File: {args.csv}")
    print(f"Table: {args.table}")
    print(f"Region: {args.region}")
    print(f"Overwrite: {args.overwrite}")
    print(f"Dry Run: {args.dry_run}")
    print(f"{'='*60}\n")
    
    try:
        # Parse CSV file
        print("Parsing CSV file...")
        items = csv_to_dynamodb_items(args.csv)
        print(f"Found {len(items)} items to import\n")
        
        if args.dry_run:
            print("DRY RUN MODE - No actual import will be performed")
            print("\nSample items to be imported:")
            for i, item in enumerate(items[:3], 1):
                print(f"\nItem {i}:")
                print(json.dumps(item, indent=2, default=str)[:500])
                if len(json.dumps(item, default=str)) > 500:
                    print("... (truncated)")
        else:
            # Import to DynamoDB
            print("Starting import to DynamoDB...")
            stats = import_to_dynamodb(args.table, items, args.region, args.overwrite)
            
            # Print summary
            print(f"\n{'='*60}")
            print("Import Summary:")
            print(f"  Total items: {stats['total']}")
            print(f"  Imported: {stats['imported']}")
            print(f"  Skipped (existing): {stats['skipped']}")
            print(f"  Failed: {stats['failed']}")
            print(f"{'='*60}\n")
            
            if stats['failed'] > 0:
                sys.exit(1)
    
    except FileNotFoundError:
        print(f"Error: CSV file not found: {args.csv}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()