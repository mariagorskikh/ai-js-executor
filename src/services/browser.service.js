import { chromium } from 'playwright';
import { AntiBotService } from './anti-bot.service.js';
import path from 'path';

export class BrowserService {
  constructor() {
    this.browser = null;
    this.antiBotService = new AntiBotService();
    this.userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    this.initBrowser();
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  async initBrowser() {
    // Initialize proxy
    const proxyUrl = await this.antiBotService.initializeProxy();
    
    this.browser = await chromium.launch({
      headless: true,
      proxy: { server: proxyUrl },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certifcate-errors',
        '--ignore-certifcate-errors-spki-list',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-zygote',
        '--disable-notifications'
      ]
    });
  }

  async createContext(url) {
    // Load or create browser profile
    const profileName = new URL(url).hostname;
    const profile = await this.antiBotService.loadBrowserProfile(profileName);
    const fingerprint = this.antiBotService.getRandomFingerprint();

    const context = await this.browser.newContext({
      ...fingerprint,
      userAgent: profile.userAgent || this.getRandomUserAgent(),
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['geolocation'],
      geolocation: { 
        latitude: 40.7128, 
        longitude: -74.0060 
      },
      httpCredentials: {
        username: process.env.PROXY_USERNAME,
        password: process.env.PROXY_PASSWORD
      }
    });

    // Restore cookies if they exist
    if (profile.cookies && profile.cookies.length > 0) {
      await context.addCookies(profile.cookies);
    }

    return { context, profile };
  }

  async handleCaptcha(page, url) {
    // Check for different types of CAPTCHAs
    const captchaSelectors = {
      recaptcha: 'iframe[src*="recaptcha"]',
      hcaptcha: 'iframe[src*="hcaptcha"]',
      imageCaptcha: 'img[alt*="captcha" i], img[src*="captcha" i]'
    };

    for (const [type, selector] of Object.entries(captchaSelectors)) {
      const captchaElement = await page.$(selector);
      if (captchaElement) {
        switch (type) {
          case 'recaptcha':
            const siteKey = await page.evaluate(() => {
              const element = document.querySelector('.g-recaptcha');
              return element ? element.getAttribute('data-sitekey') : null;
            });
            if (siteKey) {
              await this.antiBotService.solveRecaptchaV2(page, siteKey, url);
            }
            break;
          case 'hcaptcha':
            const hcaptchaSiteKey = await page.evaluate(() => {
              const element = document.querySelector('[data-sitekey]');
              return element ? element.getAttribute('data-sitekey') : null;
            });
            if (hcaptchaSiteKey) {
              await this.antiBotService.solveHCaptcha(page, hcaptchaSiteKey, url);
            }
            break;
          case 'imageCaptcha':
            await this.antiBotService.solveCaptcha(page, selector);
            break;
        }
        // Wait for navigation after CAPTCHA
        await page.waitForNavigation({ waitUntil: 'networkidle' });
        break;
      }
    }
  }

  async executePage(url, actions = []) {
    const { context, profile } = await this.createContext(url);
    const page = await context.newPage();
    
    try {
      // Navigate with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          await page.goto(url, { 
            timeout: 30000,
            waitUntil: 'domcontentloaded'
          });

