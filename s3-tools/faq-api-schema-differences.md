# FAQ API Schema Differences Analysis

## Overview
This document compares the **UpdateFaqRequest** schema defined in the meeta-api-contracts with the actual request payload provided by the user for the PUT `/faqs/{id}` endpoint.

## Schema Source
- **Contract Location**: `/Users/rimapa2025/workspace/meeta-api-contracts/products/ai-navi/content-config-service/schemas/requests/faq-request.yaml`
- **Schema Reference**: `UpdateFaqRequest`

## UpdateFaqRequest Schema Definition
```yaml
UpdateFaqRequest:
  type: object
  properties:
    clientId:
      type: string
      description: 클라이언트 ID
      example: RS000001
    categoryId:
      type: string
      description: FAQ 카테고리 ID
      example: cat_123456
    question:
      type: string
      description: 질문 내용
      example: 수학 수업은 어떻게 진행되나요?
    mainBubble:
      type: string
      description: 메인 응답 버블 내용
      example: 수학 수업은 주 2회 진행되며, 기초부터 심화까지 단계별로 학습합니다.
    subBubble:
      type: string
      nullable: true
      description: 서브 응답 버블 내용 (선택사항)
      example: 자세한 커리큘럼은 상담을 통해 안내드립니다.
    ctaBubble:
      type: string
      nullable: true
      description: CTA 버블 내용 (선택사항)
      example: 무료 상담 신청하기
    status:
      type: string
      description: FAQ 상태
      enum:
        - published
        - draft
        - archived
      default: draft
```

## Actual Request Payload
```json
{
  "clientId": "RS000001",
  "categoryId": "CAT202508150001",
  "question": "数学授業はどういうふうに進めますかを教えてほしい。（API確認用）",
  "mainBubble": "数学授業は週２回行われて、基礎から高級まで段階的に学習します。",
  "subBubble": "詳しいカリキュラムを確認ください",
  "ctaBubble": "無料相談を申し込む",
  "targetAttributes": ["high"],
  "attachments": [
    {
      "id": "file_c03c319436",
      "fileName": "screenshot-removebg-preview.png",
      "fileUrl": "https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/c03c3194-36f2-4356-bd5b-0e2bd01c3050.png",
      "fileSize": 383202,
      "mimeType": "image/png"
    }
  ]
}
```

## Detailed Comparison

| Field Name | Schema Definition | Actual Request | Difference | Impact |
|------------|------------------|----------------|------------|---------|
| `clientId` | ✅ Defined<br/>Type: `string`<br/>Required: No | ✅ Present<br/>Value: `"RS000001"` | ✅ **Match** | None |
| `categoryId` | ✅ Defined<br/>Type: `string`<br/>Required: No | ✅ Present<br/>Value: `"CAT202508150001"` | ✅ **Match** | None |
| `question` | ✅ Defined<br/>Type: `string`<br/>Required: No | ✅ Present<br/>Value: Japanese text | ✅ **Match** | None |
| `mainBubble` | ✅ Defined<br/>Type: `string`<br/>Required: No | ✅ Present<br/>Value: Japanese text | ✅ **Match** | None |
| `subBubble` | ✅ Defined<br/>Type: `string`<br/>Nullable: `true`<br/>Required: No | ✅ Present<br/>Value: Japanese text | ✅ **Match** | None |
| `ctaBubble` | ✅ Defined<br/>Type: `string`<br/>Nullable: `true`<br/>Required: No | ✅ Present<br/>Value: Japanese text | ✅ **Match** | None |
| `status` | ✅ Defined<br/>Type: `string`<br/>Enum: `[published, draft, archived]`<br/>Default: `draft` | ❌ **Missing** | ⚠️ **Field Missing** | Low - Has default value |
| `targetAttributes` | ❌ **Not Defined** | ✅ Present<br/>Value: `["high"]` | ❌ **Extra Field** | **High - Schema Mismatch** |
| `attachments` | ❌ **Not Defined** | ✅ Present<br/>Array of attachment objects | ❌ **Extra Field** | **High - Schema Mismatch** |

## Additional Context

### targetAttributes Schema (From Response Schema)
While `targetAttributes` is not defined in the `UpdateFaqRequest` schema, it is defined in the FAQ response schema and common FAQ model:

```yaml
targetAttributes:
  type: array
  description: 대상 속성 (학년, 학부모 등)
  items:
    type: string
    enum:
      - elementary
      - middle_school
      - high_school
      - parent
      - teacher
```

**Issue**: The actual request uses `["high"]` which is not in the allowed enum values.

### attachments Schema (From Response Schema)
While `attachments` is not defined in the `UpdateFaqRequest` schema, it is defined in the FAQ response schema:

```yaml
attachments:
  type: array
  description: 첨부 파일 목록
  items:
    $ref: '../common/attachment.yaml#/Attachment'
```

**Attachment Object Schema**:
```yaml
Attachment:
  type: object
  required:
    - id
    - fileName
    - fileUrl
  properties:
    id:
      type: string
      description: 첨부 파일 ID
    fileName:
      type: string
      description: 파일명
    fileUrl:
      type: string
      description: 파일 URL
    fileSize:
      type: integer
      nullable: true
      description: 파일 크기 (bytes)
    mimeType:
      type: string
      nullable: true
      description: MIME 타입
```

## Summary of Issues

### 🔴 Critical Issues
1. **Missing Fields in Schema**: `targetAttributes` and `attachments` are present in the actual request but not defined in the `UpdateFaqRequest` schema
2. **Invalid targetAttributes Value**: The value `"high"` is not in the allowed enum values (`elementary`, `middle_school`, `high_school`, `parent`, `teacher`)

### 🟡 Minor Issues
1. **Missing Optional Field**: `status` field is missing from the request but has a default value

### ✅ Correctly Matched Fields
- `clientId`
- `categoryId` 
- `question`
- `mainBubble`
- `subBubble`
- `ctaBubble`

## Recommendations

1. **Update UpdateFaqRequest Schema**: Add `targetAttributes` and `attachments` fields to the schema definition
2. **Fix targetAttributes Enum**: Either update the enum to include `"high"` or map `"high"` to `"high_school"`
3. **Consider Required Fields**: Review if any of the missing fields should be required
4. **Validate Implementation**: Ensure the API implementation handles these additional fields properly

## Impact Assessment

- **API Validation**: Current requests will fail schema validation if strict validation is enabled
- **Documentation**: API documentation is incomplete and misleading
- **Client Integration**: Clients following the schema will not know about available fields
- **Data Consistency**: Risk of inconsistent data handling between request and response