const WS_URL = "wss://api-msk.po.market/socket.io/?EIO=4&transport=websocket";

let ws = null;
let pingInterval = null;
let latestCandle = { open: 0, close: 0, symbol: "EURUSD_otc" };
let activePair = "EURUSD_otc";
let activeTimeframe = 15;

function connectWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log("[TheWayUp Bot] Connected to Pocket Option WS");
    ws.send("40"); // Engine.IO Handshake

    if (pingInterval) clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send("3"); // Ping
      }
    }, 20000);

    subscribeToAsset(activePair);
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
          processCandleData(payload);
        }
      } catch (err) {
        console.error("Parse error:", err);
      }
    }
  };

  ws.onclose = () => {
    console.log("[TheWayUp Bot] WS Closed. Reconnecting...");
    if (pingInterval) clearInterval(pingInterval);
    setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = (err) => {
    console.error("[TheWayUp Bot] WS Error:", err);
  };
}

function subscribeToAsset(asset) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    activePair = asset;
    const subMsg = JSON.stringify([
      "changeSymbol",
      { symbol: asset, period: activeTimeframe }
    ]);
    ws.send(`42${subMsg}`);
  }
}

function processCandleData(payload) {
  if (!payload) return;

  let open = payload.open || payload.o || (Array.isArray(payload) ? payload[1] : 0);
  let close = payload.close || payload.c || (Array.isArray(payload) ? payload[2] : 0);

  if (close) {
    latestCandle = {
      open: parseFloat(open),
      close: parseFloat(close),
      symbol: activePair
    };

    // Broadcast update to popup if open
    chrome.runtime.sendMessage({
      type: "CANDLE_UPDATE",
      data: latestCandle,
      connected: ws && ws.readyState === WebSocket.OPEN
    }).catch(() => {}); // Catch error when popup is closed
  }
}

// Communication handler for index.html / app.js
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
