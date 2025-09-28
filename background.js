class WebSocketClient {
  constructor(url = 'ws://localhost:11808') {
    this.url = url;
    this.ws = null;
    this.isConnected = false;
    this.reconnectInterval = 3000; // 3秒重连间隔
    this.maxReconnectAttempts = 10;
    this.reconnectAttempts = 0;
    this.messageQueue = []; // 离线消息队列
    
    this.connect();
  }

  connect() {
    try {
      console.log(`Attempting to connect to ${this.url}`);
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = (event) => {
        console.log('WebSocket connected to server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // 发送排队的消息
        this.flushMessageQueue();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received message from server:', message);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        this.isConnected = false;
        this.handleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.handleReconnect();
    }
  }
  
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectInterval}ms`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
      
      // 指数退避策略
      this.reconnectInterval = Math.min(this.reconnectInterval * 1.5, 30000);
    } else {
      console.error('Max reconnection attempts reached. Please restart the server.');
    }
  }
  
  handleMessage(message) {
    switch (message.type) {
      case 'dom_operation':
        this.handleDOMOperation(message);
        break;
      case 'ping':
        this.sendMessage({ type: 'pong', timestamp: new Date().toISOString() });
        break;
      case 'status_response':
      case 'pong':
        // 服务器响应，无需特殊处理
        break;
      default:
        console.log('Unhandled message type:', message.type);
    }
  }
  
  async handleDOMOperation(command) {
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      try {
        // 发送命令给content script
        const result = await chrome.tabs.sendMessage(tab.id, command);
        console.log('DOM operation result:', result);
        
        // 将结果发送回服务器
        this.sendMessage({
          type: 'dom_operation_result',
          command: command,
          result: result,
          tabId: tab.id,
          url: tab.url,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to execute DOM operation:', error);
        // 发送错误结果回服务器
        this.sendMessage({
          type: 'dom_operation_result',
          command: command,
          result: { success: false, error: error.message },
          tabId: tab.id,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.error('No active tab found');
      this.sendMessage({
        type: 'dom_operation_result',
        command: command,
        result: { success: false, error: 'No active tab found' },
        timestamp: new Date().toISOString()
      });
    }
  }
  
  sendMessage(message) {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        console.log('Sent message to server:', message);
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.messageQueue.push(message);
      }
    } else {
      console.log('WebSocket not connected, queuing message:', message);
      this.messageQueue.push(message);
    }
  }
  
  flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      this.sendMessage(message);
    }
  }
  
  // API methods for compatibility with original HTTP client
  async sendCommand(command, params = {}) {
    const message = {
      type: 'command',
      command: command,
      params: params,
      timestamp: new Date().toISOString()
    };
    
    return new Promise((resolve) => {
      // 为WebSocket添加请求ID以便跟踪响应
      message.requestId = this.generateRequestId();
      this.sendMessage(message);
      
      // 简化处理：立即返回成功状态
      // 在实际应用中可能需要实现请求-响应匹配
      resolve({ 
        success: true, 
        message: 'Command sent via WebSocket',
        requestId: message.requestId 
      });
    });
  }
  
  async sendQuery(query, filters = {}) {
    const message = {
      type: 'query',
      query: query,
      filters: filters,
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId()
    };
    
    this.sendMessage(message);
    return { success: true, message: 'Query sent via WebSocket' };
  }
  
  async getStatus() {
    const message = {
      type: 'status_request',
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId()
    };
    
    this.sendMessage(message);
    return { 
      success: true, 
      connected: this.isConnected,
      readyState: this.ws ? this.ws.readyState : -1
    };
  }
  
  generateRequestId() {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // 心跳检测
  startHeartbeat() {
    setInterval(() => {
      if (this.isConnected) {
        this.sendMessage({ 
          type: 'heartbeat', 
          timestamp: new Date().toISOString() 
        });
      }
    }, 30000); // 每30秒发送心跳
  }
}

// 创建WebSocket客户端
const wsClient = new WebSocketClient();
wsClient.startHeartbeat();

// 监听来自content script的消息
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('Received from content script:', message);
  
  try {
    let response;
    
    switch (message.type) {
      case 'command':
        response = await wsClient.sendCommand(message.command, message.params);
        break;
      case 'query':
        response = await wsClient.sendQuery(message.query, message.filters);
        break;
      case 'status':
        response = await wsClient.getStatus();
        break;
      default:
        // 发送原始消息
        wsClient.sendMessage(message);
        response = { success: true, message: 'Message sent via WebSocket' };
    }
    
    sendResponse({ success: true, data: response });
    
  } catch (error) {
    console.error('Failed to handle message:', error);
    sendResponse({ 
      success: false, 
      error: error.message,
      connected: wsClient.isConnected
    });
  }
  
  return true; // 保持消息通道开放
});


// 连接状态监控
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup - reinitializing WebSocket connection');
});

chrome.runtime.onSuspend.addListener(() => {
  console.log('Extension suspending - closing WebSocket connection');
  if (wsClient.ws) {
    wsClient.ws.close(1000, 'Extension suspend');
  }
});

// 标签页更新时通知服务器
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    wsClient.sendMessage({
      type: 'tab_updated',
      tabId: tabId,
      url: tab.url,
      title: tab.title,
      timestamp: new Date().toISOString()
    });
  }
});

// 标签页激活时通知服务器
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    wsClient.sendMessage({
      type: 'tab_activated',
      tabId: activeInfo.tabId,
      url: tab.url,
      title: tab.title,
      timestamp: new Date().toISOString()
    });
  });
});