# AI-Friendly JavaScript Executor 🤖

A powerful, AI-optimized JavaScript execution API that allows AI models to interact with JavaScript-heavy websites while bypassing common anti-bot protections.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/playwright-v1.41.0-blue)](https://playwright.dev/)

## 🌟 Features

### Core Functionality
- 🌐 Load and execute JavaScript on any website
- 🔄 Handle dynamic content loading
- 📊 Extract structured data (JSON format)
- 🖱️ Simulate real user interactions

### Anti-Bot Protection Bypass
- 🔒 Advanced browser fingerprint randomization
- 🌍 Proxy support with automatic rotation
- 🤖 CAPTCHA solving (reCAPTCHA, hCaptcha, image CAPTCHAs)
- 👤 Persistent browser profiles
- 🎭 Human behavior simulation

### Performance & Reliability
- ⚡ Fast page loading with smart timeouts
- 🔄 Automatic retries with exponential backoff
- 💾 Session persistence
- 🔍 Detailed error reporting

## 🚀 Quick Start

### Prerequisites
- Node.js >= 16.0.0
- npm >= 7.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/mariagorskikh/ai-js-executor.git

# Navigate to project directory
cd ai-js-executor

# Install dependencies
npm install

# Create and configure your .env file
cp .env.example .env
```

### Configuration

Create a `.env` file with the following variables:

```env
PORT=3000
NODE_ENV=development

# Proxy configuration
PROXY_USERNAME=your_proxy_username
PROXY_PASSWORD=your_proxy_password
PROXY_HOST=proxy.example.com
PROXY_PORT=8080

# 2captcha configuration
CAPTCHA_API_KEY=your_2captcha_api_key

# Browser profiles directory
BROWSER_PROFILES_DIR=./browser-profiles
```

### Basic Usage

Start the server:
```bash
npm start
```

Make a request:
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "actions": [
      {
        "type": "click",
        "selector": "#search-button"
      },
      {
        "type": "type",
        "selector": "#search-input",
        "text": "search query"
      }
    ]
  }'
```

## 📖 API Documentation

### POST /api/execute

Execute actions on a webpage and extract data.

#### Request Body

```typescript
{
  url: string;          // Target URL
  actions?: Action[];   // Optional array of actions to perform
}
```

#### Supported Actions

```typescript
type Action = {
  // Click an element
  type: 'click';
  selector: string;
} | {
  // Type text
  type: 'type';
  selector: string;
  text: string;
} | {
  // Scroll the page
  type: 'scroll';
  y: number;
} | {
  // Wait for a specific duration
  type: 'wait';
  ms: number;
} | {
  // Wait for an element
  type: 'waitForSelector';
  selector: string;
}
```

#### Response Format

```typescript
{
  title: string;        // Page title
  meta: {              // Meta tags
    [key: string]: string;
  };
  headings: {          // H1, H2, H3 headings
    level: string;
    text: string;
  }[];
  links: {             // All links on the page
    text: string;
    href: string;
    aria?: string;
  }[];
  text: string[];      // Main content text
  tables: any[][];     // Table data
}
```

## 🛡️ Anti-Bot Features

### Browser Profile Management
- Automatic profile creation per domain
- Cookie and local storage persistence
- Session management
- Automatic profile rotation

### Human Behavior Simulation
- Natural mouse movements with acceleration
- Random scrolling patterns
- Variable typing speeds with natural pauses
- Realistic viewport management

### Browser Fingerprint Randomization
- User agent rotation
- WebGL fingerprint spoofing
- Plugin and font fingerprint randomization
- Screen resolution and color depth variation

### CAPTCHA Handling
- Automatic CAPTCHA detection
- Support for multiple CAPTCHA types
- Integration with 2captcha service
- Automatic retry mechanism

## 🔧 Advanced Configuration

### Proxy Configuration
```javascript
{
  proxy: {
    server: 'http://proxy.example.com:8080',
    username: 'user',
    password: 'pass'
  }
}
```

### Browser Profile Options
```javascript
{
  profileName: 'custom-profile',
  userAgent: 'custom-user-agent',
  viewport: {
    width: 1920,
    height: 1080
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is intended for legitimate web scraping and automation purposes only. Users are responsible for complying with websites' terms of service and applicable laws. The authors are not responsible for any misuse of this software.
