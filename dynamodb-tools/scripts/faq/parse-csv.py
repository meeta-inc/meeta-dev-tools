#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import json
import re

def parse_csv_to_js():
    faqs = []
    
    with open('../../data/faq/FAQ_list.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # 학년 정보 파싱
            source_id = row['학년']
            grade_map = {
                'HIGH': 'HIGH',
                'MIDDLE': 'MIDDLE', 
                'ELEMENTARY': 'ELEMENTARY',
                'PRESCHOOL': 'PRESCHOOL'
            }
            
            # sourceId에서 grade 추출
            grade = None
            for key in grade_map:
                if source_id.startswith(key):
                    grade = key
                    break
            
            if not grade:
                continue
                
            # 이미지/링크 확인
            has_image = '(image)' in row['서브버블']
            has_link = 'https://' in row['서브버블'] or 'http://' in row['서브버블']
            
            faq = {
                'sourceId': source_id,
                'grade': grade,
                'category': row['카테고리'],
                'question': row['질문'],
                'mainBubble': row['메인버블'],
                'subBubble': row['서브버블'] if row['서브버블'] else None,
                'ctaBubble': row['CTA버블'] if row['CTA버블'] else None
            }
            
            if has_image:
                faq['hasImage'] = True
            if has_link:
                faq['hasLink'] = True
                
            faqs.append(faq)
    
    # JavaScript 형식으로 출력
    print("const faqsData = [")
    for i, faq in enumerate(faqs):
        grade_comment = {
            'HIGH': '고등학생',
            'MIDDLE': '중학생',
            'ELEMENTARY': '小学生',
            'PRESCHOOL': '幼児'
        }
        
        # 카테고리별 구분 주석
        if i == 0 or faqs[i-1]['grade'] != faq['grade'] or faqs[i-1]['category'] != faq['category']:
            print(f"  // {faq['grade']} ({grade_comment.get(faq['grade'], '')}) - {faq['category']}")
        
        print("  {")
        print(f"    sourceId: '{faq['sourceId']}',")
        print(f"    grade: '{faq['grade']}',")
        print(f"    category: '{faq['category']}',")
        print(f"    question: '{faq['question'].replace(chr(39), chr(92) + chr(39))}',")
        print(f"    mainBubble: '{faq['mainBubble'].replace(chr(39), chr(92) + chr(39))}',")
        
        if faq['subBubble']:
            # 개행 문자 처리
            sub_bubble = faq['subBubble'].replace('\n', '\\n').replace("'", "\\'")
            print(f"    subBubble: '{sub_bubble}',")
        else:
            print(f"    subBubble: null,")
            
        if faq['ctaBubble']:
            cta_bubble = faq['ctaBubble'].replace('\n', '\\n').replace("'", "\\'")
            print(f"    ctaBubble: '{cta_bubble}'", end="")
        else:
            print(f"    ctaBubble: null", end="")
            
        if faq.get('hasImage'):
            print(",")
            print(f"    hasImage: true", end="")
        if faq.get('hasLink'):
            print(",")
            print(f"    hasLink: true", end="")
            
        if i < len(faqs) - 1:
            print("\n  },")
        else:
            print("\n  }")
    
    print("];")
    print("\nmodule.exports = faqsData;")

if __name__ == "__main__":
    parse_csv_to_js()