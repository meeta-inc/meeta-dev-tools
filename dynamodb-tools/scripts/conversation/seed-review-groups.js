/**
 * Conversation Review Groups Seeding Script
 * Groups low-accuracy conversations (<0.8) and creates review groups
 * 
 * Group Types:
 * - TOPIC: Grouped by topic area (schedule, payment, curriculum, etc.)
 * - SIMILARITY: Grouped by question similarity
 * - INTENT: Grouped by question intent
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const ENV = process.env.NODE_ENV || 'dev';
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
const HISTORY_TABLE = `ai-navi-conversation-history-${ENV}`;
const GROUPS_TABLE = `ai-navi-conversation-review-groups-${ENV}`;

const client = new DynamoDBClient({
  region: AWS_REGION,
  ...(process.env.AWS_PROFILE && { profile: process.env.AWS_PROFILE })
});

const docClient = DynamoDBDocumentClient.from(client);

// Topic areas mapping (Japanese names for groups - generalized question format)
const topicMapping = {
  schedule: ['スケジュール変更について', 'Schedule Management'],
  absence: ['出席管理方法について', 'Attendance Management'],
  withdrawal: ['退会手続きについて', 'Withdrawal Process'],
  payment: ['料金・支払い方法について', 'Payment & Fees'],
  curriculum: ['カリキュラムの詳細について', 'Curriculum & Programs'],
  online: ['オンライン授業の利用について', 'Online Classes'],
  teacher: ['講師に関する情報について', 'Teachers & Staff'],
  facility: ['施設利用方法について', 'Facilities'],
  admission: ['入会手続きについて', 'Admission Process'],
  other: ['その他のお問い合わせについて', 'General Inquiries']
};

// Intent mapping
const intentMapping = {
  schedule: 'schedule_change_request',
  absence: 'absence_notification',
  withdrawal: 'withdrawal_inquiry',
  payment: 'payment_inquiry',
  curriculum: 'program_information',
  online: 'online_class_setup',
  teacher: 'teacher_information',
  facility: 'facility_inquiry',
  admission: 'admission_inquiry',
  other: 'general_inquiry'
};

/**
 * Fetch low-accuracy conversations from history table
 */
