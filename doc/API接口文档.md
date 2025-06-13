# 📡 商品比价插件 - API接口文档

## 📌 接口概览

本文档描述商品比价插件的所有API接口，包括请求格式、响应格式、错误处理等详细信息。

### 基础信息
- **基础URL**: `http://localhost:3000/api` (开发环境)
- **生产URL**: `https://api.pricecompare.com/api` (生产环境)
- **协议**: HTTP/HTTPS
- **数据格式**: JSON
- **字符编码**: UTF-8

### 通用响应格式
```json
{
  "success": true,           // 请求是否成功
  "message": "操作成功",      // 响应消息
  "data": {},               // 响应数据
  "meta": {                 // 元数据
    "requestId": "req_xxx",
    "timestamp": "2025-06-13T10:30:00Z",
    "version": "1.0.0"
  }
}
```

### 错误响应格式
```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE",
  "details": {},            // 详细错误信息(可选)
  "meta": {
    "requestId": "req_xxx",
    "timestamp": "2025-06-13T10:30:00Z"
  }
}
```

## 🔍 搜索接口

### 商品搜索
**接口路径**: `GET /api/search`

**接口描述**: 根据关键词搜索多个平台的商品价格信息

**请求参数**:
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| keyword | string | 是 | - | 搜索关键词，2-50个字符 |
| platforms | string | 否 | all | 指定平台，用逗号分隔。支持：jd,taobao,pdd,ali1688 |
| limit | number | 否 | 5 | 每个平台返回商品数量，1-20 |
| timeout | number | 否 | 15 | 超时时间(秒)，5-30 |
| cache | boolean | 否 | true | 是否使用缓存 |

**请求示例**:
```bash
GET /api/search?keyword=蓝牙耳机&platforms=jd,taobao&limit=5&timeout=15
```

**响应示例**:
```json
{
  "success": true,
  "message": "搜索成功",
  "data": {
    "keyword": "蓝牙耳机",
    "searchTime": 3245,
    "totalPlatforms": 2,
    "totalProducts": 10,
    "platforms": {
      "jd": {
        "success": true,
        "products": [
          {
            "id": "jd_123456789",
            "title": "Apple AirPods Pro 第二代 主动降噪无线蓝牙耳机",
            "price": "1799.00",
            "originalPrice": "1999.00",
            "currency": "CNY",
            "url": "https://item.jd.com/123456789.html",
            "imageUrl": "https://img.jd.com/xxx.jpg",
            "shop": {
              "name": "Apple官方旗舰店",
              "url": "https://shop.jd.com/xxx",
              "type": "official"
            },
            "rating": "4.8",
            "reviewCount": "10000+",
            "sales": "月销1000+",
            "tags": ["自营", "免运费", "当日达"],
            "promotion": "满300减50",
            "availability": true,
            "location": "北京",
            "platform": "jd",
            "scrapedAt": "2025-06-13T10:30:00Z"
          }
        ],
        "scrapedAt": "2025-06-13T10:30:00Z",
        "scrapeTime": 2100
      },
      "taobao": {
        "success": true,
        "products": [
          {
            "id": "taobao_987654321",
            "title": "华为FreeBuds Pro 2无线蓝牙耳机降噪",
            "price": "899.00",
            "originalPrice": "1199.00",
            "currency": "CNY",
            "url": "https://detail.tmall.com/item.htm?id=987654321",
            "imageUrl": "https://img.alicdn.com/xxx.jpg",
            "shop": {
              "name": "华为官方旗舰店",
              "url": "https://huawei.tmall.com",
              "type": "tmall"
            },
            "rating": "4.9",
            "reviewCount": "5000+",
            "sales": "月销500+",
            "tags": ["天猫", "正品保证"],
            "promotion": "双11预售",
            "availability": true,
            "location": "广东",
            "platform": "taobao",
            "scrapedAt": "2025-06-13T10:30:00Z"
          }
        ],
        "scrapedAt": "2025-06-13T10:30:00Z",
        "scrapeTime": 2300
      }
    }
  },
  "meta": {
    "requestId": "req_20250613_103000_abc123",
    "version": "1.0.0",
    "timestamp": "2025-06-13T10:30:00Z"
  }
}
```

