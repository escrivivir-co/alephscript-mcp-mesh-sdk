const { ConfigManager } = require('./ConfigManager');
const fs = require('fs');
const path = require('path');

class AIController {
    constructor() {
        if (AIController.instance) {
            return AIController.instance;
        }
        this.configManager = ConfigManager.getInstance();
        this.historyPath = path.join(__dirname, '../configs/ai-history.json');
        this.history = this.loadHistory();
        AIController.instance = this;
    }

    static getInstance() {
        if (!AIController.instance) {
            AIController.instance = new AIController();
        }
        return AIController.instance;
    }

    loadHistory() {
        try {
            if (fs.existsSync(this.historyPath)) {
                const historyData = fs.readFileSync(this.historyPath, 'utf8');
                return JSON.parse(historyData);
            }
            return [];
        } catch (error) {
            console.error(`Error loading AI history: ${error}`);
            return [];
        }
    }

    saveHistory() {
        try {
            const configDir = path.dirname(this.historyPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            fs.writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2));
            return true;
        } catch (error) {
            console.error(`Error saving AI history: ${error}`);
            return false;
        }
    }

    addEntry(question, answer = null) {
        const entry = {
            timestamp: Date.now(),
            question: question,
            answer: answer || 'This is a mock response from the MCP Mesh SDK AI system. In a real implementation, this would connect to an actual AI service.',
            trainStatus: null,
            snippets: []
        };

        this.history.unshift(entry); // Add to beginning
        
        // Keep only last 50 entries
        if (this.history.length > 50) {
            this.history = this.history.slice(0, 50);
        }

        this.saveHistory();
        return entry;
    }

    getHistory() {
        return [...this.history];
    }

    clearHistory() {
        this.history = [];
        this.saveHistory();
        return true;
    }

    approveEntry(timestamp) {
        const entry = this.history.find(e => e.timestamp === parseInt(timestamp));
        if (entry) {
            entry.trainStatus = 'approved';
            this.saveHistory();
            return true;
        }
        return false;
    }

    rejectEntry(timestamp) {
        const entry = this.history.find(e => e.timestamp === parseInt(timestamp));
        if (entry) {
            entry.trainStatus = 'rejected';
            this.saveHistory();
            return true;
        }
        return false;
    }
}

// Export functions for compatibility
function addAIEntry(question, answer) {
    return AIController.getInstance().addEntry(question, answer);
}

function getAIHistory() {
    return AIController.getInstance().getHistory();
}

function clearAIHistory() {
    return AIController.getInstance().clearHistory();
}

function approveAIEntry(timestamp) {
    return AIController.getInstance().approveEntry(timestamp);
}

function rejectAIEntry(timestamp) {
    return AIController.getInstance().rejectEntry(timestamp);
}

module.exports = {
    AIController,
    addAIEntry,
    getAIHistory,
    clearAIHistory,
    approveAIEntry,
    rejectAIEntry
};