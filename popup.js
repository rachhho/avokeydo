document.addEventListener("DOMContentLoaded", () => {
    const themeSelector = document.getElementById("theme-selector");
    const themeStylesheet = document.getElementById("theme-stylesheet");

    chrome.storage.local.get(["theme"], (result) => {
        const selectedTheme = result.theme || "popup";
        themeStylesheet.href = `themes/${selectedTheme}.css`;
        if (themeSelector) themeSelector.value = selectedTheme;
    });

    if (themeSelector) {
        themeSelector.addEventListener("change", (e) => {
            const theme = e.target.value;
            chrome.storage.local.set({ theme }, () => {
                themeStylesheet.href = `themes/${theme}.css`;
            });
        });
    }

    const keystrokeDisplay = document.getElementById("keystrokes");
    const wpmDisplay = document.getElementById("wpm-display");
    const toggleBtn = document.getElementById("toggle-wpm");
    const writerTypeEl = document.getElementById("writer-type");
    const writerDescEl = document.getElementById("writer-desc");

    function updateWriterCategoryDisplay() {
        chrome.storage.local.get(["writerCategory"], (result) => {
            const value = result.writerCategory || "";
            if (value.includes(":")) {
                const [type, desc] = value.split(":");
                writerTypeEl.textContent = `Writer Type: ${type.trim()}`;
                writerDescEl.textContent = desc?.trim() || "";
            } else {
                writerTypeEl.textContent = `Writer Type: ${value || "Analyzing..."}`;
                writerDescEl.textContent = "";
            }
        });
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === "local") {
            if (changes.keystrokes || changes.wpm) {
                window.updateWriterCategory?.();
            }
            if (changes.writerCategory) {
                updateWriterCategoryDisplay();
            }
        }
    });

    updateWriterCategoryDisplay();

    function updateKeystrokesDisplay() {
        chrome.storage.local.get(["keystrokes"], (result) => {
            const raw = result.keystrokes || "";
            const matches = raw.match(/Key pressed: (.+)/g) || [];
            const keys = matches.map(m => m.replace("Key pressed: ", ""));
            keystrokeDisplay.textContent = keys.join("");
        });
    }

    function updateWPMDisplay() {
        chrome.storage.local.get(["wpm"], (result) => {
            wpmDisplay.textContent = `Current WPM: ${result.wpm || 0}`;
        });
    }

    function updateToggleButtonText(showing) {
        toggleBtn.textContent = showing ? "Hide WPM Overlay" : "Show WPM Overlay";
    }

    toggleBtn.addEventListener("click", () => {
        chrome.storage.local.get(["showWPMOverlay"], (result) => {
            const newValue = !result.showWPMOverlay;
            chrome.storage.local.set({ showWPMOverlay: newValue });
            updateToggleButtonText(newValue);
        });
    });

    chrome.storage.local.get(["showWPMOverlay"], (result) => {
        const showing = result.showWPMOverlay !== false;
        updateToggleButtonText(showing);
    });

    updateKeystrokesDisplay();
    updateWPMDisplay();
    setInterval(updateWPMDisplay, 1000);

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === "local") {
            if (changes.keystrokes) {
                keystrokeDisplay.textContent = changes.keystrokes.newValue || "No keystrokes recorded yet.";
            }
            if (changes.wpm) {
                wpmDisplay.textContent = `Current WPM: ${changes.wpm.newValue || 0}`;
            }
        }
    });

    document.getElementById("clear").addEventListener("click", () => {
        chrome.storage.local.set({ keystrokes: "" }, () => {
            keystrokeDisplay.textContent = "Keystrokes cleared.";
        });
    });

    // ===== Tab Switching =====
    document.getElementById("tab-logger").addEventListener("click", () => {
        document.getElementById("logger-tab").style.display = "block";
        document.getElementById("metrics-tab").style.display = "none";
    });

    document.getElementById("tab-metrics").addEventListener("click", () => {
        document.getElementById("logger-tab").style.display = "none";
        document.getElementById("metrics-tab").style.display = "block";
        generateMetrics();
    });

    // ===== Typing Metrics Analyzer =====
    function processKeystrokeData(data) {
        const lines = data.trim().split('\n');
        const keys = [];
        const messages = [];
        const sentences = [];

        let currentMessage = "";
        let currentSentence = "";

        lines.forEach(entry => {
            const match = entry.match(/Key pressed: (.+)/);
            if (!match) return;
            const key = match[1];

            keys.push(key);

            if (key === "Enter") {
                if (currentMessage) {
                    messages.push(currentMessage.trim());
                    currentMessage = "";
                }
            } else {
                currentMessage += key;
            }

            if (key === ".") {
                if (currentSentence) {
                    sentences.push(currentSentence.trim());
                    currentSentence = "";
                }
            } else {
                currentSentence += key;
            }
        });

        if (currentMessage) messages.push(currentMessage.trim());
        if (currentSentence) sentences.push(currentSentence.trim());

        return { keys, messages, sentences };
    }

    function analyzeTypingHabits(keys, messages, sentences) {
        const totalKeys = keys.length;
        const keyCounts = keys.reduce((acc, key) => {
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        const favoriteKey = Object.entries(keyCounts).sort((a, b) => b[1] - a[1])[0] || ["None", 0];

        const avgMessageLength = messages.length ? messages.reduce((acc, msg) => acc + msg.length, 0) / messages.length : 0;
        const avgSentenceLength = sentences.length ? sentences.reduce((acc, msg) => acc + msg.length, 0) / sentences.length : 0;

        const totalWords = messages.reduce((acc, msg) => acc + msg.split(/\s+/).length, 0);
        const avgWordsPerMessage = messages.length ? totalWords / messages.length : 0;

        return {
            totalKeys,
            favoriteKey,
            avgMessageLength: avgMessageLength.toFixed(2),
            avgSentenceLength: avgSentenceLength.toFixed(2),
            totalWords,
            avgWordsPerMessage: avgWordsPerMessage.toFixed(2),
            capsLockUsage: keyCounts["CapsLock"] || 0,
            spaceUsage: keyCounts[" "] || 0
        };
    }

    function updateMetricsTab(report) {
        const metricsDisplay = document.getElementById("metrics-display");
        metricsDisplay.innerHTML = `
<strong>Typing Habits Report</strong><br>
Total keys pressed: ${report.totalKeys}<br>
Favorite key: '${report.favoriteKey[0]}' (pressed ${report.favoriteKey[1]} times)<br>
Average message length: ${report.avgMessageLength} characters<br>
Average sentence length: ${report.avgSentenceLength} characters<br>
Total words typed: ${report.totalWords}<br>
Average words per message: ${report.avgWordsPerMessage}<br>
CapsLock usage: ${report.capsLockUsage}<br>
Space key usage: ${report.spaceUsage}
        `;
    }

    function generateMetrics() {
        chrome.storage.local.get(["keystrokes"], (result) => {
            const rawData = result.keystrokes || "";
            const { keys, messages, sentences } = processKeystrokeData(rawData);
            const report = analyzeTypingHabits(keys, messages, sentences);
            updateMetricsTab(report);
        });
    }
});