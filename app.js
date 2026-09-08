// TheWayUp Bot - WebSocket Engine
const WS_URL = "wss://api-msk.po.market/socket.io/?EIO=4&transport=websocket";

let ws = null;
let pingInterval = null;
let latestCandle = { open: 0, close: 0, high: 0, low: 0 };
let activePair = "EURUSD_otc";
let activeTimeframe = 15;

// Initialize Connection
function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    document.getElementById("ws-status").innerText = "CONNECTED";
    document.getElementById("ws-status").style.color = "#00e676";
    
    // Engine.IO handshakes
    ws.send("40"); 
    
    // Maintain keep-alive pings
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send("3"); // Engine.IO Ping
      }
    }, 25000);

    // Subscribe to default pair
    subscribeToAsset(activePair);
  };

  ws.onmessage = (event) => {
    const data = event.data;

    // Handle Engine.IO Ping/Pong Heartbeat
    if (data === "2") {
      ws.send("3");
      return;
    }

    // Process Socket.IO message payloads (starts with 42)
    if (data.startsWith("42")) {
      try {
        const parsed = JSON.parse(data.substring(2));
        const eventName = parsed[0];
        const payload = parsed[1];

        // Process incoming candles
        if (eventName === "updateStream" || eventName === "candles") {
          processCandleData(payload);
        }
      } catch (err) {
        console.error("Payload parse error:", err);
      }
    }
  };

  ws.onclose = () => {
    document.getElementById("ws-status").innerText = "DISCONNECTED";
    document.getElementById("ws-status").style.color = "#ff5252";
    clearInterval(pingInterval);
    // Auto reconnect after 3s
    setTimeout(connectWebSocket, 3000);
  };
}

// Request stream for specific asset
function subscribeToAsset(asset) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const subMsg = JSON.stringify([
      "changeSymbol",
      { symbol: asset, period: activeTimeframe }
    ]);
    ws.send(`42${subMsg}`);
  }
}

// Extract Candle Payload
function processCandleData(payload) {
  if (!payload) return;

  // Normalize Candle Arrays/Objects
  let open = payload.open || payload.o || (Array.isArray(payload) ? payload[1] : 0);
  let close = payload.close || payload.c || (Array.isArray(payload) ? payload[2] : 0);

  if (close) {
    latestCandle.open = parseFloat(open);
    latestCandle.close = parseFloat(close);

    // UI Update
    const priceElem = document.getElementById("close-price");
    const statusElem = document.getElementById("candle-status");

    priceElem.innerText = latestCandle.close.toFixed(5);

    if (latestCandle.close >= latestCandle.open) {
      statusElem.innerText = "BULLISH ▲";
      statusElem.className = "candle-type candle-up";
    } else {
      statusElem.innerText = "BEARISH ▼";
      statusElem.className = "candle-type candle-down";
    }
  }
}

// Event Bindings
document.addEventListener("DOMContentLoaded", () => {
  connectWebSocket();

  // Handle Pair Selection
  document.getElementById("pair-select").addEventListener("change", (e) => {
    activePair = e.target.value;
    subscribeToAsset(activePair);
  });

  // Handle Timeframe Switch
  document.querySelectorAll(".btn-tf").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".btn-tf").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      activeTimeframe = parseInt(e.target.getAttribute("data-tf"));
      subscribeToAsset(activePair);
    });
  });

  // Signal Calculation Engine Trigger
  document.getElementById("btn-generate").addEventListener("click", () => {
    const output = document.getElementById("signal-output");
    output.className = "signal-output";
    output.innerText = "ANALYZING...";
    output.style.display = "block";

    setTimeout(() => {
      // Signal logic combined with realtime candles
      const isCall = latestCandle.close >= latestCandle.open;
      output.innerText = isCall ? "CALL ▲" : "PUT ▼";
      output.className = `signal-output ${isCall ? 'CALL' : 'PUT'}`;
    }, 800);
  });
});

