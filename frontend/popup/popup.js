class PopupApp {
  constructor() {
    this.apiUrl = 'http://localhost:3000/api';
    this.currentSearchKeyword = '';
    this.searchResults = null;
    this.isSearching = false;
    
    // DOM元素引用
    this.searchInput = document.getElementById('searchInput');
    this.clearBtn = document.getElementById('clearBtn');
    this.searchBtn = document.getElementById('searchBtn');
    this.limitSelect = document.getElementById('limitSelect');
    this.resultsSection = document.getElementById('resultsSection');
    this.results = document.getElementById('results');
    this.searchSummary = document.getElementById('searchSummary');
    this.loadingStatus = document.getElementById('loadingStatus');
    this.errorStatus = document.getElementById('errorStatus');
    this.emptyStatus = document.getElementById('emptyStatus');
    this.statusSection = document.getElementById('statusSection');
    this.searchHistory = document.getElementById('searchHistory');
    this.historyList = document.getElementById('historyList');
    this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
    this.retryBtn = document.getElementById('retryBtn');
    this.apiStatus = document.getElementById('apiStatus');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    
    this.init();
  }
  
  async init() {
    console.log('🚀 商品比价助手初始化...');
    
    // 绑定事件监听器
    this.bindEvents();
    
    // 加载用户设置
    await this.loadSettings();
    
    // 加载搜索历史
    await this.loadSearchHistory();
    
    // 检查API连接状态
    await this.checkApiStatus();
    
    // 焦点到搜索框
    this.searchInput.focus();
    
    console.log('✅ 商品比价助手初始化完成');
  }
  
  bindEvents() {
    // 搜索相关事件
    this.searchBtn.addEventListener('click', () => this.handleSearch());
    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !this.isSearching) {
        this.handleSearch();
      }
    });
    
    // 清空输入框
    this.clearBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.searchInput.focus();
      this.hideSearchHistory();
    });
    
    // 输入框变化事件
    this.searchInput.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      if (value.length > 0) {
        this.showSearchHistory();
      } else {
        this.hideSearchHistory();
      }
    });
    
    // 搜索框焦点事件
    this.searchInput.addEventListener('focus', () => {
      if (this.searchInput.value.trim().length === 0) {
        this.showSearchHistory();
      }
    });
    
    // 搜索历史事件
    this.clearHistoryBtn.addEventListener('click', () => this.clearSearchHistory());
    
    // 重试按钮
    this.retryBtn.addEventListener('click', () => this.handleSearch());
    
    // 设置变化事件
    this.limitSelect.addEventListener('change', () => this.saveSettings());
    
    // 平台选择变化事件
    const platformCheckboxes = document.querySelectorAll('.platform-checkbox input[type="checkbox"]');
    platformCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => this.saveSettings());
    });
    
    // 底部按钮事件
    document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
    document.getElementById('feedbackBtn').addEventListener('click', () => this.showFeedback());
    document.getElementById('aboutBtn').addEventListener('click', () => this.showAbout());
  }
  
  async handleSearch() {
    const keyword = this.searchInput.value.trim();
    
    // 输入验证
    if (!keyword) {
      this.showError('请输入搜索关键词');
      this.searchInput.focus();
      return;
    }
    
    if (keyword.length < 2) {
      this.showError('搜索关键词至少需要2个字符');
      this.searchInput.focus();
      return;
    }
    
    if (keyword.length > 50) {
      this.showError('搜索关键词不能超过50个字符');
      return;
    }
    
    // 获取选中的平台
    const selectedPlatforms = this.getSelectedPlatforms();
    if (selectedPlatforms.length === 0) {
      this.showError('请至少选择一个搜索平台');
      return;
    }
    
    const limit = parseInt(this.limitSelect.value);
    
    console.log(`开始搜索: "${keyword}" 平台: [${selectedPlatforms.join(', ')}] 数量: ${limit}`);
    
    this.currentSearchKeyword = keyword;
    this.setSearching(true);
    this.hideAllStatus();
    this.showStatus('loading');
    
    try {
      // 构建搜索URL
      const searchUrl = `${this.apiUrl}/search?` + new URLSearchParams({
        keyword: keyword,
        platforms: selectedPlatforms.join(','),
        limit: limit.toString(),
        timeout: '20'
      });
      
      console.log('请求URL:', searchUrl);
      
      // 开始进度动画
      this.startProgressAnimation();
      
      // 发送搜索请求
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log('搜索结果:', data);
      
      if (data.success) {
        this.searchResults = data.data;
        this.displayResults(data.data);
        await this.saveSearchHistory(keyword);
        this.hideSearchHistory();
      } else {
        throw new Error(data.error || '搜索失败');
      }
      
    } catch (error) {
      console.error('搜索错误:', error);
      this.handleSearchError(error);
    } finally {
      this.setSearching(false);
      this.stopProgressAnimation();
    }
  }
  
  startProgressAnimation() {
    let progress = 0;
    const increment = Math.random() * 3 + 1; // 1-4% per interval
    
    this.progressInterval = setInterval(() => {
      progress += increment;
      if (progress >= 95) {
        progress = 95;
        clearInterval(this.progressInterval);
      }
      
      this.progressFill.style.width = `${progress}%`;
      this.progressText.textContent = `${Math.round(progress)}%`;
    }, 200);
  }
  
  stopProgressAnimation() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    
    // 完成动画
    this.progressFill.style.width = '100%';
    this.progressText.textContent = '100%';
    
    setTimeout(() => {
      this.progressFill.style.width = '0%';
      this.progressText.textContent = '0%';
    }, 500);
  }
  
  getSelectedPlatforms() {
    const checkboxes = document.querySelectorAll('.platform-checkbox input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
  }
  
  displayResults(data) {
    console.log('显示搜索结果');
    
    // 显示搜索摘要
    this.displaySearchSummary(data);
    
    // 显示商品结果
    this.displayProducts(data);
    
    // 显示结果区域
    this.hideAllStatus();
    this.resultsSection.style.display = 'block';
    
    // 滚动到结果区域
    this.resultsSection.scrollIntoView({ behavior: 'smooth' });
  }
  
  displaySearchSummary(data) {
    const successfulPlatforms = data.successfulPlatforms || 0;
    const totalPlatforms = data.totalPlatforms || 0;
    const totalProducts = data.totalProducts || 0;
    const searchTime = data.searchTime || 0;
    
    this.searchSummary.innerHTML = `
      <div class="summary-stats">
        <div class="summary-keyword">搜索：${data.keyword}</div>
        <div class="summary-time">${searchTime}ms</div>
      </div>
      <div class="summary-info">
        找到 <strong>${totalProducts}</strong> 个商品，成功搜索 <strong>${successfulPlatforms}/${totalPlatforms}</strong> 个平台
      </div>
      <div class="summary-platforms">
        ${this.generatePlatformStatusTags(data.platforms)}
      </div>
    `;
  }
  
  generatePlatformStatusTags(platforms) {
    const platformNames = {
      jd: '京东',
      taobao: '淘宝',
      pdd: '拼多多',
      ali1688: '1688'
    };
    
    return Object.entries(platforms).map(([platform, result]) => {
      const name = platformNames[platform] || platform;
      const statusClass = result.success ? 'success' : 'error';
      const count = result.products ? result.products.length : 0;
      const text = result.success ? `${name}(${count})` : `${name}(失败)`;
      
      return `<span class="platform-status ${statusClass}">${text}</span>`;
    }).join('');
  }
  
  displayProducts(data) {
    this.results.innerHTML = '';
    
    if (data.totalProducts === 0) {
      this.showStatus('empty');
      return;
    }
    
    const platformNames = {
      jd: '京东',
      taobao: '淘宝',
      pdd: '拼多多',
      ali1688: '1688'
    };
    
    const platformColors = {
      jd: '#e23e3e',
      taobao: '#ff6900',
      pdd: '#e02e24',
      ali1688: '#f40'
    };
    
    Object.entries(data.platforms).forEach(([platform, result]) => {
      if (!result.success || !result.products || result.products.length === 0) {
        return;
      }
      
      const platformSection = document.createElement('div');
      platformSection.className = 'platform-section';
      
      const platformName = platformNames[platform] || platform;
      const platformColor = platformColors[platform] || '#666';
      
      platformSection.innerHTML = `
        <div class="platform-header">
          <div class="platform-title" style="color: ${platformColor}">
            <div class="platform-icon" style="background: ${platformColor}"></div>
            ${platformName}
          </div>
          <div class="platform-stats">
            ${result.products.length} 个商品 · ${result.scrapeTime}ms
          </div>
        </div>
        <div class="products-grid">
          ${result.products.map(product => this.generateProductCard(product, platform)).join('')}
        </div>
      `;
      
      this.results.appendChild(platformSection);
    });
  }
  
  generateProductCard(product, platform) {
    const imageUrl = product.imageUrl || 'assets/no-image.png';
    const price = product.price && product.price !== '价格待询' ? `¥${product.price}` : '价格待询';
    const shopInfo = product.shop && product.shop.name ? product.shop.name : '官方店铺';
    const extraInfo = product.sales || product.reviewCount || product.minOrder || '';
    
    return `
      <div class="product-card" data-platform="${platform}">
        <div class="product-content">
          <img src="${imageUrl}" alt="${product.title}" class="product-image" 
               onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik0yMCAyMEg0MFY0MEgyMFYyMFoiIGZpbGw9IiNFMUU4RUQiLz4KPC9zdmc+Cg=='">
          <div class="product-info">
            <div class="product-title" title="${product.title}">${product.title}</div>
            <div class="product-price">${price}</div>
            <div class="product-meta">
              <span class="product-shop">${shopInfo}</span>
              ${extraInfo ? `<span class="product-extra">${extraInfo}</span>` : ''}
            </div>
            ${product.url && product.url !== '#' ? 
              `<a href="${product.url}" target="_blank" class="product-link">查看详情 →</a>` : 
              ''
            }
          </div>
        </div>
      </div>
    `;
  }
  
  handleSearchError(error) {
    console.error('处理搜索错误:', error);
    
    let errorMessage = '搜索失败，请稍后重试';
    
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorMessage = '无法连接到服务器，请检查：\n1. 后端服务是否启动\n2. 网络连接是否正常\n3. 防火墙设置';
    } else if (error.message.includes('timeout') || error.message.includes('超时')) {
      errorMessage = '搜索超时，请稍后重试';
    } else if (error.message.includes('400')) {
      errorMessage = '搜索参数错误，请检查输入';
    } else if (error.message.includes('429')) {
      errorMessage = '请求过于频繁，请稍后重试';
    } else if (error.message.includes('500')) {
      errorMessage = '服务器内部错误，请稍后重试';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    this.showError(errorMessage);
  }
  
  showError(message) {
    console.error('显示错误:', message);
    this.hideAllStatus();
    document.getElementById('errorMessage').textContent = message;
    this.showStatus('error');
  }
  
  setSearching(isSearching) {
    this.isSearching = isSearching;
    this.searchBtn.disabled = isSearching;
    
    if (isSearching) {
      this.searchBtn.classList.add('loading');
    } else {
      this.searchBtn.classList.remove('loading');
    }
  }
  
  hideAllStatus() {
    this.resultsSection.style.display = 'none';
    this.loadingStatus.style.display = 'none';
    this.errorStatus.style.display = 'none';
    this.emptyStatus.style.display = 'none';
  }
  
  showStatus(type) {
    this.statusSection.style.display = 'block';
    
    switch (type) {
      case 'loading':
        this.loadingStatus.style.display = 'block';
        break;
      case 'error':
        this.errorStatus.style.display = 'block';
        break;
      case 'empty':
        this.emptyStatus.style.display = 'block';
        break;
    }
  }
  
  // 搜索历史管理
  async loadSearchHistory() {
    try {
      const result = await chrome.storage.local.get(['searchHistory']);
      const history = result.searchHistory || [];
      this.displaySearchHistory(history);
    } catch (error) {
      console.error('加载搜索历史失败:', error);
    }
  }
  
  displaySearchHistory(history) {
    if (history.length === 0) {
      return;
    }
    
    this.historyList.innerHTML = history
      .slice(0, 8) // 最多显示8个
      .map(keyword => `
        <span class="history-item" data-keyword="${keyword}">${keyword}</span>
      `).join('');
    
    // 为历史项绑定点击事件
    this.historyList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const keyword = item.getAttribute('data-keyword');
        this.searchInput.value = keyword;
        this.hideSearchHistory();
        this.handleSearch();
      });
    });
  }
  
  showSearchHistory() {
    this.loadSearchHistory().then(() => {
      const hasHistory = this.historyList.children.length > 0;
      this.searchHistory.style.display = hasHistory ? 'block' : 'none';
    });
  }
  
  hideSearchHistory() {
    this.searchHistory.style.display = 'none';
  }
  
  async saveSearchHistory(keyword) {
    try {
      const result = await chrome.storage.local.get(['searchHistory']);
      const history = result.searchHistory || [];
      
      // 移除重复项并添加到开头
      const updatedHistory = [keyword, ...history.filter(k => k !== keyword)].slice(0, 10);
      
      await chrome.storage.local.set({ searchHistory: updatedHistory });
      console.log('搜索历史已保存:', keyword);
    } catch (error) {
      console.error('保存搜索历史失败:', error);
    }
  }
  
  async clearSearchHistory() {
    try {
      await chrome.storage.local.remove(['searchHistory']);
      this.historyList.innerHTML = '';
      this.hideSearchHistory();
      console.log('搜索历史已清空');
    } catch (error) {
      console.error('清空搜索历史失败:', error);
    }
  }
  
  // 设置管理
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['userSettings']);
      const settings = result.userSettings || {
        defaultPlatforms: ['jd', 'taobao', 'pdd', 'ali1688'],
        maxResults: 5,
        cacheEnabled: true
      };
      
      // 应用设置到界面
      this.applySettings(settings);
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }
  
  applySettings(settings) {
    // 设置默认平台选择
    const platformCheckboxes = document.querySelectorAll('.platform-checkbox input[type="checkbox"]');
    platformCheckboxes.forEach(checkbox => {
      checkbox.checked = settings.defaultPlatforms.includes(checkbox.value);
    });
    
    // 设置默认商品数量
    this.limitSelect.value = settings.maxResults.toString();
  }
  
  async saveSettings() {
    try {
      const settings = {
        defaultPlatforms: this.getSelectedPlatforms(),
        maxResults: parseInt(this.limitSelect.value),
        cacheEnabled: true
      };
      
      await chrome.storage.sync.set({ userSettings: settings });
      console.log('设置已保存:', settings);
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  }
  
  // API状态检查
  async checkApiStatus() {
    try {
      this.apiStatus.textContent = 'API: 检查中...';
      this.apiStatus.className = 'api-status';
      
      const response = await fetch(`${this.apiUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.json();
        this.apiStatus.textContent = 'API: 已连接';
        this.apiStatus.className = 'api-status connected';
        console.log('API服务正常:', data);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      this.apiStatus.textContent = 'API: 连接失败';
      this.apiStatus.className = 'api-status disconnected';
      console.warn('API服务连接失败:', error.message);
    }
  }
  
  // 界面功能
  showSettings() {
    alert('设置功能开发中...');
  }
  
  showFeedback() {
    alert('感谢您的反馈！\n\n如有问题或建议，请联系开发者。');
  }
  
  showAbout() {
    alert('商品比价助手 v1.0.0\n\n一键比较京东、淘宝、拼多多、1688商品价格\n快速找到最优惠的商品\n\n开发者：Your Name\n更新时间：2025-06-13');
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM加载完成，初始化应用...');
  new PopupApp();
});

// 错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason);
});
