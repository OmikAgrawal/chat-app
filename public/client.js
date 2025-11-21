const msgBox = document.getElementById("messages");
const typingEl = document.getElementById("typing");
const messageInput = document.querySelector(".chat-input");
const usernameInput = document.querySelector('input[name="username"]');

window.username = usernameInput ? usernameInput.value : "";

let lastRendered = 0;
let loadedInitially = false;

// Optional sounds
let sendSound, receiveSound;
try {
    sendSound = new Audio("/sounds/send.mp3");
    receiveSound = new Audio("/sounds/receive.mp3");
} catch { }

// expose to form onsubmit
window.playSendSound = function () {
    if (sendSound) sendSound.play().catch(() => { });
};

// Function to render a single message
function renderMessage(m) {
    const div = document.createElement("div");
    div.className = `message ${m.username === window.username ? "self" : "other"}`;

    div.innerHTML = `
    <div class="msg-meta">
      <span class="msg-user">${m.username}</span>
      <span class="msg-time">${new Date(m.created_at).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
    })}</span>
    </div>
    <div class="msg-text">${m.message}</div>
  `;

    // Animation only for new messages
    if (loadedInitially) {
        div.style.animation = "popIn 0.25s ease-out";
    }

    msgBox.appendChild(div);
}

// Load messages with polling
async function loadMessages() {
    const res = await fetch("/messages");
    const data = await res.json();

    // Initial load → render all once
    if (!loadedInitially) {
        data.forEach(renderMessage);
        lastRendered = data.length;
        loadedInitially = true;
        msgBox.scrollTop = msgBox.scrollHeight;
        return;
    }

    // Render only NEW messages
    const newMessages = data.slice(lastRendered);

    newMessages.forEach(msg => {
        renderMessage(msg);

        // Play receive sound only for messages from others
        if (receiveSound && msg.username !== window.username) {
            receiveSound.play().catch(() => { });
        }
    });

    if (newMessages.length > 0) {
        msgBox.scrollTop = msgBox.scrollHeight;
    }

    lastRendered = data.length;
}

// Start polling
if (msgBox) {
    loadMessages();
    setInterval(loadMessages, 1200);
}

// Typing indicator trigger
if (messageInput) {
    messageInput.addEventListener("input", () => {
        fetch(`/typing?user=${encodeURIComponent(window.username)}`).catch(() => { });
    });
}

// Poll typing indicator
if (typingEl) {
    setInterval(async () => {
        const res = await fetch("/whoistyping");
        const data = await res.json();

        if (data.user && data.user !== window.username) {
            typingEl.style.display = "block";
            typingEl.textContent = `${data.user} is typing...`;
        } else {
            typingEl.style.display = "none";
        }
    }, 600);
}
