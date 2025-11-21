// Grabbing elements
const msgBox = document.getElementById("messages");
const typingEl = document.getElementById("typing");
const usernameInput = document.querySelector('input[name="username"]');
const messageInput = document.querySelector(".chat-input");

window.username = usernameInput ? usernameInput.value : "";

// Sounds (optional, if files exist)
let sendSound, receiveSound;
try {
    sendSound = new Audio("/sounds/send.mp3");
    receiveSound = new Audio("/sounds/receive.mp3");
} catch (e) {
    console.warn("Sound files not found (optional).");
}

// Expose for inline onsubmit in chat.ejs
window.playSendSound = function () {
    if (sendSound) {
        sendSound.play().catch(() => { });
    }
};

let lastMessageCount = 0;

// Load messages with polling
let lastRendered = 0;

async function loadMessages() {
    const res = await fetch("/messages");
    const data = await res.json();

    // Only render NEW messages
    const newMessages = data.slice(lastRendered);

    newMessages.forEach(m => {
        const div = document.createElement("div");
        div.className = `message ${m.username === window.username ? 'self' : 'other'}`;

        div.innerHTML = `
      <div class="msg-meta">
        <span class="msg-user">${m.username}</span>
        <span class="msg-time">${new Date(m.created_at).toLocaleTimeString("en-IN", {
            hour: "2-digit", minute: "2-digit"
        })}</span>
      </div>
      <div class="msg-text">${m.message}</div>
    `;

        // Animate only new messages
        if (lastRendered !== 0) {
            div.style.animation = "popIn 0.25s ease-out";
        }

        msgBox.appendChild(div);
    });

    // Update count AFTER rendering
    lastRendered = data.length;

    // Auto-scroll only for new messages
    if (newMessages.length > 0) {
        msgBox.scrollTop = msgBox.scrollHeight;
    }
}


// Poll every 1.2 sec
if (msgBox) {
    loadMessages();
    setInterval(loadMessages, 1200);
}

// Typing indicator
if (messageInput) {
    messageInput.addEventListener("input", () => {
        if (!window.username) return;
        fetch(`/typing?user=${encodeURIComponent(window.username)}`).catch(() => { });
    });
}

// Poll who is typing
if (typingEl) {
    setInterval(async () => {
        try {
            const res = await fetch("/whoistyping");
            const data = await res.json();

            if (data.user && data.user !== window.username) {
                typingEl.style.display = "block";
                typingEl.textContent = `${data.user} is typing...`;
            } else {
                typingEl.style.display = "none";
            }
        } catch (err) {
            console.error("Error fetching typing user:", err);
        }
    }, 600);
}
