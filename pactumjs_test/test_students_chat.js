require('dotenv').config();
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const pactum = require('pactum');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

// S3 클라이언트 설정
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// S3 업로드 함수
async function uploadToS3(csvData, key) {
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: csvData,
    ContentType: 'text/csv',
  }));
  console.log(`결과 CSV가 S3에 업로드되었습니다: ${key}`);
}

// S3에서 CSV 다운로드 함수
async function downloadFromS3(bucket, key) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });
    const response = await s3Client.send(command);
    const csvString = await response.Body.transformToString();
    return csvString;
  } catch (error) {
    console.error('CSV 다운로드 중 오류 발생:', error);
    throw error;
  }
}

// 명령행 인자에서 테스트 번호 배열과 S3 정보 받기
const args = process.argv.slice(2);
const selectedTestNos = args.filter(arg => !arg.startsWith('--'));
const bucketArg = args.find(arg => arg.startsWith('--bucket='))?.split('=')[1];
const keyArg = args.find(arg => arg.startsWith('--key='))?.split('=')[1];

if (!bucketArg || !keyArg) {
  console.error('사용법: node test_students_chat.js [테스트번호들] --bucket=버킷이름 --key=파일경로');
  process.exit(1);
}

async function run() {
  try {
    // S3에서 CSV 다운로드
    console.log(`S3에서 CSV 파일을 다운로드합니다: ${bucketArg}/${keyArg}`);
    const csvString = await downloadFromS3(bucketArg, keyArg);
    const records = parse(csvString, {
      skip_empty_lines: true,
      relax_column_count: true
    });

    // 결과 저장 배열
    const results = [];
    const apiUrl = 'https://67hnjuna66.execute-api.ap-northeast-1.amazonaws.com/prd-1/students/chat';

    // 헤더 추가
    results.push([
      '테스트번호', '유저역할', '유저아이디', '테스트카테고리', '메세지', 
      '응답결과_스테이터스코드', '응답결과_바디', '응답시간(ms)'
    ]);

    for (const row of records) {
      const [testNo, userRole, userId, category, message] = row;
      if (!message || message.trim() === '') {
        // 메세지 없으면 건너뜀
        continue;
      }

      // 특정 테스트 번호만 실행
      if (selectedTestNos.length > 0 && !selectedTestNos.includes(testNo)) continue;

      try {
        const startTime = Date.now();
        const spec = pactum.spec();
        spec.post(apiUrl)
          .withJson({ userId, message })
          .withRequestTimeout(60000);
        const res = await spec.toss();
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        results.push([
          testNo, userRole, userId, category, message,
          res.statusCode,
          JSON.stringify(res.body),
          responseTime
        ]);
        // 콘솔 로그 출력
        console.log(`[${testNo}] status: ${res.statusCode}, time: ${responseTime}ms, body: ${JSON.stringify(res.body)}`);
      } catch (e) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        results.push([
          testNo, userRole, userId, category, message,
          'ERROR',
          e.message,
          responseTime
        ]);
        // 에러 로그 출력
        console.log(`[${testNo}] ERROR: ${e.message}, time: ${responseTime}ms`);
      }
    }

    // 결과 CSV로 변환
    const resultCSV = stringify(results);
    // S3에 업로드 (test-results 디렉토리에 저장)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultKey = `test-results/result-${timestamp}.csv`;
    await uploadToS3(resultCSV, resultKey);
    
    // 결과 파일 정보를 JSON으로 출력 (Makefile에서 사용)
    console.log(JSON.stringify({
      bucket: process.env.S3_BUCKET,
      key: resultKey
    }));
  } catch (error) {
    console.error('테스트 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

run(); 