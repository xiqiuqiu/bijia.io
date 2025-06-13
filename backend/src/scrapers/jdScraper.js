const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const browserConfig = require("../config/browser");

// 使用隐身插件避免被检测
puppeteer.use(StealthPlugin());

class JDScraper {
  constructor() {
    this.platform = "jd";
    this.baseUrl = "https://search.jd.com/Search";
    this.userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  }

  async search(keyword, limit = 5) {
    const startTime = Date.now();

    console.log(`[京东] 开始搜索: "${keyword}"`);
    console.log(`[京东] 由于反爬虫限制，京东平台暂时无法提供真实数据`);

    // 京东反爬虫措施过于严格，直接返回错误信息
    const scrapeTime = Date.now() - startTime;

    return {
      success: false,
      error: "京东平台反爬虫限制，暂时无法获取数据。建议：1) 使用京东官方API 2) 采用代理轮换 3) 考虑其他数据源",
      products: [],
      scrapeTime: scrapeTime,
      scrapedAt: new Date().toISOString(),
      platform: "jd",
      blocked: true,
      reason: "Anti-bot protection detected",
    };
  }

  // 备用数据方法（保留以防需要）
  getFallbackData(keyword, limit) {
    const startTime = Date.now();
    console.log(`[京东] 使用备用数据为关键词: "${keyword}"`);

    const products = Array.from({ length: Math.min(limit, 4) }, (_, i) => ({
      id: `jd_fallback_${Date.now()}_${i}`,
      title: `${keyword} 相关商品 ${i + 1} - 京东自营`,
      price: (Math.random() * 2000 + 100).toFixed(2),
      url: `https://item.jd.com/fallback${Date.now() + i}.html`,
      imageUrl: "",
      shop: {
        name: i === 0 ? "京东自营" : `京东店铺${i + 1}`,
        url: "https://www.jd.com",
      },
      reviewCount: `${Math.floor(Math.random() * 10000) + 1000}+条评价`,
      availability: true,
      platform: "jd",
      scrapedAt: new Date().toISOString(),
      isFallback: true,
    }));

    const scrapeTime = Date.now() - startTime;

    return {
      success: true,
      products: products,
      scrapeTime: scrapeTime,
      scrapedAt: new Date().toISOString(),
      platform: "jd",
      note: "由于网络限制，使用备用数据",
    };
  }

  // 验证商品数据
  validateProduct(product) {
    return product.title && product.title.length > 0 && (product.price || product.url);
  }

  // 格式化价格
  formatPrice(priceStr) {
    if (!priceStr) return "";
    return priceStr.replace(/[^\d.]/g, "");
  }
}

module.exports = JDScraper;
