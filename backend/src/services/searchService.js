const JDScraper = require('../scrapers/jdScraper');
const TaobaoScraper = require('../scrapers/taobaoScraper');
const PDDScraper = require('../scrapers/pddScraper');
const Ali1688Scraper = require('../scrapers/ali1688Scraper');
const MemoryCache = require('../cache/memoryCache');
const FileStorage = require('../storage/fileStorage');

class SearchService {
  static scrapers = {
    jd: new JDScraper(),
    taobao: new TaobaoScraper(),
    pdd: new PDDScraper(),
    ali1688: new Ali1688Scraper()
  };
  
  static cache = new MemoryCache();
  static storage = new FileStorage();
  
  static async search(keyword, platforms, limit, timeout = 15000) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    console.log(`[${requestId}] 开始搜索: "${keyword}" 平台: [${platforms.join(', ')}] 数量: ${limit}`);
    
    try {
      // 检查缓存
      const cacheKey = this.generateCacheKey(keyword, platforms, limit);
      const cachedResult = this.cache.get(cacheKey);
      
      if (cachedResult) {
        console.log(`[${requestId}] 缓存命中: ${keyword}`);
        return {
          ...cachedResult,
          meta: {
            ...cachedResult.meta,
            fromCache: true,
            requestId
          }
        };
      }
      
      // 并发搜索所有平台
      const searchPromises = platforms.map(platform => 
        this.searchPlatformWithTimeout(platform, keyword, limit, timeout, requestId)
      );
      
      const results = await Promise.allSettled(searchPromises);
      
      // 整理结果
      const platformResults = {};
      let totalProducts = 0;
      let successfulPlatforms = 0;
      
      platforms.forEach((platform, index) => {
        const result = results[index];
        if (result.status === 'fulfilled') {
          platformResults[platform] = result.value;
          totalProducts += result.value.products.length;
          if (result.value.success) {
            successfulPlatforms++;
          }
        } else {
          platformResults[platform] = {
            success: false,
            error: result.reason.message || '搜索失败',
            products: [],
            scrapeTime: timeout,
            scrapedAt: new Date().toISOString()
          };
        }
      });
      
      const searchTime = Date.now() - startTime;
      
      const searchResult = {
        success: true,
        message: '搜索完成',
        data: {
          keyword,
          searchTime,
          totalPlatforms: platforms.length,
          successfulPlatforms,
          totalProducts,
          platforms: platformResults
        },
        meta: {
          requestId,
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          fromCache: false
        }
      };
      
      // 缓存结果（只有成功的结果才缓存）
      if (totalProducts > 0) {
        this.cache.set(cacheKey, searchResult, 5 * 60 * 1000); // 缓存5分钟
        
        // 保存到文件缓存
        await this.storage.cacheSearchResult(keyword, platforms, searchResult);
      }
      
      console.log(`[${requestId}] 搜索完成: 用时${searchTime}ms, 成功平台${successfulPlatforms}/${platforms.length}, 商品${totalProducts}个`);
      
      return searchResult;
      
    } catch (error) {
      console.error(`[${requestId}] 搜索服务错误:`, error);
      throw new Error(`搜索服务错误: ${error.message}`);
    }
  }
  
  static async searchPlatformWithTimeout(platform, keyword, limit, timeout, requestId) {
    const scraper = this.scrapers[platform];
    if (!scraper) {
      throw new Error(`不支持的平台: ${platform}`);
    }
    
    console.log(`[${requestId}] 开始搜索 ${platform} 平台`);
    
    // 创建超时Promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${platform} 平台搜索超时`)), timeout);
    });
    
    // 执行搜索
    const searchPromise = scraper.search(keyword, limit);
    
    try {
      const result = await Promise.race([searchPromise, timeoutPromise]);
      console.log(`[${requestId}] ${platform} 搜索完成: ${result.success ? '成功' : '失败'} (${result.scrapeTime}ms)`);
      return result;
    } catch (error) {
      console.error(`[${requestId}] ${platform} 搜索失败:`, error.message);
      throw error;
    }
  }
  
  static generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  static generateCacheKey(keyword, platforms, limit) {
    const key = `search:${keyword}:${platforms.sort().join(',')}:${limit}`;
    return Buffer.from(key).toString('base64').replace(/[/+=]/g, '_');
  }
  
  // 清理过期缓存
  static async cleanupCache() {
    console.log('开始清理过期缓存...');
    
    // 清理内存缓存
    this.cache.cleanup();
    
    // 清理文件缓存
    await this.storage.cleanExpiredCache();
    
    console.log('缓存清理完成');
  }
  
  // 获取缓存统计
  static getCacheStats() {
    return {
      memory: this.cache.stats(),
      timestamp: new Date().toISOString()
    };
  }
}

// 每10分钟清理一次过期缓存
setInterval(() => {
  SearchService.cleanupCache().catch(console.error);
}, 10 * 60 * 1000);

module.exports = SearchService;
