/**
 * Calculate the range of a candle (high - low)
 */
export function getCandleRange(candle) {
  return candle.high - candle.low;
}

/**
 * Get candle body size (absolute difference between open and close)
 */
export function getCandleBody(candle) {
  return Math.abs(candle.close - candle.open);
}

/**
 * Get upper wick size (high - max(open, close))
 */
export function getUpperWick(candle) {
  return candle.high - Math.max(candle.open, candle.close);
}

/**
 * Get lower wick size (min(open, close) - low)
 */
export function getLowerWick(candle) {
  return Math.min(candle.open, candle.close) - candle.low;
}

/**
 * Check if candle is bullish (close > open)
 */
export function isBullish(candle) {
  return candle.close > candle.open;
}

/**
 * Check if candle is bearish (close < open)
 */
export function isBearish(candle) {
  return candle.close < candle.open;
}

/**
 * Check if candle is doji (small body, relatively balanced wicks)
 */
export function isDoji(candle) {
  const range = getCandleRange(candle);
  const body = getCandleBody(candle);
  return body < range * 0.1; // Body less than 10% of range
}

/**
 * Format price for display
 */
export function formatPrice(price) {
  if (typeof price !== 'number') return 'N/A';
  return price.toFixed(2);
}

/**
 * Format time for display
 */
export function formatTime(timestamp) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleTimeString();
}

/**
 * Calculate percentage difference between two prices
 */
export function getPricePercentChange(priceFrom, priceTo) {
  if (priceFrom === 0) return 0;
  return ((priceTo - priceFrom) / priceFrom) * 100;
}

/**
 * Check if price is within proximity of a level
 */
export function isPriceNearLevel(price, level, proximityPercent = 1.0) {
  const range = level * (proximityPercent / 100);
  return Math.abs(price - level) <= range;
}

/**
 * Get trend direction based on price action
 */
export function getTrendDirection(highs, lows) {
  if (highs.length < 2 || lows.length < 2) return 'UNKNOWN';

  const recentHigh = highs[highs.length - 1];
  const previousHigh = highs[highs.length - 2];
  const recentLow = lows[lows.length - 1];
  const previousLow = lows[lows.length - 2];

  if (recentHigh > previousHigh && recentLow > previousLow) {
    return 'UPTREND';
  } else if (recentHigh < previousHigh && recentLow < previousLow) {
    return 'DOWNTREND';
  } else {
    return 'SIDEWAYS';
  }
}

/**
 * Sleep helper for delays
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get current timestamp in milliseconds
 */
export function getCurrentTimestamp() {
  return Date.now();
}

/**
 * Convert timestamp to candle time
 */
export function getCandleTimeFromTimestamp(timestamp, timeframe = 60) {
  return Math.floor(timestamp / 1000 / timeframe) * timeframe * 1000;
}
