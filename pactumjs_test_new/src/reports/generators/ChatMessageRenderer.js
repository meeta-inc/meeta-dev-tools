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
      userBubbleColor: options.userBubbleColor || '#007AFF',
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

    return messages.map(message => this.renderSingleMessage(message, options)).join('\n');
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

    return `
      <div class="chat-message ${messageClass}">
        <div class="message-container">
          <div class="message-bubble ${bubbleClass}">
            <div class="message-content">
              ${content}
            </div>
            <div class="message-metadata">
              <span class="message-time">${timestamp}</span>
              ${this.renderBubbleType(message.bubbleType)}
              ${this.renderResponseTime(message.responseTime)}
            </div>
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
   * ChatMessage CSS 스타일 생성
   */
  generateChatMessageCSS() {
    return `
      /* Chat Message Styles */
      .chat-message {
        margin: 1rem 0;
        display: flex;
        align-items: flex-end;
      }
      
      .message-user {
        justify-content: flex-end;
        flex-direction: row-reverse;
      }
      
      .message-assistant {
        justify-content: flex-start;
      }
      
      .message-container {
        display: flex;
        align-items: flex-end;
        max-width: 70%;
        gap: 0.5rem;
      }
      
      .message-bubble {
        padding: 0.75rem 1rem;
        border-radius: 1rem;
        position: relative;
        word-wrap: break-word;
      }
      
      .bubble-user {
        background-color: ${this.options.userBubbleColor};
        color: white;
        border-bottom-right-radius: 0.25rem;
      }
      
      .bubble-assistant {
        background-color: ${this.options.assistantBubbleColor};
        color: #333;
        border-bottom-left-radius: 0.25rem;
        border: 1px solid #e0e0e0;
      }
      
      .bubble-expected {
        background-color: #f0f8ff;
        color: #333;
        border: 2px solid #4CAF50;
      }
      
      .message-content {
        line-height: 1.4;
      }
      
      .message-metadata {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.25rem;
        font-size: 0.75rem;
        opacity: 0.7;
      }
      
      .message-avatar {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        flex-shrink: 0;
      }
      
      .avatar-user {
        background-color: ${this.options.userBubbleColor};
      }
      
      .avatar-assistant {
        background-color: ${this.options.brandColor};
      }
      
      .avatar-expected {
        background-color: #4CAF50;
        color: white;
      }
      
      .json-content {
        background: rgba(0,0,0,0.05);
        padding: 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.875rem;
        max-height: 200px;
        overflow-y: auto;
      }
      
      .bubble-type-label {
        background: rgba(0,0,0,0.1);
        padding: 0.125rem 0.375rem;
        border-radius: 0.75rem;
        font-size: 0.625rem;
        text-transform: uppercase;
        font-weight: 600;
      }
      
      .response-time {
        color: #666;
        font-weight: 500;
      }
      
      /* Comparison View Styles */
      .comparison-container {
        margin: 1.5rem 0;
        border: 1px solid #e0e0e0;
        border-radius: 0.5rem;
        overflow: hidden;
      }
      
      .comparison-header {
        background: #f8f9fa;
        padding: 1rem;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .comparison-grid {
        display: grid;
        grid-gap: 1rem;
        padding: 1rem;
      }
      
      .comparison-section h5 {
        margin-bottom: 0.5rem;
        color: #666;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .diff-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: #f8f9fa;
        border-top: 1px solid #e0e0e0;
      }
      
      .diff-status.success {
        background: #f0f8ff;
        color: #4CAF50;
      }
      
      .diff-status.error {
        background: #fff5f5;
        color: #F44336;
      }
      
      .diff-toggle {
        margin-left: auto;
        background: none;
        border: 1px solid currentColor;
        color: inherit;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        cursor: pointer;
        font-size: 0.75rem;
      }
      
      .diff-details {
        margin-top: 1rem;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      
      .diff-content {
        background: #f8f9fa;
        padding: 0.75rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        overflow-x: auto;
      }
      
      /* Conversation Thread Styles */
      .conversation-thread {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }
      
      .conversation-item {
        border: 1px solid #e0e0e0;
        border-radius: 0.5rem;
        overflow: hidden;
      }
      
      .conversation-header {
        background: #f8f9fa;
        padding: 1rem;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .conversation-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      
      .conversation-status {
        padding: 0.25rem 0.5rem;
        border-radius: 1rem;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .status-passed {
        background: #4CAF50;
        color: white;
      }
      
      .status-failed {
        background: #F44336;
        color: white;
      }
      
      .status-unknown {
        background: #757575;
        color: white;
      }
      
      .conversation-metadata {
        display: flex;
        align-items: center;
        gap: 1rem;
        font-size: 0.875rem;
        color: #666;
      }
      
      .conversation-messages {
        padding: 1rem;
      }
      
      @media (max-width: 768px) {
        .message-container {
          max-width: 85%;
        }
        
        .comparison-grid {
          grid-template-columns: 1fr;
        }
        
        .diff-details {
          grid-template-columns: 1fr;
        }
        
        .conversation-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
        }
        
        .conversation-metadata {
          gap: 0.5rem;
          flex-wrap: wrap;
        }
      }
    `;
  }
}

module.exports = ChatMessageRenderer;