import {
  getCandleBody,
  getUpperWick,
  getLowerWick,
  getCandleRange,
  isBullish,
  isBearish,
  isDoji,
} from '../utils/helpers.js';
import config from '../config.js';

/**
 * Candlestick pattern definitions and detection
 */
class PatternDetector {
  /**
   * Detect hammer pattern
   * - Small body at the top or middle
   * - Long lower wick (at least 2x body size)
   * - Small or no upper wick
   */
  detectHammer(candle) {
    const range = getCandleRange(candle);
    const body = getCandleBody(candle);
    const lowerWick = getLowerWick(candle);
    const upperWick = getUpperWick(candle);

    const bodyRatio = body / range;
    const lowerWickRatio = lowerWick / body;
    const upperWickRatio = upperWick / body;

    const thresholds = config.patterns.hammer;

    return (
      bodyRatio < thresholds.bodyRatio &&
      lowerWickRatio > thresholds.lowerWickRatio &&
      upperWickRatio < thresholds.upperWickRatio
    );
  }

  /**
   * Detect shooting star pattern
   * - Small body at the bottom
   * - Long upper wick (at least 2x body size)
   * - Small or no lower wick
   */
  detectShootingStar(candle) {
    const range = getCandleRange(candle);
    const body = getCandleBody(candle);
    const lowerWick = getLowerWick(candle);
    const upperWick = getUpperWick(candle);

    const bodyRatio = body / range;
    const upperWickRatio = upperWick / body;
    const lowerWickRatio = lowerWick / body;

    const thresholds = config.patterns.hammer; // Same thresholds, inverted

    return (
      bodyRatio < thresholds.bodyRatio &&
      upperWickRatio > thresholds.lowerWickRatio &&
      lowerWickRatio < thresholds.upperWickRatio
    );
  }

  /**
   * Detect bullish pin bar
   * - Small body (can be bullish or bearish)
   * - Long lower wick
   * - Small upper wick
   * - Close near upper portion
   */
  detectBullishPinBar(candle) {
    const range = getCandleRange(candle);
    const body = getCandleBody(candle);
    const lowerWick = getLowerWick(candle);

    const bodyRatio = body / range;
    const wickRatio = lowerWick / body;

    const thresholds = config.patterns.pinBar;

    return (
      bodyRatio < thresholds.bodyRatio &&
      wickRatio > thresholds.wickRatio &&
      candle.close > candle.open // Bullish body
    );
  }

  /**
   * Detect bearish pin bar
   * - Small body
   * - Long upper wick
   * - Small lower wick
   * - Close near lower portion
   */
  detectBearishPinBar(candle) {
    const range = getCandleRange(candle);
    const body = getCandleBody(candle);
    const upperWick = getUpperWick(candle);

    const bodyRatio = body / range;
    const wickRatio = upperWick / body;

    const thresholds = config.patterns.pinBar;

    return (
      bodyRatio < thresholds.bodyRatio &&
      wickRatio > thresholds.wickRatio &&
      candle.close < candle.open // Bearish body
    );
  }

  /**
   * Detect bullish engulfing pattern
   * - Previous candle is bearish
   * - Current candle is bullish
   * - Current candle's open is below previous close
   * - Current candle's close is above previous open
   */
  detectBullishEngulfing(currentCandle, previousCandle) {
    if (!previousCandle) return false;

    return (
      isBearish(previousCandle) &&
      isBullish(currentCandle) &&
      currentCandle.open < previousCandle.close &&
      currentCandle.close > previousCandle.open
    );
  }

  /**
   * Detect bearish engulfing pattern
   * - Previous candle is bullish
   * - Current candle is bearish
   * - Current candle's open is above previous close
   * - Current candle's close is below previous open
   */
  detectBearishEngulfing(currentCandle, previousCandle) {
    if (!previousCandle) return false;

    return (
      isBullish(previousCandle) &&
      isBearish(currentCandle) &&
      currentCandle.open > previousCandle.close &&
      currentCandle.close < previousCandle.open
    );
  }

  /**
   * Detect morning star pattern (3 candles)
   * - First: Bearish candle
   * - Second: Small body (doji or very small), gap down
   * - Third: Bullish candle, closes above midpoint of first candle
   */
  detectMorningStar(candles) {
    if (candles.length < 3) return false;

    const c1 = candles[candles.length - 3];
    const c2 = candles[candles.length - 2];
    const c3 = candles[candles.length - 1];

    const isGapDown = c2.high < c1.low;
    const c1Midpoint = (c1.open + c1.close) / 2;

    return (
      isBearish(c1) &&
      getCandleBody(c2) < getCandleRange(c1) * 0.3 &&
      isGapDown &&
      isBullish(c3) &&
      c3.close > c1Midpoint
    );
  }

  /**
   * Detect evening star pattern (3 candles)
   * - First: Bullish candle
   * - Second: Small body, gap up
   * - Third: Bearish candle, closes below midpoint of first candle
   */
  detectEveningStar(candles) {
    if (candles.length < 3) return false;

    const c1 = candles[candles.length - 3];
    const c2 = candles[candles.length - 2];
    const c3 = candles[candles.length - 1];

    const isGapUp = c2.low > c1.high;
    const c1Midpoint = (c1.open + c1.close) / 2;

    return (
      isBullish(c1) &&
      getCandleBody(c2) < getCandleRange(c1) * 0.3 &&
      isGapUp &&
      isBearish(c3) &&
      c3.close < c1Midpoint
    );
  }

  /**
   * Detect bullish rejection at support
   * - Candle tests support but closes well above
   * - Shows strong rejection of lower prices
   */
  detectBullishRejection(candle, supportLevel) {
    if (!supportLevel) return false;

    const proximity = supportLevel * 0.005; // Within 0.5%
    const testesSupport = candle.low <= supportLevel + proximity;
    const closesAbove = candle.close > supportLevel + (candle.high - candle.low) * 0.5;

    return testesSupport && closesAbove && isBullish(candle);
  }

  /**
   * Detect bearish rejection at resistance
   * - Candle tests resistance but closes well below
   * - Shows strong rejection of higher prices
   */
  detectBearishRejection(candle, resistanceLevel) {
    if (!resistanceLevel) return false;

    const proximity = resistanceLevel * 0.005; // Within 0.5%
    const testesResistance = candle.high >= resistanceLevel - proximity;
    const closesBelow = candle.close < resistanceLevel - (candle.high - candle.low) * 0.5;

    return testesResistance && closesBelow && isBearish(candle);
  }
}

export default new PatternDetector();
