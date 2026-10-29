/**
 * Socratic Tutor v2 - Client-side Controller & Behavioral Signal Collector
 * Collects subtle behavioral telemetry solely to adapt pedagogical pace.
 * Complies strictly with privacy policies (single-click disable).
 */

(() => {
  // Application State
  const state = {
    learnerId: "learner-default",
    sessionId: null,
    topic: "recursion",
    signalsEnabled: true,
    lastKeystrokeTime: Date.now(),
    tabBlurTime: null,
    totalTabBlurDuration: 0,
    lastSubmissionTime: 0,
    consecutiveSubmissionsUnder3s: 0,
    currentPasteLength: 0,
    wasPasted: false,
    keystrokeCountThisTurn: 0,
  };

  // DOM Elements
  const chatHistory = document.getElementById("chatHistory");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const hintBtn = document.getElementById("hintBtn");
  const resetBtn = document.getElementById("resetBtn");
  const topicSelect = document.getElementById("topicSelect");
  const learnerInput = document.getElementById("learnerInput");
  const privacyToggle = document.getElementById("privacyToggle");
  const telemetryIndicator = document.getElementById("telemetryIndicator");
  const telemetryDot = document.getElementById("telemetryDot");
  const tabChatBtn = document.getElementById("tabChatBtn");
  const tabDashBtn = document.getElementById("tabDashBtn");
  const paneChat = document.getElementById("paneChat");
  const paneDash = document.getElementById("paneDash");
  const dashboardFrame = document.getElementById("dashboardFrame");

  // 1. Behavioral Signal Collection (Active only when signalsEnabled is true)
  function initTelemetry() {
    // Keystroke tracker
    messageInput.addEventListener("keydown", () => {
      state.lastKeystrokeTime = Date.now();
      state.keystrokeCountThisTurn++;
      updateTelemetryStatus("Active (Typing)");
    });

    // Paste tracker
    messageInput.addEventListener("paste", (e) => {
      if (!state.signalsEnabled) return;
      const text = (e.clipboardData || window.clipboardData).getData("text") || "";
      state.wasPasted = true;
      state.currentPasteLength += text.length;
      updateTelemetryStatus(`Active (Paste: ${text.length} chars)`);
    });

    // Visibility / Tab switch tracker
    document.addEventListener("visibilitychange", () => {
      if (!state.signalsEnabled) return;
      if (document.hidden) {
        state.tabBlurTime = Date.now();
      } else if (state.tabBlurTime) {
        const durationSec = (Date.now() - state.tabBlurTime) / 1000;
        state.totalTabBlurDuration += durationSec;
        state.tabBlurTime = null;
        updateTelemetryStatus(`Active (Tab switch: ${durationSec.toFixed(1)}s)`);
      }
    });

    // Idle monitor timer (checks every 5 seconds)
    setInterval(() => {
      if (!state.signalsEnabled) {
        updateTelemetryStatus("Disabled (Privacy Mode)");
        telemetryDot.className = "status-dot disabled";
        return;
      }
      const idleSec = (Date.now() - state.lastKeystrokeTime) / 1000;
      if (idleSec > 20) {
        telemetryDot.className = "status-dot idle";
        updateTelemetryStatus(`High Cognitive Friction (Idle: ${Math.round(idleSec)}s)`);
      } else {
        telemetryDot.className = "status-dot";
        updateTelemetryStatus("Active (Protected)");
      }
    }, 4000);
  }

  function updateTelemetryStatus(text) {
    if (telemetryIndicator) {
      telemetryIndicator.textContent = text;
    }
  }

  // Gather current signals package and reset turn counters
  function packageSignals(isInstantHint = false) {
    if (!state.signalsEnabled) {
      return {};
    }

    const now = Date.now();
    const idleSeconds = Math.max(0, (now - state.lastKeystrokeTime) / 1000);
    const intervalFromLastSubmit = (now - state.lastSubmissionTime) / 1000;

    if (intervalFromLastSubmit < 3.0) {
      state.consecutiveSubmissionsUnder3s++;
    } else {
      state.consecutiveSubmissionsUnder3s = 0;
    }
    state.lastSubmissionTime = now;

    const signals = {
      paste_event: state.wasPasted,
      pasted_length: state.currentPasteLength,
      idle_seconds: Math.round(idleSeconds * 10) / 10,
      tab_switch_seconds: Math.round(state.totalTabBlurDuration * 10) / 10,
      rapid_wrong_attempts: state.consecutiveSubmissionsUnder3s,
      instant_hint_request: isInstantHint,
    };

    // Reset turn flags
    state.wasPasted = false;
    state.currentPasteLength = 0;
    state.totalTabBlurDuration = 0;
    state.keystrokeCountThisTurn = 0;
    state.lastKeystrokeTime = Date.now();

    return signals;
  }

  // 2. Chat Communication
  async function sendMessage(text, isInstantHint = false) {
    if (!text && !isInstantHint) return;

    const signals = packageSignals(isInstantHint);

    // Append learner message to chat UI (unless pure instant hint button)
    if (text) {
      appendMessage("learner", text);
      messageInput.value = "";
      messageInput.style.height = "auto";
    }

    sendBtn.disabled = true;
    hintBtn.disabled = true;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: state.sessionId,
          learner_id: state.learnerId,
          message: text || "I need a hint on this step.",
          topic: state.topic,
          signals: signals,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      state.sessionId = data.session_id;

      appendTutorMessage(data);
    } catch (err) {
      appendMessage("tutor", `⚠️ Error connecting to Socratic Tutor core: ${err.message}`);
    } finally {
      sendBtn.disabled = false;
      hintBtn.disabled = false;
      messageInput.focus();
    }
  }

  // 3. UI Rendering
  function appendMessage(role, text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${role}`;

    const header = document.createElement("div");
    header.className = "message-header";
    header.textContent = role === "learner" ? "You" : "Socratic Tutor";
    msgDiv.appendChild(header);

    const body = document.createElement("div");
    body.className = "message-body";
    body.textContent = text;
    msgDiv.appendChild(body);

    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  function appendTutorMessage(data) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "message tutor";

    const header = document.createElement("div");
    header.className = "message-header";

    const titleSpan = document.createElement("span");
    titleSpan.textContent = "Socratic Tutor";
    header.appendChild(titleSpan);

    const badge = document.createElement("span");
    badge.className = `rung-badge rung-${data.rung}`;
    badge.textContent = `Rung ${data.rung}: ${data.rung_name}`;
    header.appendChild(badge);

    if (data.state && data.state !== "LEARNING") {
      const stateBadge = document.createElement("span");
      stateBadge.style.color = "#94a3b8";
      stateBadge.style.fontSize = "0.75rem";
      stateBadge.textContent = `[${data.state}]`;
      header.appendChild(stateBadge);
    }

    msgDiv.appendChild(header);

    const body = document.createElement("div");
    body.className = "message-body";
    body.textContent = data.reply;
    msgDiv.appendChild(body);

    // If visual or trace artifact is returned, embed visual card
    if (data.visual_url || data.visual_html) {
      const visualCard = document.createElement("div");
      visualCard.className = "visual-card-container";

      const vHeader = document.createElement("div");
      vHeader.className = "visual-header";
      vHeader.innerHTML = `<span>🎨 Visual Scaffold (Step into structure)</span>`;
      visualCard.appendChild(vHeader);

      const vBody = document.createElement("div");
      vBody.className = "visual-body";

      if (data.visual_url) {
        const iframe = document.createElement("iframe");
        iframe.className = "visual-iframe";
        iframe.src = data.visual_url;
        vBody.appendChild(iframe);
      } else if (data.visual_html) {
        vBody.innerHTML = data.visual_html;
      }

      visualCard.appendChild(vBody);
      msgDiv.appendChild(visualCard);
    }

    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  // 4. Reset & Controls
  async function resetSession() {
    try {
      const res = await fetch("/api/session/reset", { method: "POST" });
      const data = await res.json();
      state.sessionId = data.session_id;
      chatHistory.innerHTML = "";
      appendMessage("tutor", `👋 Welcome! I am your Socratic Tutor for ${state.topic}. I'll never just give you the answer, but together we will build the intuition step-by-step.\n\nWhat do you already understand about ${state.topic}?`);
      refreshDashboard();
    } catch (e) {
      console.error("Reset failed", e);
    }
  }

  function refreshDashboard() {
    if (dashboardFrame) {
      dashboardFrame.src = `/api/dashboard/${state.learnerId}?t=${Date.now()}`;
    }
  }

  // 5. Event Binding
  function bindEvents() {
    sendBtn.addEventListener("click", () => {
      const text = messageInput.value.trim();
      if (text) sendMessage(text, false);
    });

    hintBtn.addEventListener("click", () => {
      const isInstant = messageInput.value.trim().length === 0;
      sendMessage(messageInput.value.trim(), isInstant);
    });

    messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (text) sendMessage(text, false);
      }
    });

    resetBtn.addEventListener("click", resetSession);

    topicSelect.addEventListener("change", (e) => {
      state.topic = e.target.value;
      resetSession();
    });

    learnerInput.addEventListener("change", (e) => {
      state.learnerId = e.target.value.trim() || "learner-default";
      refreshDashboard();
    });

    privacyToggle.addEventListener("click", () => {
      state.signalsEnabled = !state.signalsEnabled;
      if (state.signalsEnabled) {
        privacyToggle.className = "privacy-toggle active";
        privacyToggle.innerHTML = "🛡️ Telemetry: Active";
        telemetryDot.className = "status-dot";
        updateTelemetryStatus("Active (Protected)");
      } else {
        privacyToggle.className = "privacy-toggle disabled";
        privacyToggle.innerHTML = "🔒 Telemetry: Disabled";
        telemetryDot.className = "status-dot disabled";
        updateTelemetryStatus("Disabled (Privacy Mode)");
      }
    });

    tabChatBtn.addEventListener("click", () => {
      tabChatBtn.className = "tab-btn active";
      tabDashBtn.className = "tab-btn";
      paneChat.className = "tab-pane active";
      paneDash.className = "tab-pane";
    });

    tabDashBtn.addEventListener("click", () => {
      tabDashBtn.className = "tab-btn active";
      tabChatBtn.className = "tab-btn";
      paneDash.className = "tab-pane active";
      paneChat.className = "tab-pane";
      refreshDashboard();
    });
  }

  // Initialize
  initTelemetry();
  bindEvents();
  resetSession();
})();

