# 🛒 商品比价助手 - MVP版本

一键比较京东、淘宝、拼多多、1688商品价格的Chrome扩展。

## 📖 项目结构

```
bijia/
├── backend/                 # 后端API服务
│   ├── src/                 # 源代码
│   │   ├── controllers/     # 控制器
│   │   ├── services/        # 业务服务
│   │   ├── scrapers/        # 爬虫模块
│   │   ├── storage/         # 文件存储
│   │   ├── cache/           # 内存缓存
│   │   └── app.js           # 主应用
│   ├── data/                # 数据文件
│   ├── logs/                # 日志文件
│   ├── cache/               # 缓存文件
│   ├── package.json         # 项目配置
│   └── start.bat            # 启动脚本
├── frontend/                # Chrome扩展
│   ├── popup/               # 弹窗页面
│   │   ├── popup.html       # 弹窗HTML
│   │   ├── popup.css        # 弹窗样式
│   │   └── popup.js         # 弹窗逻辑
│   ├── assets/              # 资源文件
│   ├── utils/               # 工具脚本
│   │   └── background.js    # 后台脚本
│   └── manifest.json        # 扩展配置
└── doc/                     # 项目文档
    ├── MVP快速开始指南.md
    └── 其他设计文档...
```

## 🚀 快速开始

### 1. 启动后端服务

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 启动服务
npm start
# 或者双击 start.bat
```

服务启动后访问：
- 健康检查: http://localhost:3000/api/health
- 搜索测试: http://localhost:3000/api/search?keyword=蓝牙耳机

### 2. 安装Chrome扩展

1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `frontend` 文件夹
6. 扩展安装完成

### 3. 使用扩展

1. 点击浏览器工具栏中的扩展图标
2. 在搜索框中输入商品名称
3. 选择要搜索的平台
4. 点击"搜索比价"按钮
5. 查看价格比较结果

## 🔧 技术栈

### 后端
- **Node.js + Express**: Web服务框架
- **Puppeteer**: 网页爬虫引擎
- **文件系统**: 数据存储（MVP版本）
- **内存缓存**: 临时数据缓存

### 前端
- **Chrome Extension Manifest V3**: 扩展框架
- **原生JavaScript**: 业务逻辑
- **CSS3**: 界面样式
- **Chrome Storage API**: 本地数据存储

## 📝 API接口

### 搜索商品
```
GET /api/search?keyword=蓝牙耳机&platforms=jd,taobao&limit=5
```

### 健康检查
```
GET /api/health
```

## 🛠️ 开发调试

### 后端调试
```bash
# 开发模式启动（需要先安装nodemon）
npm install -g nodemon
npm run dev
```

### 前端调试
1. 在扩展管理页面点击"检查视图"
2. 在弹窗上右键选择"检查元素"
3. 查看Console输出和Network请求

## 📊 项目特性

### ✅ 已实现功能
- [x] 四平台商品搜索（京东、淘宝、拼多多、1688）
- [x] 价格比较和结果展示
- [x] 搜索历史记录
- [x] 平台选择和结果数量设置
- [x] 错误处理和重试机制
- [x] 搜索结果缓存
- [x] API健康检查
- [x] 响应式界面设计

### 🔄 MVP限制
- 淘宝、拼多多、1688使用模拟数据（反爬虫限制）
- 仅文件存储，无数据库
- 单机部署，无集群支持
- 基础功能，无高级特性

### 🚀 未来计划
- [ ] 完善各平台真实爬虫
- [ ] 引入Redis缓存
- [ ] 添加PostgreSQL数据库
- [ ] 用户系统和收藏功能
- [ ] 价格趋势图表
- [ ] 商品推荐算法
- [ ] 移动端适配
- [ ] 批量比价功能

## 🐛 常见问题

### Q: 后端服务启动失败？
A: 检查是否安装了Node.js，端口3000是否被占用。

### Q: Chrome扩展无法加载？
A: 确保开启了开发者模式，选择正确的frontend文件夹。

### Q: 搜索结果为空？
A: 检查后端服务是否正常运行，网络连接是否正常。

### Q: 京东搜索失败？
A: 可能遇到反爬虫机制，稍后重试或检查网络环境。

## 📞 技术支持

如遇到问题，请检查：
1. Node.js版本是否 >= 18.0.0
2. Chrome浏览器版本是否最新
3. 网络连接是否正常
4. 防火墙是否阻止了3000端口

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

---

**开发时间**: 2025年6月13日  
**版本**: MVP 1.0.0  
**状态**: 开发中  