async function fetchLowAccuracyConversations() {
  console.log('📊 Fetching low-accuracy conversations from history table...');
  
  const allConversations = [];
  let lastEvaluatedKey = undefined;
  
  do {
    const params = {
      TableName: HISTORY_TABLE
    };
    
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    const response = await docClient.send(new ScanCommand(params));
    const items = response.Items || [];
    
    // Filter for low accuracy conversations
    const lowAccuracyItems = items.filter(item => item.accuracy < 0.8);
    allConversations.push(...lowAccuracyItems);
    
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  
  console.log(`Found ${allConversations.length} low-accuracy conversations`);
  return allConversations;
}

/**
 * Determine topic area from conversation
 */
function determineTopicArea(conversation) {
  const question = conversation.question?.toLowerCase() || '';
  
  if (question.includes('スケジュール') || question.includes('schedule') || question.includes('時間') || question.includes('曜日')) {
    return 'schedule';
  } else if (question.includes('休') || question.includes('欠席') || question.includes('遅') || question.includes('病院')) {
    return 'absence';
  } else if (question.includes('辞め') || question.includes('退会') || question.includes('退塾')) {
    return 'withdrawal';
  } else if (question.includes('料金') || question.includes('支払') || question.includes('振込') || question.includes('授業料')) {
    return 'payment';
  } else if (question.includes('カリキュラム') || question.includes('プログラム') || question.includes('授業') || question.includes('クレファス') || question.includes('レプトン')) {
    return 'curriculum';
  } else if (question.includes('オンライン') || question.includes('online') || question.includes('zoom')) {
    return 'online';
  } else if (question.includes('先生') || question.includes('講師') || question.includes('teacher')) {
    return 'teacher';
  } else if (question.includes('施設') || question.includes('自習') || question.includes('設備') || question.includes('駐車')) {
    return 'facility';
  } else if (question.includes('入会') || question.includes('入塾') || question.includes('体験') || question.includes('テスト')) {
    return 'admission';
  }
  
  return 'other';
}

/**
 * Calculate statistics for a group of conversations
 */
function calculateStatistics(conversations) {
  const accuracies = conversations.map(c => c.accuracy);
  const sum = accuracies.reduce((a, b) => a + b, 0);
  const avg = sum / accuracies.length;
  const min = Math.min(...accuracies);
  const max = Math.max(...accuracies);
  
  // Calculate standard deviation
  const squaredDiffs = accuracies.map(acc => Math.pow(acc - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / accuracies.length;
  const stdDev = Math.sqrt(avgSquaredDiff);
  
  return {
    avgAccuracy: parseFloat(avg.toFixed(3)),
    minAccuracy: parseFloat(min.toFixed(3)),
    maxAccuracy: parseFloat(max.toFixed(3)),
    stdDeviation: parseFloat(stdDev.toFixed(3))
  };
}

/**
 * Determine review priority based on accuracy (1 = highest, 5 = lowest)
 */
function determineReviewPriority(avgAccuracy) {
  if (avgAccuracy < 0.5) return 1;
  if (avgAccuracy < 0.6) return 2;
  if (avgAccuracy < 0.65) return 3;
  if (avgAccuracy < 0.7) return 4;
  return 5;
}

/**
 * Create review groups from conversations (max 5 groups per grade)
 */
async function createReviewGroups(conversations) {
  console.log('\n📝 Creating review groups (max 5 per grade)...');
  
  // Group conversations by clientId and targetAttribute first
  const gradeGroups = {};
  
  conversations.forEach(conv => {
    const gradeKey = `${conv.clientId}#${conv.targetAttribute}`;
    
    if (!gradeGroups[gradeKey]) {
      gradeGroups[gradeKey] = {
        clientId: conv.clientId,
        targetAttribute: conv.targetAttribute,
        conversations: []
      };
    }
    
    gradeGroups[gradeKey].conversations.push(conv);
  });
  
  // Create groups (max 5 per grade)
  const groups = [];
  let globalGroupIndex = 1;
  const now = new Date().toISOString();
  const dateStr = now.split('T')[0].replace(/-/g, '');
  
  // Process each grade
  for (const [gradeKey, gradeData] of Object.entries(gradeGroups)) {
    // Further group by topic within each grade
    const topicGroups = {};
    
    gradeData.conversations.forEach(conv => {
      const topicArea = determineTopicArea(conv);
      if (!topicGroups[topicArea]) {
        topicGroups[topicArea] = [];
      }
      topicGroups[topicArea].push(conv);
    });
    
    // Sort topics by conversation count (descending) and take top 5
    const sortedTopics = Object.entries(topicGroups)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);  // Maximum 5 groups per grade
    
    // Create groups for this grade
    let gradeGroupIndex = 1;
    for (const [topicArea, topicConversations] of sortedTopics) {
      const groupId = `GRP${dateStr}${String(globalGroupIndex).padStart(3, '0')}`;
      const stats = calculateStatistics(topicConversations);
      const priority = determineReviewPriority(stats.avgAccuracy);
      const [topicNameJP, topicNameEN] = topicMapping[topicArea] || ['その他のお問い合わせについて', 'Unknown'];
      
      // Use Japanese question format for group name (without grade/group labels)
      const groupName = topicNameJP;
      
      const group = {
        // Primary Keys
        PK: `GROUP#${groupId}`,
        SK: 'META',
        
        // Group Information
        groupId,
        groupType: 'TOPIC',
        groupName,
        clientId: gradeData.clientId,
        targetAttribute: gradeData.targetAttribute,
        
        // Classification (use Japanese for topicArea display)
        topicArea: topicNameJP,
        questionIntent: intentMapping[topicArea] || 'unknown',
        
        // Accuracy Statistics
        accuracyStats: stats,
        
        // Conversation Management
        conversationIds: topicConversations.map(c => c.conversationId),
        conversationCount: topicConversations.length,
        
        // Review Status
        reviewStatus: 'pending',
        reviewPriority: priority,
        
        // Metadata
        createdAt: now,
        updatedAt: now,
        
        // GSI Keys
        GSI1PK: `CLIENT#${gradeData.clientId}#ATTR#${gradeData.targetAttribute}`,
        GSI1SK: `ACCURACY#${String(stats.avgAccuracy).padStart(5, '0')}#${groupId}`,
        GSI2PK: `STATUS#pending`,
        GSI2SK: `PRIORITY#${priority}#${groupId}`,
        GSI3PK: `TOPIC#${topicNameJP}`,
        GSI3SK: `CLIENT#${gradeData.clientId}#COUNT#${String(topicConversations.length).padStart(3, '0')}`
      };
      
      groups.push(group);
      gradeGroupIndex++;
      globalGroupIndex++;
    }
  }
  
  return groups;
}

/**
 * Insert groups into DynamoDB
 */
async function insertGroups(groups) {
  console.log(`\n💾 Inserting ${groups.length} review groups into DynamoDB...`);
  
  let successCount = 0;
  let failedCount = 0;
  
  for (const group of groups) {
    try {
      await docClient.send(new PutCommand({
        TableName: GROUPS_TABLE,
        Item: group
      }));
      
      console.log(`✅ Created group: ${group.groupId} (${group.groupName})`);
      console.log(`   - Topic: ${group.topicArea}`);
      console.log(`   - Target: ${group.targetAttribute}`);
      console.log(`   - Conversations: ${group.conversationCount}`);
      console.log(`   - Avg Accuracy: ${group.accuracyStats.avgAccuracy}`);
      console.log(`   - Priority: ${group.reviewPriority}`);
      
      successCount++;
      
      // Add delay to avoid throttling
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ Failed to create group ${group.groupId}: ${error.message}`);
      failedCount++;
    }
  }
  
  return { successCount, failedCount };
}

/**
 * Verify groups were created
 */
async function verifyGroups() {
  console.log('\n🔍 Verifying created groups...');
  
  try {
    // Query by review status
    const response = await docClient.send(new QueryCommand({
      TableName: GROUPS_TABLE,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'STATUS#pending'
      }
    }));
    
    const groups = response.Items || [];
    console.log(`\n✅ Found ${groups.length} pending review groups`);
    
    // Group by targetAttribute
    const byAttribute = {};
    groups.forEach(g => {
      if (!byAttribute[g.targetAttribute]) {
        byAttribute[g.targetAttribute] = [];
      }
      byAttribute[g.targetAttribute].push(g);
    });
    
    console.log('\n📊 Groups by Target Attribute:');
    Object.entries(byAttribute).forEach(([attr, grps]) => {
      console.log(`   ${attr}: ${grps.length} groups`);
      const totalConvs = grps.reduce((sum, g) => sum + g.conversationCount, 0);
      console.log(`      - Total conversations: ${totalConvs}`);
    });
    
    // Show priority distribution
    const byPriority = {};
    groups.forEach(g => {
      const p = g.reviewPriority;
      byPriority[p] = (byPriority[p] || 0) + 1;
    });
    
    console.log('\n🎯 Groups by Priority:');
    for (let i = 1; i <= 5; i++) {
      if (byPriority[i]) {
        console.log(`   Priority ${i}: ${byPriority[i]} groups`);
      }
    }
    
    // Show topic distribution
    const byTopic = {};
    groups.forEach(g => {
      const t = g.topicArea;
      byTopic[t] = (byTopic[t] || 0) + 1;
    });
    
    console.log('\n📚 Groups by Topic:');
    Object.entries(byTopic).forEach(([topic, count]) => {
      console.log(`   ${topic}: ${count} groups`);
    });
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Conversation Review Groups seeding...');
  console.log(`Environment: ${ENV}`);
  console.log(`History Table: ${HISTORY_TABLE}`);
  console.log(`Groups Table: ${GROUPS_TABLE}`);
  console.log('-'.repeat(50));
  
  try {
    // Step 1: Fetch low-accuracy conversations
    const conversations = await fetchLowAccuracyConversations();
    
    if (conversations.length === 0) {
      console.log('⚠️ No low-accuracy conversations found');
      return;
    }
    
    // Step 2: Create review groups
    const groups = await createReviewGroups(conversations);
    
    // Step 3: Insert groups into DynamoDB
    const { successCount, failedCount } = await insertGroups(groups);
    
    // Step 4: Verify insertion
    await verifyGroups();
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Groups Created: ${successCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log(`Low-Accuracy Conversations Grouped: ${conversations.length}`);
    
    console.log('\n✨ Review groups creation completed!');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { fetchLowAccuracyConversations, createReviewGroups, insertGroups };