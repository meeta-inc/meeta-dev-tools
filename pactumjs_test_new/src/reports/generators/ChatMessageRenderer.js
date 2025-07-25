const fs = require('fs');
const path = require('path');

/**
 * 채팅 메시지 렌더링 클래스
 * 테스트 요청/응답을 ChatMessage 스타일로 렌더링
 */
class ChatMessageRenderer {
  constructor(options = {}) {
    this.options = {
      brandColor: options.brandColor || '#12DE00',
      userBubbleColor: options.userBubbleColor || '#EBEBEB',
      assistantBubbleColor: options.assistantBubbleColor || '#F5F5F5',
      templateDir: options.templateDir || path.join(__dirname, '../templates'),
      ...options
    };
  }

  /**
   * 채팅 메시지 HTML 렌더링
   * @param {Array} messages - 채팅 메시지 배열
   * @param {Object} options - 렌더링 옵션
   */
  renderMessages(messages, options = {}) {
    if (!Array.isArray(messages) || messages.length === 0) {
      return '<div class="no-messages">No chat messages available</div>';
    }

    // 메시지를 그룹으로 묶기 (연속된 같은 타입의 메시지들)
    const groups = this.groupMessages(messages);
    return groups.map(group => this.renderMessageGroup(group, options)).join('\n');
  }

  /**
   * 메시지를 그룹으로 묶기
   * @param {Array} messages - 메시지 배열
   */
  groupMessages(messages) {
    const groups = [];
    let currentGroup = null;

    messages.forEach(message => {
      if (!currentGroup || currentGroup.type !== message.type) {
        // 새로운 그룹 시작
        currentGroup = {
          type: message.type,
          messages: [message]
        };
        groups.push(currentGroup);
      } else {
        // 같은 타입이면 현재 그룹에 추가
        currentGroup.messages.push(message);
      }
    });

    return groups;
  }

  /**
   * 메시지 그룹 렌더링
   * @param {Object} group - 메시지 그룹
   * @param {Object} options - 렌더링 옵션
   */
  renderMessageGroup(group, options = {}) {
    const messageClass = this.getMessageClass(group.messages[0]);
    
    if (group.type === 'assistant') {
      // Assistant 메시지 그룹: 여러 버블을 세로로 배치하고 마지막에 아바타
      const bubbles = group.messages.map(message => {
        const bubbleClass = this.getBubbleClass(message);
        const content = this.formatMessageContent(message.content);
        
        return `
          <div class="message-bubble ${bubbleClass}">
            <div class="message-content">
              ${content}
            </div>
          </div>
        `;
      }).join('\n');

      return `
        <div class="chat-message ${messageClass}">
          <div class="message-container">
            <div class="bubbles-container">
              ${bubbles}
            </div>
            ${this.renderMessageAvatar(group.messages[0])}
          </div>
        </div>
      `;
    } else {
      // User 메시지: 기존 방식 유지
      return group.messages.map(message => this.renderSingleMessage(message, options)).join('\n');
    }
  }

  /**
   * 개별 메시지 렌더링
   * @param {Object} message - 메시지 객체
   * @param {Object} options - 렌더링 옵션
   */
  renderSingleMessage(message, options = {}) {
    const messageClass = this.getMessageClass(message);
    const bubbleClass = this.getBubbleClass(message);
    const timestamp = this.formatTimestamp(message.timestamp);
    const content = this.formatMessageContent(message.content);

    // 사용자 메시지의 경우 metadata 제거
    const metadataHtml = message.type === 'user' ? '' : `
      <div class="message-metadata">
        <span class="message-time">${timestamp}</span>
        ${this.renderBubbleType(message.bubbleType)}
        ${this.renderResponseTime(message.responseTime)}
      </div>
    `;

    return `
      <div class="chat-message ${messageClass}">
        <div class="message-container">
          <div class="message-bubble ${bubbleClass}">
            <div class="message-content">
              ${content}
            </div>
            ${metadataHtml}
          </div>
          ${this.renderMessageAvatar(message)}
        </div>
      </div>
    `;
  }

  /**
   * 메시지 CSS 클래스 결정
   */
  getMessageClass(message) {
    const baseClass = 'message';
    const typeClass = message.type === 'user' ? 'message-user' : 'message-assistant';
    const statusClass = message.status ? `message-${message.status}` : '';
    
    return [baseClass, typeClass, statusClass].filter(Boolean).join(' ');
  }

  /**
   * 버블 CSS 클래스 결정
   */
  getBubbleClass(message) {
    const baseClass = 'bubble';
    const typeClass = message.type === 'user' ? 'bubble-user' : 'bubble-assistant';
    const bubbleTypeClass = message.bubbleType ? `bubble-${message.bubbleType}` : 'bubble-main';
    
    return [baseClass, typeClass, bubbleTypeClass].filter(Boolean).join(' ');
  }

