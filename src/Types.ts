export interface IUserDetails {
    id?: string;
    name?: string;
    usuario: string;
    sesion?: string;
    sesiones?: string[]
}

export function getHash(key: string) {
    const l = (s: string) => s.substring(s.length - 2)
    const a = new Date().getTime().toString()
    const b = Math.random().toString()
    return key + ">" + l(a) + l(b)
}

