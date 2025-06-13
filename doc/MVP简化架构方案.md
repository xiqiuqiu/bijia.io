# 🚀 商品比价插件 - MVP简化架构方案

## 📌 MVP目标

快速验证产品核心价值，最小化技术复杂度，专注于核心功能：
- ✅ 用户输入商品关键词
- ✅ 调用后端API搜索四个平台
- ✅ 展示价格比较结果

## 🏗️ 简化架构图

```
┌─────────────────┐      ┌─────────────────┐
│   Chrome插件    │────▶ │   Node.js API   │
│   (前端)        │      │   (Express)     │  
│                 │      │                 │
│ • 搜索界面      │      │ • 搜索接口      │
│ • 结果展示      │      │ • 爬虫服务      │
│ • 本地缓存      │      │ • 内存缓存      │
└─────────────────┘      └─────────────────┘
         │                         │
         │                         │
┌─────────▼─────────┐      ┌───────▼─────────┐
│   浏览器存储      │      │   文件系统      │
│                   │      │                 │
│ • localStorage    │      │ • 日志文件      │
│ • sessionStorage  │      │ • 配置文件      │
│ • Chrome Storage  │      │ • 临时缓存      │
└───────────────────┘      └─────────────────┘
```

## 💾 MVP数据存储策略

### 1. 前端数据存储（浏览器）

#### Chrome Extension Storage API
```javascript
// 搜索历史存储
class MVPStorage {
  // 保存搜索历史
  static async saveSearchHistory(keyword) {
    const history = await this.getSearchHistory();
    const updated = [keyword, ...history.filter(k => k !== keyword)].slice(0, 10);
    
    await chrome.storage.local.set({ 
      searchHistory: updated,
      lastUpdated: Date.now()
    });
  }
  
  // 获取搜索历史
  static async getSearchHistory() {
    const result = await chrome.storage.local.get(['searchHistory']);
    return result.searchHistory || [];
  }
  
  // 缓存搜索结果（5分钟）
  static async cacheSearchResult(keyword, data) {
    const cacheKey = `search_${keyword}`;
    const cacheData = {
      data: data,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000 // 5分钟
    };
    
    await chrome.storage.local.set({ [cacheKey]: cacheData });
  }
  
  // 获取缓存的搜索结果
  static async getCachedResult(keyword) {
    const cacheKey = `search_${keyword}`;
    const result = await chrome.storage.local.get([cacheKey]);
    const cached = result[cacheKey];
    
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      return cached.data;
    }
    
    return null;
  }
  
  // 清理过期缓存
  static async cleanExpiredCache() {
    const storage = await chrome.storage.local.get(null);
    const keysToRemove = [];
    
    for (const [key, value] of Object.entries(storage)) {
      if (key.startsWith('search_') && value.timestamp) {
        if (Date.now() - value.timestamp > value.ttl) {
          keysToRemove.push(key);
        }
      }
    }
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
    }
  }
  
  // 用户偏好设置
  static async saveSettings(settings) {
    await chrome.storage.sync.set({ userSettings: settings });
  }
  
  static async getSettings() {
    const result = await chrome.storage.sync.get(['userSettings']);
    return result.userSettings || {
      defaultPlatforms: ['jd', 'taobao', 'pdd', 'ali1688'],
      maxResults: 5,
      cacheEnabled: true
    };
  }
}
```

### 2. 后端数据存储（文件系统）

