import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { BrowserService } from './services/browser.service.js';
import { CacheService } from './services/cache.service.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize services
const browserService = new BrowserService();
const cacheService = new CacheService();

// Middleware
app.use(express.json());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.post('/api/execute', async (req, res) => {
  try {
    const { url, actions = [] } = req.body;
    
    // Check cache first
    const cachedResult = await cacheService.get(url);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    // Execute page and actions
    const result = await browserService.executePage(url, actions);
    
    // Cache the result
    await cacheService.set(url, result);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/interact', async (req, res) => {
  try {
    const { url, action } = req.body;
    const result = await browserService.executeAction(url, action);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