  /**
   * 메시지 내용 포맷팅
   */
  formatMessageContent(content) {
    if (!content) return '';

    // JSON 객체인 경우 예쁘게 표시
    if (typeof content === 'object') {
      return `<pre class="json-content">${JSON.stringify(content, null, 2)}</pre>`;
    }

    // 문자열인 경우 HTML 이스케이프 및 줄바꿈 처리
    return String(content)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  /**
   * 타임스탬프 포맷팅
   */
  formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return timestamp;
    }
  }

  /**
   * 버블 타입 렌더링
   */
  renderBubbleType(bubbleType) {
    if (!bubbleType || bubbleType === 'main') return '';
    
    const typeLabels = {
      sub: 'Sub',
      cta: 'CTA',
      system: 'System',
      error: 'Error'
    };
    
    const label = typeLabels[bubbleType] || bubbleType;
    return `<span class="bubble-type-label bubble-type-${bubbleType}">${label}</span>`;
  }

  /**
   * 응답 시간 렌더링
   */
  renderResponseTime(responseTime) {
    if (!responseTime) return '';
    
    return `<span class="response-time">${responseTime}ms</span>`;
  }

  /**
   * 메시지 아바타 렌더링
   */
  renderMessageAvatar(message) {
    const isUser = message.type === 'user';
    const avatarClass = isUser ? 'avatar-user' : 'avatar-assistant';
    const avatarIcon = isUser ? '👤' : '🤖';
    
    return `
      <div class="message-avatar ${avatarClass}">
        <span class="avatar-icon">${avatarIcon}</span>
      </div>
    `;
  }

  /**
   * 요청/응답 비교 뷰 렌더링
   * @param {Object} request - 요청 데이터
   * @param {Object} response - 실제 응답 데이터
   * @param {Object} expectedResponse - 예상 응답 데이터
   */
  renderComparisonView(request, response, expectedResponse) {
    return `
      <div class="comparison-container">
        <div class="comparison-header">
          <h4>Request vs Response Comparison</h4>
        </div>
        
        <div class="comparison-grid">
          <div class="comparison-section">
            <h5>Request</h5>
            <div class="chat-message message-user">
              <div class="message-container">
                <div class="message-bubble bubble-user">
                  <div class="message-content">
                    ${this.formatMessageContent(request)}
                  </div>
                </div>
                <div class="message-avatar avatar-user">
                  <span class="avatar-icon">👤</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="comparison-section">
            <h5>Actual Response</h5>
            <div class="chat-message message-assistant">
              <div class="message-container">
                <div class="message-bubble bubble-assistant">
                  <div class="message-content">
                    ${this.formatMessageContent(response)}
                  </div>
                </div>
                <div class="message-avatar avatar-assistant">
                  <span class="avatar-icon">🤖</span>
                </div>
              </div>
            </div>
          </div>
          
          ${expectedResponse ? `
          <div class="comparison-section">
            <h5>Expected Response</h5>
            <div class="chat-message message-assistant expected">
              <div class="message-container">
                <div class="message-bubble bubble-expected">
                  <div class="message-content">
                    ${this.formatMessageContent(expectedResponse)}
                  </div>
                </div>
                <div class="message-avatar avatar-expected">
                  <span class="avatar-icon">✓</span>
                </div>
              </div>
            </div>
          </div>
          ` : ''}
        </div>
        
        ${this.renderDiffHighlights(response, expectedResponse)}
      </div>
    `;
  }

  /**
   * 차이점 하이라이트 렌더링
   */
  renderDiffHighlights(actual, expected) {
    if (!expected) return '';
    
    // 간단한 텍스트 차이 비교 (추후 고도화 가능)
    const actualStr = JSON.stringify(actual, null, 2);
    const expectedStr = JSON.stringify(expected, null, 2);
    
    if (actualStr === expectedStr) {
      return `
        <div class="diff-status success">
          <span class="diff-icon">✅</span>
          <span class="diff-message">Response matches expected result</span>
        </div>
      `;
    }
    
    return `
      <div class="diff-status error">
        <span class="diff-icon">❌</span>
        <span class="diff-message">Response differs from expected result</span>
        <button class="diff-toggle" onclick="toggleDiffDetails(this)">
          Show Details
        </button>
        <div class="diff-details" style="display: none;">
          <div class="diff-section">
            <h6>Actual:</h6>
            <pre class="diff-content actual">${actualStr}</pre>
          </div>
          <div class="diff-section">
            <h6>Expected:</h6>
            <pre class="diff-content expected">${expectedStr}</pre>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 대화 스레드 전체 렌더링
   * @param {Array} conversations - 대화 스레드 배열
   */
  renderConversationThread(conversations) {
    if (!Array.isArray(conversations) || conversations.length === 0) {
      return '<div class="no-conversations">No conversation data available</div>';
    }

    return `
      <div class="conversation-thread">
        ${conversations.map((conv, index) => this.renderSingleConversation(conv, index)).join('\n')}
      </div>
    `;
  }

  /**
   * 개별 대화 렌더링
   */
  renderSingleConversation(conversation, index) {
    const messages = conversation.messages || [];
    const metadata = conversation.metadata || {};
    
    return `
      <div class="conversation-item" data-conversation-id="${conversation.id || index}">
        <div class="conversation-header">
          <div class="conversation-title">
            <h4>${conversation.title || `Conversation ${index + 1}`}</h4>
            <span class="conversation-status status-${conversation.status || 'unknown'}">
              ${conversation.status || 'Unknown'}
            </span>
          </div>
          <div class="conversation-metadata">
            <span class="conversation-time">${this.formatTimestamp(conversation.timestamp)}</span>
            <span class="message-count">${messages.length} messages</span>
            ${conversation.responseTime ? `<span class="total-response-time">${conversation.responseTime}ms</span>` : ''}
          </div>
        </div>
        
        <div class="conversation-messages">
          ${this.renderMessages(messages)}
        </div>
        
        ${conversation.comparison ? this.renderComparisonView(
          conversation.comparison.request,
          conversation.comparison.response,
          conversation.comparison.expected
        ) : ''}
      </div>
    `;
  }

  /**
   * ChatMessage CSS 스타일 생성 - 비활성화됨 (chat-message.css 파일 사용)
   */
  generateChatMessageCSS() {
    // CSS 파일을 사용하므로 빈 문자열 반환
    return '';
  }
}

module.exports = ChatMessageRenderer;