#### 简单的文件存储方案
```javascript
// src/storage/fileStorage.js
const fs = require('fs').promises;
const path = require('path');

class FileStorage {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.logsDir = path.join(__dirname, '../../logs');
    this.cacheDir = path.join(__dirname, '../../cache');
    
    this.init();
  }
  
  async init() {
    // 创建必要的目录
    await this.ensureDir(this.dataDir);
    await this.ensureDir(this.logsDir);
    await this.ensureDir(this.cacheDir);
  }
  
  async ensureDir(dir) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
  
  // 简单的API访问日志
  async logApiAccess(logData) {
    const logFile = path.join(this.logsDir, `access_${this.getDateString()}.log`);
    const logLine = JSON.stringify({
      ...logData,
      timestamp: new Date().toISOString()
    }) + '\n';
    
    await fs.appendFile(logFile, logLine);
  }
  
  // 错误日志
  async logError(error, context = '') {
    const logFile = path.join(this.logsDir, `error_${this.getDateString()}.log`);
    const logLine = JSON.stringify({
      error: error.message,
      stack: error.stack,
      context: context,
      timestamp: new Date().toISOString()
    }) + '\n';
    
    await fs.appendFile(logFile, logLine);
  }
  
  // 简单的搜索结果缓存
  async cacheSearchResult(keyword, platforms, data) {
    const cacheKey = this.generateCacheKey(keyword, platforms);
    const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
    
    const cacheData = {
      keyword,
      platforms,
      data,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000 // 5分钟
    };
    
    await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
  }
  
  // 获取缓存的搜索结果
  async getCachedResult(keyword, platforms) {
    const cacheKey = this.generateCacheKey(keyword, platforms);
    const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
    
    try {
      const cached = JSON.parse(await fs.readFile(cacheFile, 'utf-8'));
      
      if (Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }
    } catch {
      // 缓存文件不存在或损坏
    }
    
    return null;
  }
  
  // 清理过期缓存
  async cleanExpiredCache() {
    try {
      const files = await fs.readdir(this.cacheDir);
      const now = Date.now();
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          try {
            const cached = JSON.parse(await fs.readFile(filePath, 'utf-8'));
            if (now - cached.timestamp > cached.ttl) {
              await fs.unlink(filePath);
            }
          } catch {
            // 删除损坏的缓存文件
            await fs.unlink(filePath);
          }
        }
      }
    } catch (error) {
      console.error('清理缓存失败:', error);
    }
  }
  
  // 简单的统计数据
  async saveStats(date, stats) {
    const statsFile = path.join(this.dataDir, `stats_${date}.json`);
    await fs.writeFile(statsFile, JSON.stringify(stats, null, 2));
  }
  
  // 获取统计数据
  async getStats(date) {
    const statsFile = path.join(this.dataDir, `stats_${date}.json`);
    try {
      return JSON.parse(await fs.readFile(statsFile, 'utf-8'));
    } catch {
      return {
        date,
        totalRequests: 0,
        successfulRequests: 0,
        uniqueKeywords: new Set(),
        platformStats: {}
      };
    }
  }
  
  generateCacheKey(keyword, platforms) {
    const key = `${keyword}_${platforms.sort().join('_')}`;
    return Buffer.from(key).toString('base64').replace(/[/+=]/g, '_');
  }
  
  getDateString() {
    return new Date().toISOString().split('T')[0];
  }
}

module.exports = FileStorage;
```

### 3. 内存缓存（临时数据）

```javascript
// src/cache/memoryCache.js
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    
    // 定期清理过期缓存
    setInterval(() => this.cleanup(), 60000); // 每分钟清理一次
  }
  
  set(key, value, ttl = 300000) { // 默认5分钟
    // 清除旧的定时器
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    // 设置值
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
    
    // 设置过期定时器
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);
    
    this.timers.set(key, timer);
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  delete(key) {
    this.cache.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }
  
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.delete(key);
      }
    }
  }
  
  clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.cache.clear();
    this.timers.clear();
  }
  
  size() {
    return this.cache.size;
  }
  
  stats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;
    
    for (const item of this.cache.values()) {
      if (now - item.timestamp > item.ttl) {
        expired++;
      } else {
        valid++;
      }
    }
    
    return { valid, expired, total: this.cache.size };
  }
}

module.exports = MemoryCache;
```

## 🔧 MVP版本的API服务