**错误响应示例**:
```json
{
  "success": false,
  "error": "搜索关键词不能为空",
  "code": "INVALID_KEYWORD",
  "meta": {
    "requestId": "req_20250613_103000_abc123",
    "timestamp": "2025-06-13T10:30:00Z"
  }
}
```

**状态码说明**:
- `200`: 搜索成功
- `400`: 请求参数错误
- `408`: 请求超时
- `429`: 请求过于频繁
- `500`: 服务器内部错误
- `503`: 服务暂时不可用

## 🏥 健康检查接口

### 服务健康状态
**接口路径**: `GET /api/health`

**接口描述**: 获取服务运行状态和健康信息

**请求参数**: 无

**请求示例**:
```bash
GET /api/health
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 86400,
    "version": "1.0.0",
    "environment": "production",
    "services": {
      "database": "connected",
      "redis": "connected",
      "scrapers": {
        "jd": "operational",
        "taobao": "operational",
        "pdd": "limited",
        "ali1688": "operational"
      }
    },
    "performance": {
      "memoryUsage": {
        "used": "256MB",
        "total": "1GB",
        "percentage": "25%"
      },
      "cpuUsage": "15%",
      "activeConnections": 23,
      "requestsPerMinute": 45
    },
    "metrics": {
      "totalRequests": 12345,
      "successRate": "96.5%",
      "averageResponseTime": "2.8s",
      "todayRequests": 456
    }
  },
  "timestamp": "2025-06-13T10:30:00Z"
}
```

## 📊 管理接口

### 获取统计信息
**接口路径**: `GET /api/admin/stats`

**接口描述**: 获取系统运行统计信息 (需要管理员权限)

**请求头**:
```
Authorization: Bearer <admin_token>
```

**请求参数**:
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| period | string | 否 | day | 统计周期：hour/day/week/month |
| platforms | string | 否 | all | 指定平台统计 |

**请求示例**:
```bash
GET /api/admin/stats?period=day&platforms=jd,taobao
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "period": "day",
    "date": "2025-06-13",
    "requests": {
      "total": 12345,
      "successful": 11898,
      "failed": 447,
      "successRate": 0.965,
      "avgResponseTime": 2800,
      "hourlyDistribution": [
        { "hour": 0, "count": 123 },
        { "hour": 1, "count": 89 }
      ]
    },
    "platforms": {
      "jd": {
        "requests": 3000,
        "successful": 2850,
        "failed": 150,
        "successRate": 0.95,
        "avgResponseTime": 2100,
        "avgProductsPerRequest": 4.8
      },
      "taobao": {
        "requests": 3200,
        "successful": 2816,
        "failed": 384,
        "successRate": 0.88,
        "avgResponseTime": 2500,
        "avgProductsPerRequest": 4.2
      }
    },
    "errors": {
      "total": 447,
      "types": [
        { "type": "timeout", "count": 189, "percentage": 42.3 },
        { "type": "blocked", "count": 145, "percentage": 32.4 },
        { "type": "network", "count": 78, "percentage": 17.4 },
        { "type": "parsing", "count": 35, "percentage": 7.8 }
      ],
      "topErrorMessages": [
        { "message": "请求超时", "count": 189 },
        { "message": "访问被拒绝", "count": 145 }
      ]
    },
    "keywords": {
      "total": 8765,
      "unique": 3456,
      "topKeywords": [
        { "keyword": "蓝牙耳机", "count": 234 },
        { "keyword": "手机", "count": 189 },
        { "keyword": "笔记本电脑", "count": 156 }
      ]
    }
  },
  "meta": {
    "generatedAt": "2025-06-13T10:30:00Z",
    "version": "1.0.0"
  }
}
```

### 清空缓存
**接口路径**: `DELETE /api/admin/cache`

**接口描述**: 清空系统缓存 (需要管理员权限)

**请求头**:
```
Authorization: Bearer <admin_token>
```

**请求参数**:
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| type | string | 否 | all | 缓存类型：all/search/stats |

