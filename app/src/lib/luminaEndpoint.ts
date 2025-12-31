
export function getluminaEndpoint(path: string = ''): string {
    try {
        const luminaEndpoint = window.localStorage.getItem('luminaEndpoint')
        const isTauri = !!(window as any).__TAURI__;
        if (isTauri && luminaEndpoint) {
            try {
                const url = new URL(path, luminaEndpoint.replace(/"/g, ''));
                return url.toString();
            } catch (error) {
                console.error(error);
                return new URL(path, window.location.origin).toString();
            }
        }

        return new URL(path, window.location.origin).toString();
    } catch (error) {
        console.error(error);
        return new URL(path, window.location.origin).toString();
    }
}

export function isTauriAndEndpointUndefined(): boolean {
    const isTauri = !!(window as any).__TAURI__;
    const luminaEndpoint = window.localStorage.getItem('luminaEndpoint')
    return isTauri && !luminaEndpoint;
}

export function saveluminaEndpoint(endpoint: string): void {
    if (endpoint) {
        window.localStorage.setItem('luminaEndpoint', endpoint);
    }
}

export function getSavedEndpoint(): string {
    return window.localStorage.getItem('luminaEndpoint') || '';
}
