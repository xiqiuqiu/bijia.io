const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const SearchController = require('./controllers/searchController');

const app = express();
const port = process.env.PORT || 3000;

// 中间件配置
app.use(cors({
  origin: ['chrome-extension://*', 'http://localhost:*'],
  credentials: true
}));

app.use(express.json());

// 简单限流配置
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 20, // 最多20次请求
  message: { 
    success: false, 
    error: '请求过于频繁，请稍后重试' 
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API路由
app.get('/api/search', SearchController.search);
app.get('/api/health', SearchController.health);

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'API接口不存在',
    path: req.path
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
});

// 启动服务
app.listen(port, () => {
  console.log('🚀 商品比价API服务已启动!');
  console.log(`📡 服务地址: http://localhost:${port}`);
  console.log(`🔍 搜索测试: http://localhost:${port}/api/search?keyword=蓝牙耳机`);
  console.log(`📊 健康检查: http://localhost:${port}/api/health`);
  console.log('📝 按 Ctrl+C 停止服务');
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('正在关闭服务...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n正在关闭服务...');
  process.exit(0);
});

module.exports = app;
