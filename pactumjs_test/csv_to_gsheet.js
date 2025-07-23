require('dotenv').config();
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { google } = require('googleapis');
const { parse } = require('csv-parse/sync');
const { IncomingWebhook } = require('@slack/webhook');

// Slack Webhook 초기화
const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);

// Slack으로 알림 전송
async function sendSlackNotification(sheetId, testInfo) {
  try {
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;
    const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    
    const message = {
      icon_emoji: ":robot_face:",
      username: "테스트 자동화 봇",
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🧪 테스트 결과 리포트",
            emoji: true
          }
        },
        {
          type: "divider"
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*📅 실행 시간:*\n${timestamp}`
            },
            {
              type: "mrkdwn",
              text: `*🔍 테스트 범위:*\n${testInfo}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*📊 결과 확인하기*\n아래 링크를 클릭하여 상세 결과를 확인하세요."
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `<${sheetUrl}|📈 구글 시트에서 결과 보기>`
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: "결과 보기",
              emoji: true
            },
            style: "primary",
            url: sheetUrl
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: "🤖 자동화된 테스트 결과 리포트"
            }
          ]
        }
      ]
    };
    await webhook.send(message);
    console.log('Slack 알림 전송 완료!');
  } catch (error) {
    console.error('Slack 알림 전송 실패:', error);
  }
}

// S3에서 CSV 다운로드
async function downloadCSVFromS3(bucket, key) {
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);
  return await streamToString(response.Body);
}

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    stream.on('error', reject);
  });
}

// 구글 인증
function getGoogleAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
  });
}

// 구글 스프레드시트 생성
async function createGoogleSheet(auth, title) {
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });
  
  // 시트 생성
  const res = await sheets.spreadsheets.create({
    resource: { properties: { title } },
    fields: 'spreadsheetId'
  });
  
  const spreadsheetId = res.data.spreadsheetId;
  
  // 공유 설정 (누구나 링크로 볼 수 있도록)
  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    }
  });
  
  return spreadsheetId;
}

// 시트에 데이터 업로드
async function uploadToSheet(auth, spreadsheetId, values) {
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    requestBody: { values }
  });
  console.log('구글 시트에 데이터 업로드 완료!');
}

async function main() {
  // 명령행 인자에서 S3 정보 받기
  const args = process.argv.slice(2);
  const bucketArg = args.find(arg => arg.startsWith('--bucket='))?.split('=')[1];
  const keyArg = args.find(arg => arg.startsWith('--key='))?.split('=')[1];
  const testsArg = args.find(arg => arg.startsWith('--tests='))?.split('=')[1];

  if (!bucketArg || !keyArg) {
    console.error('사용법: node csv_to_gsheet.js --bucket=버킷이름 --key=파일경로 [--tests=테스트번호들]');
    process.exit(1);
  }

  try {
    // test-results 디렉토리의 결과 파일 사용
    const resultKey = keyArg;
    console.log(`S3에서 CSV 파일을 다운로드합니다: ${bucketArg}/${resultKey}`);
    const csvString = await downloadCSVFromS3(bucketArg, resultKey);
    const records = parse(csvString, { skip_empty_lines: true });

    // 헤더 인덱스 파악
    const header = records[0];
    const bodyIdx = header.indexOf('응답결과_바디');
    // 새 헤더
    const newHeader = [...header.slice(0, bodyIdx), 'response', 'tool', ...header.slice(bodyIdx + 1)];
    const newRows = [newHeader];

    // 각 행 변환
    for (let i = 1; i < records.length; i++) {
      const row = records[i];
      let response = '';
      let tool = '';
      try {
        const body = JSON.parse(row[bodyIdx]);
        response = body.response ?? '';
        tool = body.tool ? JSON.stringify(body.tool) : '';
      } catch (e) {
        // 파싱 실패 시 빈 값
        console.warn(`행 ${i} 파싱 실패:`, e);
      }
      const newRow = [...row.slice(0, bodyIdx), response, tool, ...row.slice(bodyIdx + 1)];
      newRows.push(newRow);
    }

    // 구글 인증 및 시트 생성
    const auth = getGoogleAuth();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sheetTitle = `테스트 결과 ${timestamp}`;
    const sheetId = await createGoogleSheet(auth, sheetTitle);
    await uploadToSheet(auth, sheetId, newRows);

    // Slack 알림 전송
    const testInfo = testsArg ? `실행된 테스트: ${testsArg}` : '전체 테스트 실행';
    await sendSlackNotification(sheetId, testInfo);

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;
    console.log(`구글 시트 생성 완료! ${sheetUrl}`);
  } catch (error) {
    console.error('처리 중 오류 발생:', error);
    process.exit(1);
  }
}

main(); 