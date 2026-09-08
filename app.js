function renderSignal(signal, connected) {
  const statusElem = document.getElementById("ws-status");
  const pairElem = document.getElementById("signal-pair");
  const boxElem = document.getElementById("signal-box");
  const timeElem = document.getElementById("signal-time");

  if (connected) {
    statusElem.innerText = "ACTIVE";
    statusElem.style.color = "#00e676";
    statusElem.style.background = "rgba(0, 230, 118, 0.1)";
    statusElem.style.borderColor = "rgba(0, 230, 118, 0.3)";
  } else {
    statusElem.innerText = "RECONNECTING";
    statusElem.style.color = "#ff5252";
    statusElem.style.background = "rgba(255, 82, 82, 0.1)";
    statusElem.style.borderColor = "rgba(255, 82, 82, 0.3)";
  }

  if (signal && signal.direction !== "WAITING") {
    pairElem.innerText = signal.pair;
    boxElem.innerText = `${signal.direction} ▲▼`.replace("BUY ▲▼", "BUY ▲").replace("SELL ▲▼", "SELL ▼");
    boxElem.className = `signal-output ${signal.direction}`;
    timeElem.innerText = `Signal Generated at ${signal.timestamp}`;
  } else {
    pairElem.innerText = "MONITORING OTC PAIRS";
    boxElem.innerText = "SEARCHING FOR SETUPS...";
    boxElem.className = "signal-output WAITING";
    timeElem.innerText = "Checking Hammer, Engulfing & Evening Star setups";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Query state from background process
  chrome.runtime.sendMessage({ type: "GET_SIGNAL" }, (response) => {
    if (response) {
      renderSignal(response.signal, response.connected);
    }
  });

  // Receive background signals
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SIGNAL_UPDATE") {
      renderSignal(msg.signal, msg.connected);
    }
  });
});
