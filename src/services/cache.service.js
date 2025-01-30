import NodeCache from 'node-cache';

export class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutes default TTL
      checkperiod: 60
    });
  }

  async get(key) {
    return this.cache.get(key);
  }

  async set(key, value, ttl = 300) {
    return this.cache.set(key, value, ttl);
  }

  async del(key) {
    return this.cache.del(key);
  }

  async flush() {
    return this.cache.flushAll();
  }
}
