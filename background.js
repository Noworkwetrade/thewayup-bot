// TheWayUp Bot - Scanner Engine
const WS_URL = "wss://api-msk.po.market/socket.io/?EIO=4&transport=websocket";

// Complete OTC Asset Watchlist
const OTC_PAIRS = [
  "EURUSD_otc", "GBPUSD_otc", "USDJPY_otc", "AUDCAD_otc", "AUDUSD_otc",
  "EURGBP_otc", "EURJPY_otc", "GBPJPY_otc", "NZDUSD_otc", "USDCAD_otc",
  "USDCHF_otc", "AUDJPY_otc", "GBPAUD_otc", "CHFJPY_otc", "EURCHF_otc"
];

let ws = null;
let pingInterval = null;
let scanIndex = 0;

// Internal Candle History per Pair: { symbol: [candle1, candle2, ...] }
const candleHistory = {};

// Public Output Signal (Hides strategy details)
let activeSignal = {
  pair: "SCANNING...",
  direction: "WAITING", // "BUY", "SELL", or "WAITING"
  timestamp: null
};

function connectWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log("[TheWayUp Scanner] WebSocket Connected.");
    ws.send("40");

    if (pingInterval) clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send("3");
      }
    }, 20000);

    // Start scanner loop across OTC pairs
    startPairScanner();
  };

  ws.onmessage = (event) => {
    const data = event.data;
    if (data === "2") {
      ws.send("3");
      return;
    }

    if (data.startsWith("42")) {
      try {
        const parsed = JSON.parse(data.substring(2));
        const eventName = parsed[0];
        const payload = parsed[1];

        if (eventName === "updateStream" || eventName === "candles" || eventName === "updateCandle") {
          processCandleFeed(payload);
        }
      } catch (err) {
        console.error("[Scanner Parse Error]", err);
      }
    }
  };

  ws.onclose = () => {
    if (pingInterval) clearInterval(pingInterval);
    setTimeout(connectWebSocket, 3000);
  };
}

// Rotate stream across all OTC pairs on 1-minute timeframes
function startPairScanner() {
  setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const currentPair = OTC_PAIRS[scanIndex];
    scanIndex = (scanIndex + 1) % OTC_PAIRS.length;

    const subMsg = JSON.stringify([
      "changeSymbol",
      { symbol: currentPair, period: 60 } // Enforce 1-minute timeframe
    ]);
    ws.send(`42${subMsg}`);
  }, 2500); // Poll/switch active scanning pair every 2.5s
}

function processCandleFeed(payload) {
  if (!payload) return;

  const symbol = payload.asset || payload.symbol || OTC_PAIRS[scanIndex];
  let open = parseFloat(payload.open || payload.o || (Array.isArray(payload) ? payload[1] : 0));
  let close = parseFloat(payload.close || payload.c || (Array.isArray(payload) ? payload[2] : 0));
  let high = parseFloat(payload.high || payload.h || (Array.isArray(payload) ? payload[3] : Math.max(open, close)));
  let low = parseFloat(payload.low || payload.l || (Array.isArray(payload) ? payload[4] : Math.min(open, close)));

  if (!close || !open) return;

  if (!candleHistory[symbol]) {
    candleHistory[symbol] = [];
  }

  // Store 1-minute candle
  const candle = { open, close, high, low, time: Date.now() };
  candleHistory[symbol].push(candle);

  // Keep last 30 candles per pair for calculations
  if (candleHistory[symbol].length > 30) {
    candleHistory[symbol].shift();
  }

  // Run confidential evaluation engine
  evaluateMarketPatterns(symbol);
}

// Encapsulated Technical Strategy (Hidden from UI)
function evaluateMarketPatterns(symbol) {
  const candles = candleHistory[symbol];
  if (!candles || candles.length < 20) return; // Require sufficient history

  const cLen = candles.length;
  const c1 = candles[cLen - 1]; // Current candle
  const c2 = candles[cLen - 2]; // Previous candle
  const c3 = candles[cLen - 3]; // 2 candles ago

  // 20-period Support & Resistance Boundaries
  const lookback = candles.slice(cLen - 20, cLen - 1);
  const support = Math.min(...lookback.map(c => c.low));
  const resistance = Math.max(...lookback.map(c => c.high));

  const atSupport = (Math.abs(c1.low - support) / support) <= 0.0015;
  const atResistance = (Math.abs(c1.high - resistance) / resistance) <= 0.0015;

  let triggeredDirection = null;

  // Pattern 1: Hammer at Support
  const body = Math.abs(c1.close - c1.open);
  const lowerShadow = Math.min(c1.open, c1.close) - c1.low;
  const upperShadow = c1.high - Math.max(c1.open, c1.close);

  if (atSupport && lowerShadow >= (2 * body) && upperShadow <= body) {
    triggeredDirection = "BUY";
  }

  // Pattern 2: Bullish Engulfing at Support
  if (!triggeredDirection && atSupport) {
    if (c2.close < c2.open && c1.close > c1.open && c1.close >= c2.open && c1.open <= c2.close) {
      triggeredDirection = "BUY";
    }
  }

  // Pattern 3: Bearish Engulfing at Resistance
  if (!triggeredDirection && atResistance) {
    if (c2.close > c2.open && c1.close < c1.open && c1.close <= c2.open && c1.open >= c2.close) {
      triggeredDirection = "SELL";
    }
  }

  // Pattern 4: Evening Star at Resistance
  if (!triggeredDirection && atResistance && c3) {
    const c3Green = c3.close > c3.open;
    const c2Star = Math.abs(c2.close - c2.open) < (Math.abs(c3.close - c3.open) * 0.3);
    const c1Red = c1.close < c1.open && c1.close < (c3.open + c3.close) / 2;

    if (c3Green && c2Star && c1Red) {
      triggeredDirection = "SELL";
    }
  }

  // Update public signal if a high-probability pattern is detected
  if (triggeredDirection) {
    activeSignal = {
      pair: symbol.replace("_otc", " OTC").toUpperCase(),
      direction: triggeredDirection,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    broadcastSignal();
  }
}

function broadcastSignal() {
  chrome.runtime.sendMessage({
    type: "SIGNAL_UPDATE",
    signal: activeSignal,
    connected: ws && ws.readyState === WebSocket.OPEN
  }).catch(() => {});
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_SIGNAL") {
    sendResponse({
      signal: activeSignal,
      connected: ws && ws.readyState === WebSocket.OPEN
    });
  }
  return true;
});

connectWebSocket();
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_STATE") {
    sendResponse({
      connected: ws && ws.readyState === WebSocket.OPEN,
      candle: latestCandle,
      activePair: activePair,
      activeTimeframe: activeTimeframe
    });
  } else if (request.type === "CHANGE_PAIR") {
    activePair = request.pair;
    subscribeToAsset(activePair);
    sendResponse({ status: "ok" });
  } else if (request.type === "CHANGE_TF") {
    activeTimeframe = request.tf;
    subscribeToAsset(activePair);
    sendResponse({ status: "ok" });
  }
  return true;
});

// Initialize on startup
connectWebSocket();
