console.log("Keystroke & Live WPM Tracker is active");
chrome.storage.local.set({ wpm: 0 });

// ========== Keystroke Tracking ==========
document.addEventListener("keydown", (event) => {
    const keyPressed = `${new Date().toISOString()} - Key pressed: ${event.key}\n`;
    chrome.storage.local.get(["keystrokes"], (result) => {
        const keystrokes = result.keystrokes || "";
        const updatedKeystrokes = keystrokes + keyPressed;
        chrome.storage.local.set({ keystrokes: updatedKeystrokes });
    });
});

// ========== WPM Tracking ==========
let startTime = null;
let wordCount = 0;

const calculateWPM = () => {
    if (!startTime || wordCount === 0) return 0;
    const currentTime = new Date();
    const elapsedMinutes = (currentTime - startTime) / 60000;
    return Math.round(wordCount / elapsedMinutes);
};

document.addEventListener("keydown", (event) => {
    if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        if (!startTime) startTime = new Date();
        if (event.key === " " || event.key === "\n") wordCount++;
        const wpm = calculateWPM();
        chrome.storage.local.set({ wpm });
    }
});

let typingTimeout;
document.addEventListener("keydown", () => {
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        startTime = null;
        wordCount = 0;
        chrome.storage.local.set({ wpm: 0 });
    }, 5000);
});

// ========== WPM Overlay Box ==========
function createOverlay() {
    if (document.getElementById("wpm-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "wpm-overlay";
    overlay.innerHTML = `
        <div>
            <strong>Live WPM Tracker</strong>
            <p id="wpm-display">Current WPM: 0</p>
        </div>
    `;
    document.body.appendChild(overlay);

    // Show based on stored setting
    chrome.storage.local.get(["showWPMOverlay"], (result) => {
        overlay.style.display = result.showWPMOverlay !== false ? "block" : "none";
    });

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.showWPMOverlay) {
            overlay.style.display = changes.showWPMOverlay.newValue ? "block" : "none";
        }
    });
}


// React to overlay visibility toggle
chrome.storage.onChanged.addListener((changes) => {
    if (changes.showWPMOverlay) {
        const overlay = document.getElementById("wpm-overlay");
        if (overlay) {
            overlay.style.display = changes.showWPMOverlay.newValue ? "block" : "none";
        }
    }
});

// Live WPM value updater
function updateWPM() {
    const display = document.getElementById("wpm-display");
    if (display) {
        chrome.storage.local.get(["wpm"], (result) => {
            display.textContent = `Current WPM: ${result.wpm || 0}`;
        });
    }
}
if (!document.getElementById("wpm-overlay")) {
    // Create the overlay
    const overlay = document.createElement("div");
    overlay.id = "wpm-overlay";
    overlay.style.position = "fixed";
    overlay.style.bottom = "10px";
    overlay.style.right = "10px";
    overlay.style.width = "200px";
    overlay.style.height = "70px";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    overlay.style.color = "white";
    overlay.style.fontFamily = "Arial, sans-serif";
    overlay.style.fontSize = "14px";
    overlay.style.padding = "10px";
    overlay.style.borderRadius = "8px";
    overlay.style.zIndex = "9999";
    overlay.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
    overlay.innerHTML = `
        <div>
            <strong>Live WPM Tracker</strong>
            <p id="wpm-display">Current WPM: 0</p>
        </div>
    `;
    // Append the overlay to the body
    document.body.appendChild(overlay);
}

// === INIT ===
createOverlay();
setInterval(updateWPM, 100);