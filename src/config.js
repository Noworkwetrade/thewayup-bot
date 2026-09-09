import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const config = {
  // Pocket Option Credentials
  pocketOption: {
    ssid: process.env.POCKET_OPTION_SSID || null,
    uid: process.env.POCKET_OPTION_UID || null,
    mode: process.env.POCKET_OPTION_MODE || 'demo',
    demoUrl: process.env.POCKET_OPTION_DEMO_URL || 'wss://demo-api-eu.po.market/socket.io/?EIO=4&transport=websocket',
    realUrl: process.env.POCKET_OPTION_REAL_URL || 'wss://api-eu.po.market/socket.io/?EIO=4&transport=websocket',
  },

  // Bot Configuration
  bot: {
    port: parseInt(process.env.SIGNAL_BOT_PORT || '3000'),
    host: process.env.SIGNAL_BOT_HOST || 'localhost',
    logLevel: process.env.LOG_LEVEL || 'info',
    marketMonitoringInterval: parseInt(process.env.MARKET_MONITORING_INTERVAL || '1000'),
    signalCooldownMs: parseInt(process.env.SIGNAL_COOLDOWN_MS || '5000'),
  },

  // Trading Settings
  trading: {
    defaultAsset: process.env.DEFAULT_ASSET || 'XAUUSD_otc',
    defaultTimeframe: parseInt(process.env.DEFAULT_TIMEFRAME || '60'),
    minCandlesRequired: parseInt(process.env.MIN_CANDLES_REQUIRED || '20'),
    supportResistanceLookback: parseInt(process.env.SUPPORT_RESISTANCE_LOOKBACK || '50'),
  },

  // Strategy Settings
  strategy: {
    enableBullishPatterns: process.env.ENABLE_BULLISH_PATTERNS !== 'false',
    enableBearishPatterns: process.env.ENABLE_BEARISH_PATTERNS !== 'false',
    enableMarketStructure: process.env.ENABLE_MARKET_STRUCTURE !== 'false',
    minSignalConfidence: process.env.MIN_SIGNAL_CONFIDENCE || 'medium',
  },

  // WebSocket
  websocket: {
    reconnectDelay: 2000,
    reconnectMaxAttempts: 10,
    heartbeatInterval: 30000,
    responseTimeout: 5000,
  },

  // Pattern Detection Thresholds
  patterns: {
    // Hammer: small body at bottom, long wick at top
    hammer: {
      bodyRatio: 0.3,        // Body < 30% of total range
      lowerWickRatio: 2.0,   // Lower wick > 2x body
      upperWickRatio: 0.5,   // Upper wick < 0.5x body
    },
    // Pin Bar: small body with long wick on one side
    pinBar: {
      bodyRatio: 0.3,
      wickRatio: 2.0,
    },
    // Engulfing: current candle completely engulfs previous
    engulfing: {
      bodyOverlapRatio: 0.1,  // 10% or less overlap
    },
    // Morning Star / Evening Star
    star: {
      gapRatio: 0.3,  // Gap between candles
    },
  },

  // Support/Resistance Detection
  supportResistance: {
    minTouchesRequired: 2,
    proximityPercent: 1.0,  // Within 1% is considered same level
    maxLevels: 5,
  },
};

// Validate critical configuration
function validateConfig() {
  if (!config.pocketOption.ssid) {
    throw new Error('POCKET_OPTION_SSID is required in .env file');
  }
  if (!config.pocketOption.uid) {
    throw new Error('POCKET_OPTION_UID is required in .env file');
  }
  if (!['demo', 'real'].includes(config.pocketOption.mode)) {
    throw new Error('POCKET_OPTION_MODE must be "demo" or "real"');
  }
}

validateConfig();

export default config;
