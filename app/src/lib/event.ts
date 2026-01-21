// 浏览器兼容的 EventEmitter 实现 (替换 Node.js events 模块)
class BrowserEventEmitter {
    private events: Map<string, Array<(...args: any[]) => void>> = new Map();

    on(event: string, listener: (...args: any[]) => void): this {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(listener);
        return this;
    }

    addListener(event: string, listener: (...args: any[]) => void): this {
        return this.on(event, listener);
    }

    once(event: string, listener: (...args: any[]) => void): this {
        const onceWrapper = (...args: any[]) => {
            this.off(event, onceWrapper);
            listener.apply(this, args);
        };
        return this.on(event, onceWrapper);
    }

    off(event: string, listener: (...args: any[]) => void): this {
        const listeners = this.events.get(event);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
        return this;
    }

    removeListener(event: string, listener: (...args: any[]) => void): this {
        return this.off(event, listener);
    }

    removeAllListeners(event?: string): this {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
        return this;
    }

    emit(event: string, ...args: any[]): boolean {
        const listeners = this.events.get(event);
        if (!listeners || listeners.length === 0) {
            return false;
        }
        listeners.slice().forEach(listener => {
            try {
                listener.apply(this, args);
            } catch (error) {
                console.error(`Error in event listener for "${event}":`, error);
            }
        });
        return true;
    }

    listenerCount(event: string): number {
        return this.events.get(event)?.length || 0;
    }

    listeners(event: string): Array<(...args: any[]) => void> {
        return this.events.get(event)?.slice() || [];
    }

    eventNames(): string[] {
        return Array.from(this.events.keys());
    }
}

export const eventBus = new BrowserEventEmitter();