# 🚀 商品比价插件 - MVP快速开始指南

## 📌 MVP目标

快速实现一个可用的商品比价插件，验证核心功能：
- 用户输入商品关键词
- 搜索四个平台（京东、淘宝、拼多多、1688）
- 展示价格比较结果

## ⚡ 30分钟快速启动

### 第一步：项目初始化（5分钟）

```bash
# 1. 创建项目目录
mkdir bijia-mvp
cd bijia-mvp

# 2. 初始化项目
npm init -y

# 3. 安装核心依赖
npm install express cors express-rate-limit puppeteer puppeteer-extra puppeteer-extra-plugin-stealth

# 4. 创建目录结构
mkdir -p src/{services,storage,cache,scrapers,controllers,middleware} 
mkdir -p plugin/{popup,assets,utils}
mkdir -p data logs cache
```

### 第二步：后端核心代码（15分钟）

#### 1. 创建主服务文件 `src/app.js`
```javascript
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const SearchController = require('./controllers/searchController');

const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 简单限流
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, error: '请求过于频繁，请稍后重试' }
});
app.use('/api/', limiter);

// 路由
app.get('/api/search', SearchController.search);
app.get('/api/health', SearchController.health);

app.listen(port, () => {
  console.log(`🚀 商品比价API启动: http://localhost:${port}`);
  console.log(`📖 测试地址: http://localhost:${port}/api/health`);
});

module.exports = app;
```

#### 2. 创建搜索控制器 `src/controllers/searchController.js`
```javascript
const SearchService = require('../services/searchService');

class SearchController {
  static async search(req, res) {
    const { keyword, platforms = 'jd,taobao,pdd,ali1688', limit = 5 } = req.query;
    
    try {
      if (!keyword || keyword.length < 2) {
        return res.status(400).json({
          success: false,
          error: '搜索关键词至少需要2个字符'
        });
      }
      
      const platformList = platforms.split(',').filter(p => 
        ['jd', 'taobao', 'pdd', 'ali1688'].includes(p)
      );
      
      const result = await SearchService.search(keyword, platformList, parseInt(limit));
      res.json(result);
      
    } catch (error) {
      console.error('搜索错误:', error);
      res.status(500).json({
        success: false,
        error: '搜索服务暂时不可用'
      });
    }
  }
  
  static health(req, res) {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      }
    });
  }
}

module.exports = SearchController;
```

#### 3. 创建搜索服务 `src/services/searchService.js`
```javascript
const JDScraper = require('../scrapers/jdScraper');
const TaobaoScraper = require('../scrapers/taobaoScraper');
const PDDScraper = require('../scrapers/pddScraper');
const Ali1688Scraper = require('../scrapers/ali1688Scraper');

class SearchService {
  static scrapers = {
    jd: new JDScraper(),
    taobao: new TaobaoScraper(),
    pdd: new PDDScraper(),
    ali1688: new Ali1688Scraper()
  };
  
  static async search(keyword, platforms, limit) {
    const startTime = Date.now();
    
    // 并发搜索
    const promises = platforms.map(platform => 
      this.searchPlatform(platform, keyword, limit)
    );
    
    const results = await Promise.allSettled(promises);
    
    // 整理结果
    const platformResults = {};
    let totalProducts = 0;
    
    platforms.forEach((platform, index) => {
      const result = results[index];
      if (result.status === 'fulfilled') {
        platformResults[platform] = result.value;
        totalProducts += result.value.products.length;
      } else {
        platformResults[platform] = {
          success: false,
          error: result.reason.message,
          products: []
        };
      }
    });
    
    return {
      success: true,
      data: {
        keyword,
        searchTime: Date.now() - startTime,
        totalPlatforms: platforms.length,
        totalProducts,
        platforms: platformResults
      }
    };
  }
  
  static async searchPlatform(platform, keyword, limit) {
    const scraper = this.scrapers[platform];
    if (!scraper) {
      throw new Error(`不支持的平台: ${platform}`);
    }
    
    return await scraper.search(keyword, limit);
  }
}

