export async function fetchJsonTyped<T>(url: string): Promise<T | null> {
    try {
        const r = await fetch(url);
        if (!r.ok) return null;
        const data = (await r.json()) as T;
        return data;
    } catch {
        return null;
    }
}