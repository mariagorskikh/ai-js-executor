import { Solver } from '2captcha';
import ProxyChain from 'proxy-chain';
import randomUserAgent from 'random-useragent';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export class AntiBotService {
  constructor() {
    this.solver = new Solver(process.env.CAPTCHA_API_KEY);
    this.proxyUrl = null;
    this.profilesDir = process.env.BROWSER_PROFILES_DIR;
  }

  async initializeProxy() {
    const username = process.env.PROXY_USERNAME;
    const password = process.env.PROXY_PASSWORD;
    const proxyHost = process.env.PROXY_HOST;
    const proxyPort = process.env.PROXY_PORT;

    const oldProxyUrl = `http://${username}:${password}@${proxyHost}:${proxyPort}`;
    this.proxyUrl = await ProxyChain.anonymizeProxy(oldProxyUrl);
    return this.proxyUrl;
  }

  async solveCaptcha(page, selectorOrScreenshot) {
    try {
      let base64Image;
      
      if (typeof selectorOrScreenshot === 'string') {
        // If selector provided, take screenshot of the element
        const element = await page.$(selectorOrScreenshot);
        if (!element) throw new Error('Captcha element not found');
        base64Image = await element.screenshot({ encoding: 'base64' });
      } else {
        // Use provided screenshot
        base64Image = selectorOrScreenshot;
      }

      const result = await this.solver.imageCaptcha(base64Image);
      return result.data;
    } catch (error) {
      console.error('Failed to solve CAPTCHA:', error);
      throw error;
    }
  }

  async solveRecaptchaV2(page, websiteKey, websiteURL) {
    try {
      const result = await this.solver.recaptcha({
        googlekey: websiteKey,
        pageurl: websiteURL
      });
      
      await page.evaluate((token) => {
        window.grecaptcha.enterprise.execute = () => token;
      }, result.data);
      
      return result.data;
    } catch (error) {
      console.error('Failed to solve reCAPTCHA:', error);
      throw error;
    }
  }

  async solveHCaptcha(page, websiteKey, websiteURL) {
    try {
      const result = await this.solver.hcaptcha({
        sitekey: websiteKey,
        pageurl: websiteURL
      });
      
      await page.evaluate((token) => {
        window.hcaptcha.execute = () => token;
      }, result.data);
      
      return result.data;
    } catch (error) {
      console.error('Failed to solve hCaptcha:', error);
      throw error;
    }
  }

  async createBrowserProfile(profileName) {
    const profilePath = path.join(this.profilesDir, profileName);
    
    try {
      await fs.mkdir(profilePath, { recursive: true });
      
      // Create basic profile data
      const profileData = {
        created: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        userAgent: randomUserAgent.getRandom(),
        cookies: [],
        localStorage: {},
        sessionStorage: {}
      };
      
      await fs.writeFile(
        path.join(profilePath, 'profile.json'),
        JSON.stringify(profileData, null, 2)
      );
      
      return profilePath;
    } catch (error) {
      console.error('Failed to create browser profile:', error);
      throw error;
    }
  }

  async loadBrowserProfile(profileName) {
    const profilePath = path.join(this.profilesDir, profileName);
    
    try {
      const profileData = JSON.parse(
        await fs.readFile(path.join(profilePath, 'profile.json'), 'utf-8')
      );
      
      // Update last used timestamp
      profileData.lastUsed = new Date().toISOString();
      await fs.writeFile(
        path.join(profilePath, 'profile.json'),
        JSON.stringify(profileData, null, 2)
      );
      
      return profileData;
    } catch (error) {
      // If profile doesn't exist, create a new one
      if (error.code === 'ENOENT') {
        await this.createBrowserProfile(profileName);
        return this.loadBrowserProfile(profileName);
      }
      throw error;
    }
  }

  async updateBrowserProfile(profileName, data) {
    const profilePath = path.join(this.profilesDir, profileName);
    
    try {
      const profileData = await this.loadBrowserProfile(profileName);
      const updatedData = { ...profileData, ...data };
      
      await fs.writeFile(
        path.join(profilePath, 'profile.json'),
        JSON.stringify(updatedData, null, 2)
      );
      
      return updatedData;
    } catch (error) {
      console.error('Failed to update browser profile:', error);
      throw error;
    }
  }

  getRandomFingerprint() {
    return {
      userAgent: randomUserAgent.getRandom(),
      viewport: {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        isLandscape: true
      },
      platform: 'Win32',
      vendor: 'Google Inc.',
      plugins: [
        {
          name: 'Chrome PDF Plugin',
          description: 'Portable Document Format',
          filename: 'internal-pdf-viewer'
        }
      ],
      languages: ['en-US', 'en'],
      timezone: 'America/New_York',
      webgl: {
        vendor: 'Google Inc. (Intel)',
        renderer: 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0)'
      }
    };
  }
}
