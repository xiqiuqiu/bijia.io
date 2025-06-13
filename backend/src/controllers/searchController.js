const SearchService = require('../services/searchService');
const FileStorage = require('../storage/fileStorage');

// 初始化存储服务
const fileStorage = new FileStorage();

class SearchController {
  static async search(req, res) {
    const startTime = Date.now();
    const { keyword, platforms = 'jd,taobao,pdd,ali1688', limit = 5, timeout = 15 } = req.query;
    
    try {
      // 参数验证
      if (!keyword || keyword.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: '搜索关键词至少需要2个字符',
          code: 'INVALID_KEYWORD'
        });
      }

      if (keyword.length > 50) {
        return res.status(400).json({
          success: false,
          error: '搜索关键词不能超过50个字符',
          code: 'KEYWORD_TOO_LONG'
        });
      }
      
      const platformList = platforms.split(',')
        .map(p => p.trim())
        .filter(p => ['jd', 'taobao', 'pdd', 'ali1688'].includes(p));
      
      if (platformList.length === 0) {
        return res.status(400).json({
          success: false,
          error: '请指定有效的平台 (jd, taobao, pdd, ali1688)',
          code: 'INVALID_PLATFORMS'
        });
      }

      const limitNum = Math.min(Math.max(parseInt(limit) || 5, 1), 20);
      const timeoutNum = Math.min(Math.max(parseInt(timeout) || 15, 5), 30);
      
      console.log(`开始搜索: "${keyword}" 在平台 [${platformList.join(', ')}]`);
      
      // 执行搜索
      const result = await SearchService.search(
        keyword.trim(), 
        platformList, 
        limitNum,
        timeoutNum * 1000
      );
      
      const responseTime = Date.now() - startTime;
      
      // 记录访问日志
      await fileStorage.logApiAccess({
        endpoint: '/api/search',
        keyword: keyword.trim(),
        platforms: platformList,
        limit: limitNum,
        responseTime,
        success: true,
        totalProducts: result.data.totalProducts,
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
      });
      
      console.log(`搜索完成: 用时${responseTime}ms, 找到${result.data.totalProducts}个商品`);
      
      res.json(result);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('搜索错误:', error.message);
      
      // 记录错误日志
      await fileStorage.logError(error, {
        endpoint: '/api/search',
        keyword: keyword,
        platforms: platforms,
        ip: req.ip,
        responseTime
      });
      
      // 根据错误类型返回不同状态码
      let statusCode = 500;
      let errorMessage = '搜索服务暂时不可用，请稍后重试';
      let errorCode = 'INTERNAL_ERROR';
      
      if (error.message.includes('timeout') || error.message.includes('超时')) {
        statusCode = 408;
        errorMessage = '搜索超时，请稍后重试';
        errorCode = 'SEARCH_TIMEOUT';
      } else if (error.message.includes('网络') || error.message.includes('network')) {
        statusCode = 503;
        errorMessage = '网络连接异常，请检查网络设置';
        errorCode = 'NETWORK_ERROR';
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        code: errorCode,
        meta: {
          responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  static async health(req, res) {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      // 检查各个平台爬虫状态（简化版）
      const platformStatus = {
        jd: 'operational',
        taobao: 'operational',
        pdd: 'operational',
        ali1688: 'operational'
      };
      
      const health = {
        success: true,
        data: {
          status: 'healthy',
          uptime: Math.floor(uptime),
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          services: {
            scrapers: platformStatus
          },
          performance: {
            memoryUsage: {
              used: `${Math.round(memoryUsage.used / 1024 / 1024)}MB`,
              total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
              percentage: `${Math.round((memoryUsage.used / memoryUsage.heapTotal) * 100)}%`
            },
            cpuUsage: '正常',
            responseTime: '正常'
          }
        },
        timestamp: new Date().toISOString()
      };
      
      res.json(health);
      
    } catch (error) {
      console.error('健康检查错误:', error);
      res.status(500).json({
        success: false,
        error: '健康检查失败',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = SearchController;
