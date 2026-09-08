let currentCandle = { open: 0, close: 0 };

function updateUI(candle, connected) {
  const statusElem = document.getElementById("ws-status");
  const priceElem = document.getElementById("close-price");
  const candleStatusElem = document.getElementById("candle-status");

  if (connected) {
    statusElem.innerText = "ONLINE";
    statusElem.style.color = "#00e676";
    statusElem.style.background = "rgba(0, 230, 118, 0.1)";
    statusElem.style.borderColor = "rgba(0, 230, 118, 0.3)";
  } else {
    statusElem.innerText = "OFFLINE";
    statusElem.style.color = "#ff5252";
    statusElem.style.background = "rgba(255, 82, 82, 0.1)";
    statusElem.style.borderColor = "rgba(255, 82, 82, 0.3)";
  }

  if (candle && candle.close) {
    currentCandle = candle;
    priceElem.innerText = candle.close.toFixed(5);

    if (candle.close >= candle.open) {
      candleStatusElem.innerText = "BULLISH ▲";
      candleStatusElem.className = "candle-type candle-up";
    } else {
      candleStatusElem.innerText = "BEARISH ▼";
      candleStatusElem.className = "candle-type candle-down";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Fetch initial state from background service worker
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (response) {
      if (response.activePair) {
        document.getElementById("pair-select").value = response.activePair;
      }
      updateUI(response.candle, response.connected);
    }
  });

  // Listen for real-time broadcasts from background worker
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "CANDLE_UPDATE") {
      updateUI(msg.data, msg.connected);
    }
  });

  // Pair selector event
  document.getElementById("pair-select").addEventListener("change", (e) => {
    chrome.runtime.sendMessage({ type: "CHANGE_PAIR", pair: e.target.value });
  });

  // Timeframe selector event
  document.querySelectorAll(".btn-tf").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".btn-tf").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      const tf = parseInt(e.target.getAttribute("data-tf"));
      chrome.runtime.sendMessage({ type: "CHANGE_TF", tf: tf });
    });
  });

  // Signal Generator
  document.getElementById("btn-generate").addEventListener("click", () => {
    const output = document.getElementById("signal-output");
    output.className = "signal-output";
    output.innerText = "ANALYZING...";
    output.style.display = "block";

    setTimeout(() => {
      const isCall = currentCandle.close >= currentCandle.open;
      output.innerText = isCall ? "CALL ▲" : "PUT ▼";
      output.className = `signal-output ${isCall ? 'CALL' : 'PUT'}`;
    }, 600);
  });
});
