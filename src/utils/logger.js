import config from '../config.js';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const LEVEL_NAMES = {
  0: 'ERROR',
  1: 'WARN',
  2: 'INFO',
  3: 'DEBUG',
};

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

class Logger {
  constructor() {
    this.currentLevel = LOG_LEVELS[config.bot.logLevel] || LOG_LEVELS.info;
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  getColor(level) {
    switch (level) {
      case 'error':
        return COLORS.red;
      case 'warn':
        return COLORS.yellow;
      case 'info':
        return COLORS.green;
      case 'debug':
        return COLORS.cyan;
      default:
        return COLORS.reset;
    }
  }

  log(level, message, data = null) {
    if (LOG_LEVELS[level] <= this.currentLevel) {
      const timestamp = this.getTimestamp();
      const color = this.getColor(level);
      const levelName = LEVEL_NAMES[LOG_LEVELS[level]];

      let output = `${color}[${timestamp}] ${levelName}${COLORS.reset} ${message}`;

      if (data) {
        output += ` ${JSON.stringify(data)}`;
      }

      console.log(output);
    }
  }

  error(message, data) {
    this.log('error', message, data);
  }

  warn(message, data) {
    this.log('warn', message, data);
  }

  info(message, data) {
    this.log('info', message, data);
  }

  debug(message, data) {
    this.log('debug', message, data);
  }
}

export default new Logger();