```javascript
// src/app.js - 简化版本
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const FileStorage = require('./storage/fileStorage');
const MemoryCache = require('./cache/memoryCache');
const SearchService = require('./services/searchService');

const app = express();
const port = process.env.PORT || 3000;

// 初始化存储和缓存
const fileStorage = new FileStorage();
const memoryCache = new MemoryCache();
const searchService = new SearchService(memoryCache, fileStorage);

// 中间件
app.use(cors());
app.use(express.json());

// 简单限流
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 20, // 最多20次请求
  message: { success: false, error: '请求过于频繁，请稍后重试' }
});
app.use('/api/', limiter);

// 搜索接口
app.get('/api/search', async (req, res) => {
  const startTime = Date.now();
  const { keyword, platforms = 'jd,taobao,pdd,ali1688', limit = 5 } = req.query;
  
  try {
    // 参数验证
    if (!keyword || keyword.length < 2) {
      return res.status(400).json({
        success: false,
        error: '搜索关键词至少需要2个字符'
      });
    }
    
    const platformList = platforms.split(',').filter(p => 
      ['jd', 'taobao', 'pdd', 'ali1688'].includes(p)
    );
    
    if (platformList.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请指定有效的平台'
      });
    }
    
    // 搜索商品
    const result = await searchService.search(keyword, platformList, parseInt(limit));
    
    // 记录访问日志
    await fileStorage.logApiAccess({
      endpoint: '/api/search',
      keyword,
      platforms: platformList,
      responseTime: Date.now() - startTime,
      success: true,
      ip: req.ip
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('搜索错误:', error);
    
    // 记录错误日志
    await fileStorage.logError(error, `/api/search - keyword: ${keyword}`);
    
    res.status(500).json({
      success: false,
      error: '搜索服务暂时不可用，请稍后重试'
    });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      cache: memoryCache.stats(),
      timestamp: new Date().toISOString()
    }
  });
});

// 启动服务
app.listen(port, () => {
  console.log(`🚀 商品比价API服务已启动: http://localhost:${port}`);
  console.log(`📖 健康检查: http://localhost:${port}/api/health`);
  
  // 定期清理缓存
  setInterval(async () => {
    await fileStorage.cleanExpiredCache();
  }, 10 * 60 * 1000); // 每10分钟清理一次
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('正在关闭服务...');
  memoryCache.clear();
  process.exit(0);
});

module.exports = app;
```

## 🎯 MVP版本优势

### ✅ 优点
1. **快速开发**: 无需设置数据库，减少配置复杂度
2. **零依赖**: 不需要安装Redis、PostgreSQL等
3. **轻量部署**: 单个Node.js进程即可运行
4. **成本低**: 无数据库服务器成本
5. **简单调试**: 文件存储易于查看和调试

### ⚠️ 限制
1. **数据丢失风险**: 服务重启时内存数据丢失
2. **扩展性差**: 无法水平扩展
3. **性能有限**: 文件I/O性能不如数据库
4. **功能受限**: 无法实现复杂查询和分析
5. **并发能力**: 受文件系统并发限制

## 🔄 升级路径

### 从MVP到生产版本的迁移策略

```javascript
// 数据迁移脚本示例
class DataMigration {
  static async migrateToDatabase() {
    console.log('开始数据迁移...');
    
    // 1. 迁移搜索历史
    const historyFiles = await this.getHistoryFiles();
    for (const file of historyFiles) {
      await this.migrateSearchHistory(file);
    }
    
    // 2. 迁移统计数据
    const statsFiles = await this.getStatsFiles();
    for (const file of statsFiles) {
      await this.migrateStats(file);
    }
    
    // 3. 迁移日志数据
    await this.migrateLogs();
    
    console.log('数据迁移完成');
  }
  
  static async migrateSearchHistory(file) {
    // 读取文件数据并写入数据库
    // 实现细节...
  }
  
  static async migrateStats(file) {
    // 迁移统计数据
    // 实现细节...
  }
  
  static async migrateLogs() {
    // 迁移日志到Elasticsearch
    // 实现细节...
  }
}
```

## 📋 MVP开发检查清单

### 前端开发
- [ ] Chrome插件基础结构
- [ ] 搜索界面实现
- [ ] 结果展示组件
- [ ] 本地存储管理
- [ ] 错误处理机制

### 后端开发
- [ ] Express服务搭建
- [ ] 四个平台爬虫实现
- [ ] 文件存储系统
- [ ] 内存缓存实现
- [ ] 基础日志记录

### 测试验证
- [ ] 接口功能测试
- [ ] 爬虫稳定性测试
- [ ] 错误处理测试
- [ ] 性能基准测试
- [ ] 用户体验测试

## 🚀 MVP快速启动

```bash
# 1. 创建项目结构
mkdir pricecompare-mvp
cd pricecompare-mvp

# 2. 初始化项目
npm init -y

# 3. 安装必要依赖
npm install express cors express-rate-limit puppeteer puppeteer-extra puppeteer-extra-plugin-stealth

# 4. 创建目录结构
mkdir -p src/{services,storage,cache,scrapers} data logs cache

# 5. 启动开发
npm start
```

这样的MVP方案让您可以快速验证产品核心价值，等到需要更强大的功能时再逐步引入数据库系统！
