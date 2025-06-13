// Chrome扩展后台脚本 (Service Worker)

// 扩展安装时执行
chrome.runtime.onInstalled.addListener((details) => {
  console.log('商品比价助手已安装');
  
  if (details.reason === 'install') {
    // 首次安装
    console.log('首次安装，初始化默认设置...');
    initializeDefaultSettings();
    
    // 可以打开欢迎页面
    // chrome.tabs.create({ url: 'welcome.html' });
  } else if (details.reason === 'update') {
    // 扩展更新
    console.log('扩展已更新到版本:', chrome.runtime.getManifest().version);
  }
});

// 扩展启动时执行
chrome.runtime.onStartup.addListener(() => {
  console.log('商品比价助手启动');
});

// 初始化默认设置
async function initializeDefaultSettings() {
  try {
    const defaultSettings = {
      defaultPlatforms: ['jd', 'taobao', 'pdd', 'ali1688'],
      maxResults: 5,
      cacheEnabled: true,
      autoSearch: false,
      theme: 'light',
      notifications: true,
      apiUrl: 'http://localhost:3000/api'
    };
    
    await chrome.storage.sync.set({ userSettings: defaultSettings });
    console.log('默认设置初始化完成:', defaultSettings);
  } catch (error) {
    console.error('初始化默认设置失败:', error);
  }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到消息:', message);
  
  switch (message.type) {
    case 'SEARCH_PRODUCTS':
      handleSearchRequest(message.data)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // 保持消息通道开放
      
    case 'GET_SETTINGS':
      getSettings()
        .then(settings => sendResponse({ success: true, data: settings }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'SAVE_SETTINGS':
      saveSettings(message.data)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'CLEAR_CACHE':
      clearCache()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'CHECK_API_STATUS':
      checkApiStatus()
        .then(status => sendResponse({ success: true, data: status }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    default:
      console.warn('未知消息类型:', message.type);
      sendResponse({ success: false, error: '未知消息类型' });
  }
});

// 处理搜索请求
async function handleSearchRequest(searchData) {
  const { keyword, platforms, limit } = searchData;
  
  try {
    // 获取API地址
    const settings = await getSettings();
    const apiUrl = settings.apiUrl || 'http://localhost:3000/api';
    
    // 构建请求URL
    const searchUrl = `${apiUrl}/search?` + new URLSearchParams({
      keyword: keyword,
      platforms: platforms.join(','),
      limit: limit.toString()
    });
    
    console.log('后台发起搜索请求:', searchUrl);
    
    // 发送请求
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '搜索失败');
    }
    
    // 缓存搜索结果
    await cacheSearchResult(keyword, platforms, result.data);
    
    return result.data;
    
  } catch (error) {
    console.error('后台搜索失败:', error);
    throw error;
  }
}

// 获取设置
async function getSettings() {
  try {
    const result = await chrome.storage.sync.get(['userSettings']);
    return result.userSettings || {
      defaultPlatforms: ['jd', 'taobao', 'pdd', 'ali1688'],
      maxResults: 5,
      cacheEnabled: true,
      autoSearch: false,
      theme: 'light',
      notifications: true,
      apiUrl: 'http://localhost:3000/api'
    };
  } catch (error) {
    console.error('获取设置失败:', error);
    throw error;
  }
}

// 保存设置
async function saveSettings(settings) {
  try {
    await chrome.storage.sync.set({ userSettings: settings });
    console.log('设置已保存:', settings);
  } catch (error) {
    console.error('保存设置失败:', error);
    throw error;
  }
}

// 缓存搜索结果
async function cacheSearchResult(keyword, platforms, data) {
  try {
    const cacheKey = `search_${keyword}_${platforms.join('_')}`;
    const cacheData = {
      data: data,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000 // 5分钟
    };
    
    await chrome.storage.local.set({ [cacheKey]: cacheData });
    console.log('搜索结果已缓存:', cacheKey);
  } catch (error) {
    console.error('缓存搜索结果失败:', error);
  }
}

// 获取缓存的搜索结果
async function getCachedSearchResult(keyword, platforms) {
  try {
    const cacheKey = `search_${keyword}_${platforms.join('_')}`;
    const result = await chrome.storage.local.get([cacheKey]);
    const cached = result[cacheKey];
    
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      console.log('命中缓存:', cacheKey);
      return cached.data;
    }
    
    return null;
  } catch (error) {
    console.error('获取缓存失败:', error);
    return null;
  }
}

// 清理缓存
async function clearCache() {
  try {
    const storage = await chrome.storage.local.get(null);
    const keysToRemove = [];
    
    for (const [key, value] of Object.entries(storage)) {
      if (key.startsWith('search_') && value.timestamp) {
        keysToRemove.push(key);
      }
    }
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log(`已清理 ${keysToRemove.length} 个缓存项`);
    }
  } catch (error) {
    console.error('清理缓存失败:', error);
    throw error;
  }
}

// 检查API状态
async function checkApiStatus() {
  try {
    const settings = await getSettings();
    const apiUrl = settings.apiUrl || 'http://localhost:3000/api';
    
    const response = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      // 不能在Service Worker中使用timeout，使用AbortController替代
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        status: 'connected',
        version: data.data?.version || 'unknown',
        uptime: data.data?.uptime || 0
      };
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    return {
      status: 'disconnected',
      error: error.message
    };
  }
}

// 定期清理过期缓存（每30分钟）
setInterval(async () => {
  try {
    const storage = await chrome.storage.local.get(null);
    const keysToRemove = [];
    const now = Date.now();
    
    for (const [key, value] of Object.entries(storage)) {
      if (key.startsWith('search_') && value.timestamp && value.ttl) {
        if (now - value.timestamp > value.ttl) {
          keysToRemove.push(key);
        }
      }
    }
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log(`定期清理: 删除 ${keysToRemove.length} 个过期缓存`);
    }
  } catch (error) {
    console.error('定期清理缓存失败:', error);
  }
}, 30 * 60 * 1000); // 30分钟

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('存储变化:', namespace, changes);
  
  if (namespace === 'sync' && changes.userSettings) {
    console.log('用户设置已更新:', changes.userSettings.newValue);
  }
});

// 扩展图标点击处理（可选）
chrome.action.onClicked.addListener((tab) => {
  console.log('扩展图标被点击');
  // 这里可以添加额外的逻辑，比如在当前页面注入脚本等
});

// 错误处理
self.addEventListener('error', (event) => {
  console.error('Service Worker错误:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker未处理的Promise拒绝:', event.reason);
});

console.log('商品比价助手后台脚本已加载');
