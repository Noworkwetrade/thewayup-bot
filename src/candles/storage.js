import logger from '../utils/logger.js';
import config from '../config.js';

/**
 * Stores and manages candle data
 */
class CandleStorage {
  constructor() {
    this.candles = {}; // { asset: [candles] }
    this.currentCandle = {}; // { asset: candle }
    this.maxHistory = 500; // Keep last 500 candles per asset
  }

  /**
   * Add a closed candle
   */
  addClosedCandle(asset, candle) {
    if (!this.candles[asset]) {
      this.candles[asset] = [];
    }

    // Avoid duplicates
    const exists = this.candles[asset].some(c => c.timestamp === candle.timestamp);
    if (!exists) {
      this.candles[asset].push(candle);

      // Maintain max history
      if (this.candles[asset].length > this.maxHistory) {
        this.candles[asset].shift();
      }
    }
  }

  /**
   * Set the current forming candle
   */
  setCurrentCandle(asset, candle) {
    this.currentCandle[asset] = candle;
  }

  /**
   * Get current forming candle
   */
  getCurrentCandle(asset) {
    return this.currentCandle[asset] || null;
  }

  /**
   * Get closed candles
   */
  getClosedCandles(asset, limit = null) {
    if (!this.candles[asset]) {
      return [];
    }

    let candles = [...this.candles[asset]];
    if (limit && limit > 0) {
      candles = candles.slice(-limit);
    }
    return candles;
  }

  /**
   * Get all candles (closed + current)
   */
  getAllCandles(asset, limit = null) {
    const closed = this.getClosedCandles(asset, limit);
    const current = this.getCurrentCandle(asset);

    if (current) {
      return [...closed, current];
    }
    return closed;
  }

  /**
   * Get last N candles
   */
  getLastCandles(asset, count = 20) {
    return this.getClosedCandles(asset, count);
  }

  /**
   * Get last closed candle
   */
  getLastClosedCandle(asset) {
    const candles = this.getClosedCandles(asset);
    return candles.length > 0 ? candles[candles.length - 1] : null;
  }

  /**
   * Check if we have enough candles for analysis
   */
  hasEnoughCandles(asset, required = config.trading.minCandlesRequired) {
    const candles = this.getClosedCandles(asset);
    return candles.length >= required;
  }

  /**
   * Get candle count
   */
  getCandleCount(asset) {
    return this.candles[asset] ? this.candles[asset].length : 0;
  }

  /**
   * Get all assets being tracked
   */
  getTrackedAssets() {
    return Object.keys(this.candles);
  }

  /**
   * Clear candles for an asset
   */
  clearAsset(asset) {
    delete this.candles[asset];
    delete this.currentCandle[asset];
  }

  /**
   * Clear all data
   */
  clearAll() {
    this.candles = {};
    this.currentCandle = {};
  }
}

export default new CandleStorage();
