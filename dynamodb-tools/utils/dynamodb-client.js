/**
 * DynamoDB 클라이언트 유틸리티
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { fromIni } = require('@aws-sdk/credential-provider-ini');

/**
 * DynamoDB 클라이언트 생성
 * @param {Object} config - 환경 설정
 * @returns {DynamoDBDocumentClient} DynamoDB Document 클라이언트
 */
function createDynamoDBClient(config) {
  const client = new DynamoDBClient({
    region: config.region,
    credentials: fromIni({ profile: config.profile })
  });

  // Document Client로 변환 (자동 마샬링/언마샬링)
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertClassInstanceToMap: true
    },
    unmarshallOptions: {
      wrapNumbers: false
    }
  });
}

module.exports = {
  createDynamoDBClient
};