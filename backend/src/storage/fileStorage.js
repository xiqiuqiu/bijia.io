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
    try {
      await this.ensureDir(this.dataDir);
      await this.ensureDir(this.logsDir);
      await this.ensureDir(this.cacheDir);
      console.log('文件存储系统初始化完成');
    } catch (error) {
      console.error('文件存储系统初始化失败:', error);
    }
  }
  
  async ensureDir(dir) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
  
  // API访问日志
  async logApiAccess(logData) {
    try {
      const logFile = path.join(this.logsDir, `access_${this.getDateString()}.log`);
      const logLine = JSON.stringify({
        ...logData,
        timestamp: new Date().toISOString()
      }) + '\n';
      
      await fs.appendFile(logFile, logLine);
    } catch (error) {
      console.error('记录访问日志失败:', error);
    }
  }
  
  // 错误日志
  async logError(error, context = '') {
    try {
      const logFile = path.join(this.logsDir, `error_${this.getDateString()}.log`);
      const logLine = JSON.stringify({
        error: error.message,
        stack: error.stack,
        context: context,
        timestamp: new Date().toISOString()
      }) + '\n';
      
      await fs.appendFile(logFile, logLine);
    } catch (logError) {
      console.error('记录错误日志失败:', logError);
    }
  }
  
  // 搜索结果缓存
  async cacheSearchResult(keyword, platforms, data) {
    try {
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
    } catch (error) {
      console.error('缓存搜索结果失败:', error);
    }
  }
  
  // 获取缓存的搜索结果
  async getCachedResult(keyword, platforms) {
    try {
      const cacheKey = this.generateCacheKey(keyword, platforms);
      const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
      
      const cached = JSON.parse(await fs.readFile(cacheFile, 'utf-8'));
      
      if (Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }
    } catch {
      // 缓存文件不存在或已过期
    }
    
    return null;
  }
  
  // 清理过期缓存
  async cleanExpiredCache() {
    try {
      const files = await fs.readdir(this.cacheDir);
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          try {
            const cached = JSON.parse(await fs.readFile(filePath, 'utf-8'));
            if (now - cached.timestamp > cached.ttl) {
              await fs.unlink(filePath);
              cleanedCount++;
            }
          } catch {
            // 删除损坏的缓存文件
            await fs.unlink(filePath);
            cleanedCount++;
          }
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`清理了 ${cleanedCount} 个过期缓存文件`);
      }
    } catch (error) {
      console.error('清理缓存失败:', error);
    }
  }
  
  // 简单的统计数据
  async saveStats(date, stats) {
    try {
      const statsFile = path.join(this.dataDir, `stats_${date}.json`);
      await fs.writeFile(statsFile, JSON.stringify(stats, null, 2));
    } catch (error) {
      console.error('保存统计数据失败:', error);
    }
  }
  
  // 获取统计数据
  async getStats(date) {
    try {
      const statsFile = path.join(this.dataDir, `stats_${date}.json`);
      return JSON.parse(await fs.readFile(statsFile, 'utf-8'));
    } catch {
      return {
        date,
        totalRequests: 0,
        successfulRequests: 0,
        uniqueKeywords: [],
        platformStats: {}
      };
    }
  }
  
  // 读取日志文件（用于分析）
  async readLogs(type = 'access', date = null) {
    try {
      const targetDate = date || this.getDateString();
      const logFile = path.join(this.logsDir, `${type}_${targetDate}.log`);
      
      const logContent = await fs.readFile(logFile, 'utf-8');
      return logContent.split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { raw: line };
          }
        });
    } catch (error) {
      console.error(`读取${type}日志失败:`, error);
      return [];
    }
  }
  
  // 获取存储统计信息
  async getStorageStats() {
    try {
      const cacheFiles = await fs.readdir(this.cacheDir);
      const logFiles = await fs.readdir(this.logsDir);
      const dataFiles = await fs.readdir(this.dataDir);
      
      return {
        cache: {
          files: cacheFiles.length,
          size: await this.getDirSize(this.cacheDir)
        },
        logs: {
          files: logFiles.length,
          size: await this.getDirSize(this.logsDir)
        },
        data: {
          files: dataFiles.length,
          size: await this.getDirSize(this.dataDir)
        },
        total: {
          files: cacheFiles.length + logFiles.length + dataFiles.length
        }
      };
    } catch (error) {
      console.error('获取存储统计失败:', error);
      return null;
    }
  }
  
  async getDirSize(dirPath) {
    try {
      const files = await fs.readdir(dirPath);
      let totalSize = 0;
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }
      
      return this.formatBytes(totalSize);
    } catch {
      return '0 B';
    }
  }
  
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
