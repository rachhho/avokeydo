import { writerCategoryDescriptions } from './writerCategoryDescriptions.js';

const sentiment = new Sentiment();

export async function updateWriterCategory() {
    chrome.storage.local.get(["keystrokes", "wpm"], async (result) => {
        const text = result.keystrokes || "";
        const wpm = result.wpm || 0;

        const lines = text.split("\n");
        const messages = lines.filter(line => /\w/.test(line));
        const avgMsgLength = messages.length
            ? messages.map(msg => msg.length).reduce((a, b) => a + b) / messages.length
            : 0;
        const entriesPerHour = messages.length / ((new Date().getHours() % 24) + 1);
        const safeTextLength = Math.max(text.length, 1);

        const exclamRate = (text.match(/!/g) || []).length / (safeTextLength / 100);
        const dragged = /(.)\1{3,}/.test(text);
        const caps = (text.match(/[A-Z]/g) || []).length;
        const periods = (text.match(/\./g) || []).length;
        const emojis = (text.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length;

        const wordList = text.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
        const uniqueWords = new Set(wordList);
        const diversity = wordList.length > 0 ? uniqueWords.size / wordList.length : 1;
        const avgWordLength = wordList.length > 0 ? wordList.join("").length / wordList.length : 0;

        const sentimentResult = sentiment.analyze(text);
        const sentimentScore = sentimentResult.comparative;
        const posWords = sentimentResult.positive;
        const negWords = sentimentResult.negative;

        const matches = [];

        // ==== Typing Style Detection Rules ====
        const rules = [
            ["verbose typer", text.length > 700 && avgMsgLength > 100 && diversity > 0.4],
            ["ranting typer", avgMsgLength > 200 && sentimentScore < -0.5],
            ["neutral typer", text.length < 200 && sentimentScore > 0 && wpm < 60],
            ["slammer", exclamRate > 2 && dragged && sentimentScore > 0.3],
            ["energetic typer", exclamRate > 1.5],
            ["hasty typer", wpm > 110 && avgMsgLength < 80 && diversity > 0.3],
            ["pottymouth", (text.toLowerCase().match(/shit/g) || []).length >= 4 && sentimentScore < -0.3],
            ["formal typer", caps > 20 && periods > 5 && (caps + periods) / safeTextLength > 0.12],
            ["punctuator", periods / safeTextLength > 0.05],
            ["excited typer", dragged && exclamRate < 0.5],
            ["all-caps typer", caps > 50 && caps / safeTextLength > 0.2],
            ["happy typer", wpm > 90 && sentimentScore > 0.5],
            ["sleepy typer", wpm < 40 && exclamRate < 0.05 && diversity > 0.3],
            ["nervous typer", avgMsgLength < 20 && entriesPerHour > 30],
            ["scripted typer", (text.match(/(Ctrl\+V|Meta|Paste|Enter|Tab)/gi) || []).length > 10],
            ["copy-paste typer", wordList.length > 1000],
            ["chronically typing typer", wpm > 100 && avgMsgLength > 500 && entriesPerHour > 12],
            ["academic typer", avgWordLength > 6 && periods > 10 && exclamRate < 0.1],
            ["emojinal typer", emojis >= 5 && sentimentScore > 0.3],
            ["doomer typer", text.match(/\b(nothing|pointless|why|end|die|empty)\b/g) && sentimentScore < -0.5],
            ["sarcastic typer", posWords.length > 5 && sentimentScore < -0.3],
            ["troll typer", posWords.length > 0 && negWords.length > 3 && sentimentScore < -0.5],
            ["baby typer", avgWordLength < 3 && avgMsgLength < 20 && diversity < 0.3],
            ["stream-of-conscious typer", text.length > 800 && periods === 0 && caps < 10]
        ];

        for (const [type, condition] of rules) {
            if (condition) matches.push(type);
        }

        // Default fallback
        if (matches.length === 0) matches.push("undefined typer");

        // Limit to top 2 categories
        const limited = matches.slice(0, 2);

        // Format: "type: description"
        const formatted = limited.map(cat => {
            const desc = writerCategoryDescriptions[cat] || "";
            return `${cat}: ${desc}`;
        });

        chrome.storage.local.set({
            writerCategory: formatted.join("\n\n")
        });
    });
}