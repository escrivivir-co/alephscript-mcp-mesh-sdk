/**
 * AlephScriptClient - Socket.IO client for MCP mesh communication
 */
import { io, Socket } from 'socket.io-client';

function getHash(key: string): string {
    const l = (s: string) => s.substring(s.length - 2);
    const a = new Date().getTime().toString();
    const b = Math.random().toString();
    return key + ">" + l(a) + l(b);
}

export interface IUserDetails {
    usuario: string;
    sesion?: string;
}

export class AlephScriptClient {
    public io: Socket;
    public name: string;
    initTriggers: (() => void)[] = [];
    initTriggersDefinition: (() => void)[] = [];
    private interval: any;
    private configurationSet = false;

    constructor(
        name = "AlephClient",
        url: string = "http://localhost:3010",
        namespace: string = "/runtime",
        autoConnect = false,
    ) {
        this.name = name;
        this.io = io(url + namespace, { autoConnect });

        this.io.on("connect", () => {
            console.log("[" + this.name + "] Connected to " + url + namespace);
            this.configurationSet = true;
            this.initTriggers = [...this.initTriggersDefinition];
            this.interval = setInterval(() => {
                while (this.initTriggers.length > 0) {
                    const f = this.initTriggers.pop();
                    if (f) f();
                }
            }, 1000);
        });

        this.io.on("disconnect", () => {
            console.log("[" + this.name + "] Disconnected");
            clearInterval(this.interval);
        });

        this.io.on("connect_error", (error) => {
            console.error("[" + this.name + "] Connection error:", error.message);
        });
    }

    connect(): void {
        if (!this.io.connected) {
            this.io.connect();
        }
    }

    disconnect(): void {
        this.io.disconnect();
    }

    room(event: string, data: any, roomName: string): void {
        this.io.emit("room", { event, data, room: roomName });
    }

    getHash(key: string): string {
        return getHash(key);
    }
}