**请求示例**:
```bash
DELETE /api/admin/cache?type=search
```

**响应示例**:
```json
{
  "success": true,
  "message": "缓存清理成功",
  "data": {
    "type": "search",
    "clearedKeys": 1234,
    "freedMemory": "45.6MB"
  },
  "timestamp": "2025-06-13T10:30:00Z"
}
```

## 🚦 状态码说明

### HTTP状态码
| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 408 | 请求超时 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |
| 502 | 网关错误 |
| 503 | 服务不可用 |
| 504 | 网关超时 |

### 业务错误码
| 错误码 | 说明 |
|--------|------|
| INVALID_KEYWORD | 搜索关键词无效 |
| INVALID_PLATFORM | 不支持的平台 |
| INVALID_LIMIT | 限制数量超出范围 |
| TIMEOUT_ERROR | 请求超时 |
| SCRAPER_ERROR | 爬虫执行错误 |
| CACHE_ERROR | 缓存操作错误 |
| RATE_LIMIT_EXCEEDED | 请求频率超限 |
| SERVICE_UNAVAILABLE | 服务不可用 |
| AUTH_REQUIRED | 需要认证 |
| PERMISSION_DENIED | 权限不足 |

## 🔧 请求限制

### 频率限制
| 接口类型 | 限制 | 时间窗口 |
|----------|------|----------|
| 搜索接口 | 20次/IP | 1分钟 |
| 健康检查 | 60次/IP | 1分钟 |
| 管理接口 | 100次/Token | 1分钟 |
| 全局限制 | 100次/IP | 1分钟 |

### 参数限制
| 参数 | 限制 |
|------|------|
| keyword | 2-50个字符，不能包含特殊字符 |
| platforms | 最多4个平台 |
| limit | 1-20之间的整数 |
| timeout | 5-30秒之间的整数 |

## 🧪 接口测试

### 使用curl测试
```bash
# 基础搜索测试
curl -X GET "http://localhost:3000/api/search?keyword=蓝牙耳机" \
  -H "Content-Type: application/json"

# 指定平台搜索
curl -X GET "http://localhost:3000/api/search?keyword=手机&platforms=jd,taobao&limit=3" \
  -H "Content-Type: application/json"

# 健康检查
curl -X GET "http://localhost:3000/api/health" \
  -H "Content-Type: application/json"

# 管理接口测试
curl -X GET "http://localhost:3000/api/admin/stats" \
  -H "Authorization: Bearer your_admin_token" \
  -H "Content-Type: application/json"
```

### 使用JavaScript测试
```javascript
// 搜索商品
async function searchProducts(keyword) {
  try {
    const response = await fetch(`/api/search?keyword=${encodeURIComponent(keyword)}`);
    const data = await response.json();
    
    if (data.success) {
      console.log('搜索成功:', data.data);
      return data.data;
    } else {
      console.error('搜索失败:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('请求错误:', error);
    throw error;
  }
}

// 检查服务健康状态
async function checkHealth() {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    
    console.log('服务状态:', data.data.status);
    return data.data;
  } catch (error) {
    console.error('健康检查失败:', error);
    return null;
  }
}

// 使用示例
searchProducts('蓝牙耳机')
  .then(results => {
    console.log('找到商品:', results.totalProducts);
  })
  .catch(error => {
    console.error('搜索出错:', error.message);
  });
```

## 📝 变更日志

### v1.0.0 (2025-06-13)
- 初始版本发布
- 支持京东、淘宝、拼多多、1688四个平台
- 基础搜索功能
- 健康检查接口
- 管理统计接口

### 计划中的功能
- v1.1.0: 商品详情接口
- v1.2.0: 历史价格查询
- v1.3.0: 价格监控提醒
- v2.0.0: 用户系统集成

## 🤝 联系方式

**技术支持**: tech@pricecompare.com  
**API问题**: api@pricecompare.com  
**GitHub**: https://github.com/yourorg/price-comparison-api

---

**文档版本**: v1.0  
**最后更新**: 2025年6月13日  
**维护团队**: API开发组
