.PHONY: all clean run-csv-to-gsheet run-test-students run-index download-csv run-all-tests

# 기본 타겟
all: run-all-tests

# S3에서 CSV 다운로드
# 사용법: make download-csv bucket="your-bucket-name" key="path/to/your/file.csv"
download-csv:
	@if [ "$(bucket)" = "" ] || [ "$(key)" = "" ]; then \
		echo "버킷 이름과 키를 지정해주세요. 예: make download-csv bucket=my-bucket key=path/to/file.csv"; \
		exit 1; \
	fi
	node download_csv.js $(bucket) $(key)

# CSV를 구글 시트로 변환 (S3에서 다운로드 후 실행)
# 사용법: make run-csv-to-gsheet bucket="your-bucket-name" key="path/to/your/file.csv"
run-csv-to-gsheet:
	@if [ "$(bucket)" = "" ] || [ "$(key)" = "" ]; then \
		echo "버킷 이름과 키를 지정해주세요. 예: make run-csv-to-gsheet bucket=my-bucket key=path/to/file.csv"; \
		exit 1; \
	fi
	node csv_to_gsheet.js --bucket=$(bucket) --key=$(key)

# 학생 채팅 테스트 실행 (테스트 번호 지정 가능, 번호 미지정시 전체 테스트)
# 사용법: make run-test-students tests="2-1 10 15" bucket="your-bucket-name" key="path/to/your/file.csv"
#        make run-test-students bucket="your-bucket-name" key="path/to/your/file.csv" (전체 테스트 실행)
run-test-students:
	@if [ "$(bucket)" = "" ] || [ "$(key)" = "" ]; then \
		echo "버킷 이름과 키를 지정해주세요. 예: make run-test-students bucket=my-bucket key=path/to/file.csv"; \
		exit 1; \
	fi
	@if [ "$(tests)" = "" ]; then \
		echo "전체 테스트를 실행합니다..."; \
		node test_students_chat.js --bucket=$(bucket) --key=$(key); \
	else \
		echo "테스트 $(tests)를 실행합니다..."; \
		node test_students_chat.js $(tests) --bucket=$(bucket) --key=$(key); \
	fi

# 메인 인덱스 실행
run-index:
	node index.js

# 구글 시트에서 데이터를 가져와 S3에 업로드한 후 테스트 실행
# 사용법: make run-all-tests tests="2-1 10 15" (테스트 번호 지정)
#        make run-all-tests (전체 테스트 실행)
run-all-tests:
	@echo "구글 시트에서 데이터를 가져와 S3에 업로드합니다..."
	@S3_INFO=$$(node index.js | tail -n 1) && \
	if [ -z "$$S3_INFO" ]; then \
		echo "S3 정보를 가져오는데 실패했습니다."; \
		exit 1; \
	fi && \
	BUCKET=$$(echo "$$S3_INFO" | jq -r '.bucket') && \
	KEY=$$(echo "$$S3_INFO" | jq -r '.key') && \
	if [ -z "$$BUCKET" ] || [ -z "$$KEY" ]; then \
		echo "S3 정보 파싱에 실패했습니다."; \
		echo "출력: $$S3_INFO"; \
		exit 1; \
	fi && \
	echo "업로드된 파일: $$BUCKET/$$KEY" && \
	if [ -z "$(tests)" ]; then \
		echo "전체 테스트를 실행합니다..." && \
		TEST_RESULT=$$(node test_students_chat.js --bucket="$$BUCKET" --key="$$KEY" | tail -n 1) && \
		RESULT_BUCKET=$$(echo "$$TEST_RESULT" | jq -r '.bucket') && \
		RESULT_KEY=$$(echo "$$TEST_RESULT" | jq -r '.key') && \
		if [ -z "$$RESULT_BUCKET" ] || [ -z "$$RESULT_KEY" ]; then \
			echo "테스트 결과 파싱에 실패했습니다."; \
			echo "출력: $$TEST_RESULT"; \
			exit 1; \
		fi && \
		echo "테스트 결과 파일: $$RESULT_BUCKET/$$RESULT_KEY" && \
		node csv_to_gsheet.js --bucket="$$RESULT_BUCKET" --key="$$RESULT_KEY"; \
	else \
		echo "테스트 $(tests)를 실행합니다..." && \
		TEST_RESULT=$$(node test_students_chat.js $(tests) --bucket="$$BUCKET" --key="$$KEY" | tail -n 1) && \
		RESULT_BUCKET=$$(echo "$$TEST_RESULT" | jq -r '.bucket') && \
		RESULT_KEY=$$(echo "$$TEST_RESULT" | jq -r '.key') && \
		if [ -z "$$RESULT_BUCKET" ] || [ -z "$$RESULT_KEY" ]; then \
			echo "테스트 결과 파싱에 실패했습니다."; \
			echo "출력: $$TEST_RESULT"; \
			exit 1; \
		fi && \
		echo "테스트 결과 파일: $$RESULT_BUCKET/$$RESULT_KEY" && \
		node csv_to_gsheet.js --bucket="$$RESULT_BUCKET" --key="$$RESULT_KEY"; \
	fi

# 정리
clean:
	rm -f *.log
	rm -f *.csv
