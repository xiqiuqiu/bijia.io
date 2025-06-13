class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    // 定期清理过期缓存
    setInterval(() => this.cleanup(), 60000); // 每分钟清理一次
    
    console.log('内存缓存系统初始化完成');
  }
  
  set(key, value, ttl = 300000) { // 默认5分钟
    try {
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
      this.stats.sets++;
      
      return true;
    } catch (error) {
      console.error('缓存设置失败:', error);
      return false;
    }
  }
  
  get(key) {
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        this.stats.misses++;
        return null;
      }
      
      // 检查是否过期
      if (Date.now() - item.timestamp > item.ttl) {
        this.delete(key);
        this.stats.misses++;
        return null;
      }
      
      this.stats.hits++;
      return item.value;
    } catch (error) {
      console.error('缓存获取失败:', error);
      this.stats.misses++;
      return null;
    }
  }
  
  delete(key) {
    try {
      const deleted = this.cache.delete(key);
      
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }
      
      if (deleted) {
        this.stats.deletes++;
      }
      
      return deleted;
    } catch (error) {
      console.error('缓存删除失败:', error);
      return false;
    }
  }
  
  has(key) {
    try {
      if (!this.cache.has(key)) {
        return false;
      }
      
      const item = this.cache.get(key);
      return Date.now() - item.timestamp <= item.ttl;
    } catch (error) {
      console.error('缓存检查失败:', error);
      return false;
    }
  }
  
  cleanup() {
    try {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [key, item] of this.cache.entries()) {
        if (now - item.timestamp > item.ttl) {
          this.delete(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`内存缓存清理: 删除${cleanedCount}个过期项`);
      }
    } catch (error) {
      console.error('内存缓存清理失败:', error);
    }
  }
  
  clear() {
    try {
      // 清除所有定时器
      for (const timer of this.timers.values()) {
        clearTimeout(timer);
      }
      
      const clearedCount = this.cache.size;
      this.cache.clear();
      this.timers.clear();
      
      console.log(`内存缓存已清空: 删除${clearedCount}个项目`);
      return clearedCount;
    } catch (error) {
      console.error('内存缓存清空失败:', error);
      return 0;
    }
  }
  
  size() {
    return this.cache.size;
  }
  
  keys() {
    return Array.from(this.cache.keys());
  }
  
  // 获取缓存统计信息
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0;
    
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      hitRate: `${hitRate}%`,
      totalRequests,
      memoryUsage: this.getMemoryUsage()
    };
  }
  
  // 获取详细信息
  getInfo() {
    const items = [];
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      const remainingTtl = Math.max(0, item.ttl - (now - item.timestamp));
      items.push({
        key,
        timestamp: new Date(item.timestamp).toISOString(),
        ttl: item.ttl,
        remainingTtl,
        expired: remainingTtl === 0,
        size: this.getObjectSize(item.value)
      });
    }
    
    return {
      totalItems: items.length,
      stats: this.getStats(),
      items
    };
  }
  
  // 重置统计信息
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    console.log('缓存统计信息已重置');
  }
  
  // 估算对象大小
  getObjectSize(obj) {
    try {
      const jsonStr = JSON.stringify(obj);
      return `${(jsonStr.length / 1024).toFixed(2)} KB`;
    } catch {
      return '未知';
    }
  }
  
  // 获取内存使用情况
  getMemoryUsage() {
    try {
      const used = process.memoryUsage();
      return {
        rss: `${Math.round(used.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(used.external / 1024 / 1024)} MB`
      };
    } catch {
      return { error: '无法获取内存信息' };
    }
  }
  
  // 设置带条件的缓存
  setIfNotExists(key, value, ttl = 300000) {
    if (!this.has(key)) {
      return this.set(key, value, ttl);
    }
    return false;
  }
  
  // 更新TTL
  updateTtl(key, newTtl) {
    try {
      const item = this.cache.get(key);
      if (!item) return false;
      
      // 清除旧定时器
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
      }
      
      // 更新TTL
      item.ttl = newTtl;
      item.timestamp = Date.now();
      
      // 设置新定时器
      const timer = setTimeout(() => {
        this.delete(key);
      }, newTtl);
      
      this.timers.set(key, timer);
      return true;
    } catch (error) {
      console.error('更新TTL失败:', error);
      return false;
    }
  }
}

module.exports = MemoryCache;
