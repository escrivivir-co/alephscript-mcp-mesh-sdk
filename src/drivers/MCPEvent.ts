import { MCPEventType } from "./MCPTypes";

export type MCPEventData = any;

export interface MCPEvent {
    type: MCPEventType;
    action: string;
    serverId: string;
    timestamp: number;    
    data?: MCPEventData;
    error?: string;
}
