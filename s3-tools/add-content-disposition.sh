#!/bin/bash
# source/RS000001/ 폴더의 모든 파일에 Content-Disposition 헤더 추가 (원본 파일명 활용)

BUCKET="meeta-ai-navi"
PREFIX="source/RS000001/"
REGION="ap-northeast-1"

# Base64 디코딩 함수
decode_base64() {
  if [[ "$1" == b64:* ]]; then
    echo "${1#b64:}" | base64 -d 2>/dev/null || echo "decoded_file"
  else
    echo "$1"
  fi
}

# 안전한 파일명으로 변환하는 함수
sanitize_filename() {
  echo "$1" | sed 's/[<>:"/\|?*]/_/g' | sed 's/ /_/g' | sed 's/__*/_/g' | sed 's/^_\|_$//g'
}

echo "Processing files with original filenames in s3://$BUCKET/$PREFIX"

# 각 파일 처리
aws s3api list-objects-v2 --bucket "$BUCKET" --prefix "$PREFIX" --query "Contents[?Size>\`0\`].Key" --output text | tr '\t' '\n' | while read -r key; do
  if [[ "$key" == */ ]]; then
    echo "Skipping directory: $key"
    continue
  fi
  
  echo "Processing: $key"
  
  # 객체 메타데이터에서 원본 파일명 가져오기
  original_filename=$(aws s3api head-object --bucket "$BUCKET" --key "$key" --query "Metadata.original_filename" --output text 2>/dev/null)
  
  if [[ "$original_filename" != "None" && "$original_filename" != "" ]]; then
    # Base64 디코딩 시도
    decoded_filename=$(decode_base64 "$original_filename")
    download_name=$(sanitize_filename "$decoded_filename")
    echo "  원본 파일명: $original_filename"
    echo "  디코딩된 파일명: $decoded_filename"
    echo "  다운로드 파일명: $download_name"
  else
    # 메타데이터가 없는 경우 기본 이름 사용
    filename=$(basename "$key")
    extension="${filename##*.}"
    uuid="${filename%.*}"
    shortid="${uuid:0:8}"
    
    case "$extension" in
      pdf) download_name="document_${shortid}.pdf" ;;
      png) download_name="image_${shortid}.png" ;;
      gif) download_name="animation_${shortid}.gif" ;;
      txt) download_name="text_${shortid}.txt" ;;
      *) download_name="file_${shortid}.${extension}" ;;
    esac
    echo "  기본 다운로드 파일명: $download_name"
  fi
  
  # Content-Disposition 헤더와 함께 객체 복사
  aws s3api copy-object \
    --bucket "$BUCKET" \
    --copy-source "$BUCKET/$key" \
    --key "$key" \
    --content-disposition "attachment; filename=\"$download_name\"" \
    --metadata-directive COPY \
    --region "$REGION"
  
  if [ $? -eq 0 ]; then
    echo "✅ Success: $key -> $download_name"
  else
    echo "❌ Failed: $key"
  fi
  echo "----------------------------------------"
done

echo "모든 파일의 Content-Disposition 헤더 추가 완료!"