import logger from '../utils/logger.js';
import candleStorage from './storage.js';

const CANDLE_STATES = {
  INCOMPLETE: 'incomplete',
  COMPLETE: 'complete',
};

/**
 * Processes incoming candle data from WebSocket
 */
class CandleProcessor {
  constructor() {
    this.pendingCandles = {}; // Track candles being formed
    this.closedCallbacks = []; // Callbacks when candle closes
    this.updateCallbacks = []; // Callbacks when candle updates
  }

  /**
   * Process candle data from WebSocket
   */
  processCandle(asset, candleData) {
    try {
      const candle = this.parseCandle(candleData);
      
      if (!candle) {
        logger.warn('Invalid candle data', { asset });
        return;
      }

      const lastClosed = candleStorage.getLastClosedCandle(asset);
      const current = candleStorage.getCurrentCandle(asset);

      // Check if this is a new closed candle
      if (lastClosed && candle.timestamp > lastClosed.timestamp) {
        // Previous candle is complete
        if (current && current.timestamp !== candle.timestamp) {
          candleStorage.addClosedCandle(asset, current);
          this.notifyClosedCallbacks(asset, current);
          logger.debug('Candle closed', {
            asset,
            timestamp: current.timestamp,
            close: current.close,
          });
        }
      }

      // Update current candle
      candleStorage.setCurrentCandle(asset, candle);
      this.notifyUpdateCallbacks(asset, candle);

      return candle;
    } catch (error) {
      logger.error('Error processing candle', { asset, error: error.message });
      return null;
    }
  }

  /**
   * Parse candle data from various formats
   */
  parseCandle(data) {
    try {
      // Handle different candle data formats
      if (typeof data === 'object') {
        return {
          timestamp: data.time || data.timestamp || Date.now(),
          open: parseFloat(data.open || data.o || 0),
          high: parseFloat(data.high || data.h || 0),
          low: parseFloat(data.low || data.l || 0),
          close: parseFloat(data.close || data.c || 0),
          isClosed: data.isClosed || data.closed || false,
        };
      }
      return null;
    } catch (error) {
      logger.error('Error parsing candle data', { error: error.message });
      return null;
    }
  }

  /**
   * Validate candle data
   */
  validateCandle(candle) {
    if (!candle) return false;
    if (!candle.open || !candle.high || !candle.low || !candle.close) return false;
    if (candle.high < candle.low) return false;
    if (candle.open < candle.low || candle.open > candle.high) return false;
    if (candle.close < candle.low || candle.close > candle.high) return false;
    return true;
  }

  /**
   * Register callback for when candle closes
   */
  onCandleClosed(callback) {
    this.closedCallbacks.push(callback);
  }

  /**
   * Register callback for candle updates
   */
  onCandleUpdate(callback) {
    this.updateCallbacks.push(callback);
  }

  /**
   * Notify closed callbacks
   */
  notifyClosedCallbacks(asset, candle) {
    this.closedCallbacks.forEach(callback => {
      try {
        callback(asset, candle);
      } catch (error) {
        logger.error('Error in candle closed callback', { error: error.message });
      }
    });
  }

  /**
   * Notify update callbacks
   */
  notifyUpdateCallbacks(asset, candle) {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(asset, candle);
      } catch (error) {
        logger.error('Error in candle update callback', { error: error.message });
      }
    });
  }
}

export default new CandleProcessor();