          // Handle any CAPTCHAs
          await this.handleCaptcha(page, url);
          break;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) throw error;
          await page.waitForTimeout(2000 * retryCount);
        }
      }

      // Add random human-like behavior
      await this.addHumanBehavior(page);

      // Execute actions
      for (const action of actions) {
        await this.executeAction(page, action);
        await this.addHumanBehavior(page);
      }

      // Save cookies and local storage for future use
      const cookies = await context.cookies();
      const localStorage = await page.evaluate(() => {
        const items = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          items[key] = localStorage.getItem(key);
        }
        return items;
      });

      await this.antiBotService.updateBrowserProfile(profile.name, {
        cookies,
        localStorage
      });

      // Extract data
      const pageData = await page.evaluate(() => {
        const data = {
          title: document.title,
          meta: {},
          headings: [],
          links: [],
          text: [],
          tables: []
        };

        // Extract meta data
        document.querySelectorAll('meta').forEach(meta => {
          if (meta.name && meta.content) {
            data.meta[meta.name] = meta.content;
          }
        });

        // Extract headings
        document.querySelectorAll('h1, h2, h3').forEach(heading => {
          data.headings.push({
            level: heading.tagName,
            text: heading.innerText.trim()
          });
        });

        // Extract links
        document.querySelectorAll('a').forEach(link => {
          data.links.push({
            text: link.innerText.trim(),
            href: link.href,
            aria: link.getAttribute('aria-label')
          });
        });

        // Extract main content text
        document.querySelectorAll('p, article, section').forEach(element => {
          const text = element.innerText.trim();
          if (text) {
            data.text.push(text);
          }
        });

        // Extract tables
        document.querySelectorAll('table').forEach(table => {
          const tableData = [];
          table.querySelectorAll('tr').forEach(row => {
            const rowData = [];
            row.querySelectorAll('td, th').forEach(cell => {
              rowData.push(cell.innerText.trim());
            });
            tableData.push(rowData);
          });
          data.tables.push(tableData);
        });

        return data;
      });

      return pageData;
    } catch (error) {
      return {
        error: error.message,
        url: url
      };
    } finally {
      await context.close();
    }
  }

  async addHumanBehavior(page) {
    // Random mouse movements with natural acceleration
    const points = [];
    for (let i = 0; i < 5; i++) {
      points.push({
        x: Math.random() * page.viewportSize().width,
        y: Math.random() * page.viewportSize().height
      });
    }

    for (const point of points) {
      await page.mouse.move(point.x, point.y, {
        steps: 10
      });
    }

    // Random scrolling with smooth behavior
    await page.evaluate(() => {
      const maxScroll = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const scrollTo = Math.random() * maxScroll;
      window.scrollTo({
        top: scrollTo,
        behavior: 'smooth'
      });
    });

    // Random delays between actions
    await page.waitForTimeout(1000 + Math.random() * 2000);
  }

  async executeAction(page, action) {
    try {
      // Add random delay before each action
      await page.waitForTimeout(500 + Math.random() * 1000);

      switch (action.type) {
        case 'click':
          await page.waitForSelector(action.selector, { 
            state: 'visible',
            timeout: 5000 
          });
          // Move mouse naturally to element
          const element = await page.$(action.selector);
          const box = await element.boundingBox();
          if (box) {
            // Move to a random point within the element
            const x = box.x + (box.width * Math.random());
            const y = box.y + (box.height * Math.random());
            await page.mouse.move(x, y, { steps: 10 });
          }
          await page.click(action.selector, {
            delay: 100 + Math.random() * 200
          });
          break;

        case 'type':
          await page.waitForSelector(action.selector, { 
            state: 'visible',
            timeout: 5000 
          });
          await page.click(action.selector, { delay: 100 });
          // Type with variable delays between keystrokes
          for (const char of action.text) {
            await page.keyboard.type(char, {
              delay: 50 + Math.random() * 150
            });
            // Occasionally pause while typing
            if (Math.random() < 0.1) {
              await page.waitForTimeout(500 + Math.random() * 1000);
            }
          }
          break;

        case 'scroll':
          await page.evaluate((y) => {
            window.scrollTo({
              top: y,
              behavior: 'smooth'
            });
          }, action.y);
          break;

        case 'wait':
          await page.waitForTimeout(Math.min(action.ms, 5000));
          break;

        case 'waitForSelector':
          await page.waitForSelector(action.selector, { 
            timeout: 5000,
            state: 'visible'
          });
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      throw new Error(`Action failed: ${action.type} - ${error.message}`);
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
