const http = require('http');

console.log('🧪 商品比价API测试脚本');
console.log('================================');

// 测试健康检查
function testHealth() {
  return new Promise((resolve, reject) => {
    console.log('📊 测试健康检查...');
    
    const req = http.get('http://localhost:3000/api/health', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success) {
            console.log('✅ 健康检查通过');
            console.log(`   状态: ${response.data.status}`);
            console.log(`   运行时间: ${response.data.uptime}秒`);
            resolve(true);
          } else {
            console.log('❌ 健康检查失败');
            reject(new Error('健康检查返回失败状态'));
          }
        } catch (error) {
          console.log('❌ 健康检查响应解析失败');
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ 无法连接到API服务');
      console.log('   请确保后端服务已启动 (npm start)');
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ 健康检查超时');
      req.destroy();
      reject(new Error('请求超时'));
    });
  });
}

// 测试搜索API
function testSearch() {
  return new Promise((resolve, reject) => {
    console.log('🔍 测试搜索API...');
    
    const searchUrl = 'http://localhost:3000/api/search?keyword=耳机&platforms=jd,taobao&limit=2';
    const req = http.get(searchUrl, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success) {
            console.log('✅ 搜索API正常');
            console.log(`   关键词: ${response.data.keyword}`);
            console.log(`   搜索时间: ${response.data.searchTime}ms`);
            console.log(`   成功平台: ${response.data.successfulPlatforms}/${response.data.totalPlatforms}`);
            console.log(`   商品总数: ${response.data.totalProducts}`);
            
            // 显示各平台状态
            Object.entries(response.data.platforms).forEach(([platform, result]) => {
              const status = result.success ? '✅' : '❌';
              const count = result.products ? result.products.length : 0;
              console.log(`   ${status} ${platform}: ${count}个商品`);
            });
            
            resolve(true);
          } else {
            console.log('❌ 搜索API失败');
            console.log(`   错误: ${response.error}`);
            reject(new Error(response.error));
          }
        } catch (error) {
          console.log('❌ 搜索API响应解析失败');
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ 搜索API请求失败');
      reject(error);
    });
    
    req.setTimeout(30000, () => {
      console.log('❌ 搜索API超时');
      req.destroy();
      reject(new Error('搜索请求超时'));
    });
  });
}

// 运行测试
async function runTests() {
  try {
    await testHealth();
    console.log('');
    await testSearch();
    console.log('');
    console.log('🎉 所有测试通过！API服务正常运行');
    console.log('');
    console.log('📋 下一步:');
    console.log('1. 安装Chrome扩展 (frontend文件夹)');
    console.log('2. 点击扩展图标测试完整功能');
    console.log('3. 查看浏览器控制台了解更多信息');
  } catch (error) {
    console.log('');
    console.log('💥 测试失败:', error.message);
    console.log('');
    console.log('🔧 解决方案:');
    console.log('1. 确保后端服务已启动: cd backend && npm start');
    console.log('2. 检查端口3000是否被占用');
    console.log('3. 查看后端服务日志了解详细错误');
  }
}

runTests();
