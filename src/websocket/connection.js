import WebSocket from 'ws';
import config from '../config.js';
import logger from '../utils/logger.js';
import { sleep } from '../utils/helpers.js';

class WebSocketConnection {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.messageHandlers = [];
    this.reconnectTimer = null;
  }

  /**
   * Generate auth message for Pocket Option
   */
  getAuthMessage() {
    const sessionData = {
      session: `a:4:{s:10:"session_id";s:32:"${config.pocketOption.ssid}";s:10:"ip_address";s:12:"127.0.0.1";s:10:"user_agent";s:117:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";s:13:"last_activity";i:${Math.floor(Date.now() / 1000)};}`,
      isDemo: config.pocketOption.mode === 'demo' ? 1 : 0,
      uid: parseInt(config.pocketOption.uid),
      platform: 1,
    };
    return `42["auth",${JSON.stringify(sessionData)}]`;
  }

  /**
   * Connect to Pocket Option WebSocket
   */
  async connect() {
    try {
      const url = config.pocketOption.mode === 'demo'
        ? config.pocketOption.demoUrl
        : config.pocketOption.realUrl;

      logger.info(`Connecting to Pocket Option WebSocket (${config.pocketOption.mode})...`);

      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        logger.info('WebSocket connection established');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.authenticate();
      });

      this.ws.on('message', (data) => {
        try {
          this.handleMessage(data.toString());
        } catch (error) {
          logger.error('Error processing WebSocket message', { error: error.message });
        }
      });

      this.ws.on('error', (error) => {
        logger.error('WebSocket error', { error: error.message });
        this.isConnected = false;
      });

      this.ws.on('close', () => {
        logger.warn('WebSocket connection closed');
        this.isConnected = false;
        this.attemptReconnect();
      });

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, config.websocket.responseTimeout);

        this.onceConnected = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
    } catch (error) {
      logger.error('Failed to create WebSocket connection', { error: error.message });
      throw error;
    }
  }

  /**
   * Authenticate with Pocket Option
   */
  authenticate() {
    try {
      const authMessage = this.getAuthMessage();
      this.send(authMessage);
      logger.debug('Authentication message sent');
    } catch (error) {
      logger.error('Authentication failed', { error: error.message });
    }
  }

  /**
   * Send message through WebSocket
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      return true;
    }
    logger.warn('WebSocket not ready, message not sent');
    return false;
  }

  /**
   * Subscribe to candles for an asset
   */
  subscribeToCandles(asset, timeframe = 60) {
    const message = `42["subscribe",{"name":"candle","params":{"asset":"${asset}","period":${timeframe}}}]`;
    return this.send(message);
  }

  /**
   * Unsubscribe from candles
   */
  unsubscribeFromCandles(asset, timeframe = 60) {
    const message = `42["unsubscribe",{"name":"candle","params":{"asset":"${asset}","period":${timeframe}}}]`;
    return this.send(message);
  }

  /**
   * Handle incoming messages
   */
  handleMessage(message) {
    if (message === '2') {
      // Heartbeat
      this.send('3');
      return;
    }

    if (message.startsWith('0')) {
      // Connection established
      logger.debug('Received connection confirmation');
      if (this.onceConnected) {
        this.onceConnected();
        this.onceConnected = null;
      }
      return;
    }

    if (message.startsWith('42[')) {
      try {
        const jsonStart = message.indexOf('[');
        const jsonString = message.substring(jsonStart);
        const data = JSON.parse(jsonString);
        
        if (Array.isArray(data) && data.length >= 2) {
          const eventName = data[0];
          const eventData = data[1];
          
          // Call registered handlers
          this.messageHandlers.forEach(handler => {
            try {
              handler(eventName, eventData);
            } catch (error) {
              logger.error('Error in message handler', { error: error.message });
            }
          });
        }
      } catch (error) {
        logger.debug('Could not parse message as JSON', { message: message.substring(0, 100) });
      }
    }
  }

  /**
   * Register a message handler
   */
  onMessage(handler) {
    this.messageHandlers.push(handler);
  }

  /**
   * Remove a message handler
   */
  offMessage(handler) {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  /**
   * Attempt to reconnect
   */
  async attemptReconnect() {
    if (this.reconnectAttempts >= config.websocket.reconnectMaxAttempts) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = config.websocket.reconnectDelay * this.reconnectAttempts;

    logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${config.websocket.reconnectMaxAttempts}) in ${delay}ms...`);

    await sleep(delay);

    try {
      await this.connect();
    } catch (error) {
      logger.error('Reconnection failed', { error: error.message });
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      readyState: this.ws ? this.ws.readyState : null,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

export default new WebSocketConnection();
