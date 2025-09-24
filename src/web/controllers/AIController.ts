import { AIHistoryEntry, AITrainStatus } from '../types';
// import { Logger } from '../../../Logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * AI Controller - Manages conversation history and training status
 * TypeScript implementation replacing JavaScript version
 */
export class AIController {
    private static instance: AIController;
    private historyPath: string;
    private history: AIHistoryEntry[];

    private constructor() {
        this.historyPath = path.join(__dirname, '../configs/ai-history.json');
        this.history = this.loadHistory();
    }

    public static getInstance(): AIController {
        if (!AIController.instance) {
            AIController.instance = new AIController();
        }
        return AIController.instance;
    }

    private loadHistory(): AIHistoryEntry[] {
        try {
            if (fs.existsSync(this.historyPath)) {
                const historyData = fs.readFileSync(this.historyPath, 'utf8');
                const parsed = JSON.parse(historyData);
                return Array.isArray(parsed) ? parsed : [];
            }
            return [];
        } catch (error) {
            console.error(`Error loading AI history: ${error}`);
            return [];
        }
    }

    private saveHistory(): boolean {
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

    public addEntry(question: string, answer?: string): AIHistoryEntry {
        const entry: AIHistoryEntry = {
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

    public getHistory(): AIHistoryEntry[] {
        return [...this.history];
    }

    public clearHistory(): boolean {
        this.history = [];
        return this.saveHistory();
    }

    public approveEntry(timestamp: number): boolean {
        const entry = this.history.find(e => e.timestamp === timestamp);
        if (entry) {
            entry.trainStatus = 'approved';
            this.saveHistory();
            return true;
        }
        return false;
    }

    public rejectEntry(timestamp: number): boolean {
        const entry = this.history.find(e => e.timestamp === timestamp);
        if (entry) {
            entry.trainStatus = 'rejected';
            this.saveHistory();
            return true;
        }
        return false;
    }
}

// Export functions for compatibility with existing JavaScript code
export function addAIEntry(question: string, answer?: string): AIHistoryEntry {
    return AIController.getInstance().addEntry(question, answer);
}

export function getAIHistory(): AIHistoryEntry[] {
    return AIController.getInstance().getHistory();
}

export function clearAIHistory(): boolean {
    return AIController.getInstance().clearHistory();
}

export function approveAIEntry(timestamp: number): boolean {
    return AIController.getInstance().approveEntry(timestamp);
}

export function rejectAIEntry(timestamp: number): boolean {
    return AIController.getInstance().rejectEntry(timestamp);
}