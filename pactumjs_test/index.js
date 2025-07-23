require('dotenv').config();
const { google } = require('googleapis');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Google Sheets API 설정
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

// AWS S3 클라이언트 설정
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function getSheetData() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `${process.env.SHEET_NAME}!${process.env.RANGE}`,
    });

    return response.data.values;
  } catch (error) {
    console.error('스프레드시트 데이터 가져오기 실패:', error);
    throw error;
  }
}

function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  return data.map(row => {
    return row.map(cell => {
      // 셀에 쉼표가 있으면 따옴표로 감싸기
      if (typeof cell === 'string' && cell.includes(',')) {
        return `"${cell}"`;
      }
      return cell;
    }).join(',');
  }).join('\n');
}

async function uploadToS3(csvData) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const key = `sheets-export/${process.env.SHEET_NAME}-${timestamp}.csv`;

  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: csvData,
      ContentType: 'text/csv',
    }));

    console.log(`CSV 파일이 성공적으로 업로드되었습니다: ${key}`);
    return {
      bucket: process.env.S3_BUCKET,
      key: key
    };
  } catch (error) {
    console.error('S3 업로드 실패:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('스프레드시트 데이터 가져오는 중...');
    const sheetData = await getSheetData();
    
    console.log('CSV로 변환 중...');
    const csvData = convertToCSV(sheetData);
    
    console.log('S3에 업로드 중...');
    const s3Info = await uploadToS3(csvData);
    
    console.log('프로세스가 성공적으로 완료되었습니다.');
    // S3 정보를 JSON 형식으로 출력
    console.log(JSON.stringify(s3Info));
  } catch (error) {
    console.error('프로세스 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

main(); 