module.exports = SearchService;
```

#### 4. 创建简单的京东爬虫 `src/scrapers/jdScraper.js`
```javascript
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class JDScraper {
  async search(keyword, limit = 5) {
    const startTime = Date.now();
    let browser;
    
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      // 访问京东搜索页面
      const searchUrl = `https://search.jd.com/Search?keyword=${encodeURIComponent(keyword)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      
      // 等待商品列表
      await page.waitForSelector('#J_goodsList .gl-item', { timeout: 10000 });
      
      // 提取商品信息
      const products = await page.evaluate((limit) => {
        const items = document.querySelectorAll('#J_goodsList .gl-item');
        const results = [];
        
        for (let i = 0; i < Math.min(items.length, limit); i++) {
          const item = items[i];
          
          try {
            const titleEl = item.querySelector('.p-name a em, .p-name a');
            const priceEl = item.querySelector('.p-price strong i');
            const linkEl = item.querySelector('.p-name a');
            const imgEl = item.querySelector('.p-img img');
            
            const title = titleEl?.textContent?.trim();
            const price = priceEl?.textContent?.trim();
            const url = linkEl?.href;
            const imageUrl = imgEl?.getAttribute('data-lazy-img') || imgEl?.src;
            
            if (title && price && url) {
              results.push({
                title,
                price,
                url,
                imageUrl: imageUrl ? 'https:' + imageUrl : '',
                platform: 'jd'
              });
            }
          } catch (error) {
            console.error('提取商品信息失败:', error);
          }
        }
        
        return results;
      }, limit);
      
      return {
        success: true,
        products,
        scrapeTime: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        products: [],
        scrapeTime: Date.now() - startTime
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = JDScraper;
```

#### 5. 其他平台爬虫（复制并修改）
```bash
# 创建其他爬虫文件（结构类似JDScraper）
cp src/scrapers/jdScraper.js src/scrapers/taobaoScraper.js
cp src/scrapers/jdScraper.js src/scrapers/pddScraper.js  
cp src/scrapers/jdScraper.js src/scrapers/ali1688Scraper.js

# 注意：需要修改各个文件中的搜索URL和元素选择器
```

### 第三步：前端插件代码（10分钟）

#### 1. 创建插件配置 `plugin/manifest.json`
```json
{
  "manifest_version": 3,
  "name": "商品比价助手",
  "version": "1.0.0",
  "description": "一键比较京东、淘宝、拼多多、1688商品价格",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "http://localhost:3000/*"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "商品比价助手"
  },
  "icons": {
    "16": "assets/icon16.png",
    "48": "assets/icon48.png",
    "128": "assets/icon128.png"
  }
}
```

#### 2. 创建弹窗页面 `plugin/popup/popup.html`
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { width: 400px; min-height: 500px; margin: 0; font-family: Arial, sans-serif; }
    .header { background: #1976d2; color: white; padding: 16px; text-align: center; }
    .search-section { padding: 16px; }
    .search-input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px; }
    .search-btn { width: 100%; padding: 12px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .search-btn:hover { background: #1565c0; }
    .results { padding: 16px; }
    .product-card { border: 1px solid #ddd; margin-bottom: 12px; padding: 12px; border-radius: 4px; }
    .platform { font-weight: bold; color: #1976d2; }
    .title { margin: 8px 0; font-size: 14px; }
    .price { color: #f44336; font-weight: bold; font-size: 16px; }
    .loading { text-align: center; padding: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>商品比价助手</h1>
  </div>
  
  <div class="search-section">
    <input type="text" id="searchInput" class="search-input" placeholder="请输入商品名称，如：蓝牙耳机">
    <button id="searchBtn" class="search-btn">搜索比价</button>
  </div>
  
  <div id="results" class="results"></div>
  
  <script src="popup.js"></script>
</body>
</html>
```

#### 3. 创建弹窗逻辑 `plugin/popup/popup.js`
```javascript
class PopupApp {
  constructor() {
    this.searchInput = document.getElementById('searchInput');
    this.searchBtn = document.getElementById('searchBtn');
    this.results = document.getElementById('results');
    
    this.init();
  }
  
  init() {
    this.searchBtn.addEventListener('click', () => this.handleSearch());
    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSearch();
    });
    
    // 加载搜索历史
    this.loadSearchHistory();
  }
  
  async handleSearch() {
    const keyword = this.searchInput.value.trim();
    if (!keyword) {
      alert('请输入搜索关键词');
      return;
    }
    
    this.setSearching(true);
    
    try {
      const response = await fetch(`http://localhost:3000/api/search?keyword=${encodeURIComponent(keyword)}`);
      const data = await response.json();
      
      if (data.success) {
        this.displayResults(data.data);
        this.saveSearchHistory(keyword);
      } else {
        this.showError(data.error);
      }
    } catch (error) {
      this.showError('网络连接失败，请检查后端服务是否启动');
    } finally {
      this.setSearching(false);
    }
  }
  
  displayResults(data) {
    this.results.innerHTML = '';
    
    // 显示搜索信息
    const searchInfo = document.createElement('div');
    searchInfo.innerHTML = `
      <p><strong>搜索关键词:</strong> ${data.keyword}</p>
      <p><strong>搜索时间:</strong> ${data.searchTime}ms</p>
      <p><strong>找到商品:</strong> ${data.totalProducts}个</p>
      <hr>
    `;
    this.results.appendChild(searchInfo);
    
    // 显示各平台商品
    Object.entries(data.platforms).forEach(([platform, result]) => {
      const platformSection = document.createElement('div');
      platformSection.innerHTML = `<h3 class="platform">${this.getPlatformName(platform)}</h3>`;
      
      if (result.success && result.products.length > 0) {
        result.products.forEach(product => {
          const productCard = document.createElement('div');
          productCard.className = 'product-card';
          productCard.innerHTML = `
            <div class="title">${product.title}</div>
            <div class="price">¥${product.price}</div>
            <a href="${product.url}" target="_blank">查看详情</a>
          `;
          platformSection.appendChild(productCard);
        });
      } else {
        const errorDiv = document.createElement('div');
        errorDiv.textContent = result.error || '暂无商品';
        errorDiv.style.color = '#999';
        platformSection.appendChild(errorDiv);
      }
      
      this.results.appendChild(platformSection);
    });
  }
  
  setSearching(isSearching) {
    this.searchBtn.disabled = isSearching;
    this.searchBtn.textContent = isSearching ? '搜索中...' : '搜索比价';
    
    if (isSearching) {
      this.results.innerHTML = '<div class="loading">正在搜索商品...</div>';
    }
  }
  
  showError(message) {
    this.results.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">${message}</div>`;
  }
  
  getPlatformName(platform) {
    const names = {
      jd: '京东',
      taobao: '淘宝',
      pdd: '拼多多', 
      ali1688: '1688'
    };
    return names[platform] || platform;
  }
  
  async saveSearchHistory(keyword) {
    const history = await this.getSearchHistory();
    const updated = [keyword, ...history.filter(k => k !== keyword)].slice(0, 10);
    await chrome.storage.local.set({ searchHistory: updated });
  }
  
  async getSearchHistory() {
    const result = await chrome.storage.local.get(['searchHistory']);
    return result.searchHistory || [];
  }
  
  async loadSearchHistory() {
    // 可以在这里显示搜索历史建议
  }
}

// 初始化应用
new PopupApp();
```

## 🧪 测试运行

### 1. 启动后端服务
```bash
cd bijia-mvp
node src/app.js
```

### 2. 测试API
```bash
# 测试健康检查
curl http://localhost:3000/api/health

# 测试搜索（可能需要较长时间）
curl "http://localhost:3000/api/search?keyword=蓝牙耳机&limit=2"
```

### 3. 加载Chrome插件
1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `plugin` 文件夹
6. 插件安装完成后，点击插件图标测试

## ⚡ 优化建议

### 性能优化
```javascript
// 添加简单缓存（内存）
const searchCache = new Map();

// 在SearchService中添加缓存逻辑
static async search(keyword, platforms, limit) {
  const cacheKey = `${keyword}_${platforms.join(',')}_${limit}`;
  
  // 检查缓存
  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5分钟缓存
      return cached.data;
    }
  }
  
  const result = await this.performSearch(keyword, platforms, limit);
  
  // 保存到缓存
  searchCache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  });
  
  return result;
}
```

### 错误处理增强
```javascript
// 添加重试机制
static async searchWithRetry(platform, keyword, limit, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await this.searchPlatform(platform, keyword, limit);
    } catch (error) {
      if (i === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## 📋 MVP完成检查清单

### 后端核心功能
- [ ] Express API服务启动成功
- [ ] 至少一个平台爬虫可以正常工作
- [ ] 搜索接口返回正确格式的数据
- [ ] 基础错误处理和日志记录
- [ ] 健康检查接口正常

### 前端插件功能  
- [ ] Chrome插件成功加载
- [ ] 搜索界面正常显示
- [ ] 可以向后端发送搜索请求
- [ ] 能够正确显示搜索结果
- [ ] 基础错误提示正常

### 联调测试
- [ ] 前后端数据格式对接正确
- [ ] 搜索流程完整可用
- [ ] 错误情况处理正常
- [ ] 基本性能可接受（搜索时间<10秒）

## 🚀 下一步计划

完成MVP后，可以考虑：
1. **完善爬虫**: 实现其他三个平台的爬虫
2. **优化性能**: 添加缓存、并发控制
3. **增强UI**: 美化界面、添加加载动画  
4. **数据存储**: 引入Redis缓存
5. **部署上线**: 使用Docker部署到服务器

这个MVP方案让您在最短时间内验证核心功能，无需复杂的数据库配置！
