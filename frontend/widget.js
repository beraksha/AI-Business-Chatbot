/*
widget.js — Embeddable AI Data Assistant widget
-------------------------------------------------
Drop this on any page:

<script
 src="widget.js"
 data-api-url="http://localhost:5000/api/chat"
 data-role="manager_north"
 data-title="Sales Assistant"
></script>

 */

(function () {
  const SCRIPT = document.currentScript;
  const CONFIG = {
    apiUrl: SCRIPT.dataset.apiUrl || "http://localhost:5000/api/chat",
    role: SCRIPT.dataset.role || "admin",
    title: SCRIPT.dataset.title || "Data Assistant",
  };

  const ROOT_ID = "ai-widget-root";
  if (document.getElementById(ROOT_ID)) return;

  const style = document.createElement("style");
  style.textContent = `
    #${ROOT_ID} * { box-sizing: border-box; font-family: system-ui, sans-serif; }
    .aiw-launcher {
      position: fixed; right: 20px; bottom: 20px; z-index: 999999;
      width: 56px; height: 56px; border-radius: 999px; border: none;
      background: #111827; color: #fff; font-size: 22px; cursor: pointer;
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
    }
    .aiw-panel {
      position: fixed; right: 20px; bottom: 88px; z-index: 999999;
      width: 340px; max-width: calc(100vw - 40px); height: 460px;
      background: #fff; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
      display: none; flex-direction: column; overflow: hidden;
      border: 1px solid rgba(0,0,0,0.08);
    }
    .aiw-panel.open { display: flex; }
    .aiw-header {
      background: #111827; color: #fff; padding: 12px 14px; font-weight: 600;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 14px;
    }
    .aiw-close { cursor: pointer; opacity: 0.8; }
    .aiw-close:hover { opacity: 1; }
    .aiw-messages { flex: 1; overflow-y: auto; padding: 12px; font-size: 13.5px; }
    .aiw-msg { margin-bottom: 10px; padding: 8px 10px; border-radius: 10px; max-width: 85%; line-height: 1.45; }
    .aiw-msg.user { background: #eef2ff; margin-left: auto; }
    .aiw-msg.bot { background: #f3f4f6; }
    .aiw-input-row { display: flex; border-top: 1px solid rgba(0,0,0,0.08); }
    .aiw-input { flex: 1; border: none; padding: 10px; font-size: 13.5px; outline: none; }
    .aiw-send { border: none; background: #111827; color: #fff; padding: 0 14px; cursor: pointer; }
    .aiw-msg table { border-collapse: collapse; width: 100%; font-size: 12.5px; margin-top: 6px; }
    .aiw-msg th, .aiw-msg td { border: 1px solid #e5e7eb; padding: 4px 6px; text-align: left; }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.innerHTML = `
    <button class="aiw-launcher" aria-label="Open chat">💬</button>
    <div class="aiw-panel">
      <div class="aiw-header">
        <span>${CONFIG.title}</span>
        <span class="aiw-close">✕</span>
      </div>
      <div class="aiw-messages"></div>
      <div class="aiw-input-row">
        <input class="aiw-input" type="text" placeholder="Ask about your data..." />
        <button class="aiw-send">Send</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const launcher = root.querySelector(".aiw-launcher");
  const panel = root.querySelector(".aiw-panel");
  const closeBtn = root.querySelector(".aiw-close");
  const messages = root.querySelector(".aiw-messages");
  const input = root.querySelector(".aiw-input");
  const sendBtn = root.querySelector(".aiw-send");

  launcher.addEventListener("click", () => panel.classList.toggle("open"));
  closeBtn.addEventListener("click", () => panel.classList.remove("open"));

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderMarkdownish(text) {
    // Minimal markdown-table -> HTML renderer (intentionally simple).
    const lines = text.split("\n");
    const tableStart = lines.findIndex((l) => l.trim().startsWith("|"));
    if (tableStart === -1) return `<div>${escapeHtml(text)}</div>`;

    const before = lines.slice(0, tableStart).join("<br>");
    const tableLines = lines.slice(tableStart).filter((l) => l.includes("|"));
    const rows = tableLines
      .filter((_, i) => i !== 1) // skip the "---" separator row
      .map((l) =>
        l
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim())
      );

    const [headerRow, ...bodyRows] = rows;
    const thead = `<tr>${headerRow.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`;
    const tbody = bodyRows
      .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
      .join("");

    return `<div>${escapeHtml(before)}</div><table>${thead}${tbody}</table>`;
  }

  function addMessage(role, text) {
    const el = document.createElement("div");
    el.className = `aiw-msg ${role}`;
    el.innerHTML = role === "bot" ? renderMarkdownish(text) : escapeHtml(text);
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    addMessage("user", text);
    input.value = "";

    try {
      const res = await fetch(CONFIG.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, role: CONFIG.role }),
      });
      const data = await res.json();
      addMessage("bot", data.reply || data.error || "No response.");
    } catch (err) {
      addMessage("bot", "Error contacting the assistant. Is the backend running?");
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  addMessage(
    "bot",
    `Hi! I'm your ${CONFIG.title}. Ask me about top products, revenue by region, or recent orders.`
  );
})();
