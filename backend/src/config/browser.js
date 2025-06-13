const chromeFinder = require("chrome-finder");

/**
 * 浏览器配置管理
 */
class BrowserConfig {
  constructor() {
    this.executablePath = null;
    this.initialized = false;
  }

  /**
   * 初始化浏览器配置
   */
  async init() {
    if (this.initialized) {
      return this.executablePath;
    }

    try {
      // 尝试从环境变量获取Chrome路径
      if (process.env.CHROME_PATH) {
        this.executablePath = process.env.CHROME_PATH;
        console.log(`[浏览器配置] 使用环境变量Chrome路径: ${this.executablePath}`);
      } else {
        // 自动检测Chrome路径
        this.executablePath = chromeFinder();
        console.log(`[浏览器配置] 自动检测到Chrome路径: ${this.executablePath}`);
      }
    } catch (error) {
      console.log(`[浏览器配置] 未找到系统Chrome，将使用Puppeteer内置Chrome`);
      this.executablePath = null;
    }

    this.initialized = true;
    return this.executablePath;
  }
  /**
   * 获取Puppeteer启动选项
   */
  async getLaunchOptions(customOptions = {}) {
    const executablePath = await this.init();

    const defaultOptions = {
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--window-size=1920,1080",
        "--disable-blink-features=AutomationControlled",
        "--disable-extensions",
        "--no-first-run",
        "--disable-default-apps",
        "--disable-gpu",
        // 增强反检测参数
        "--disable-plugins-discovery",
        "--disable-component-extensions-with-background-pages",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
        "--disable-client-side-phishing-detection",
        "--disable-sync",
        "--metrics-recording-only",
        "--no-report-upload",
        "--user-data-dir=/tmp/chrome-profile",
        "--disable-automation",
        "--password-store=basic",
        "--use-mock-keychain",
      ],
      timeout: 30000,
    };

    // 合并自定义选项
    const options = { ...defaultOptions, ...customOptions };

    // 只有找到系统Chrome时才设置executablePath
    if (executablePath) {
      options.executablePath = executablePath;
    }

    return options;
  }
}

// 单例模式
const browserConfig = new BrowserConfig();

module.exports = browserConfig;
