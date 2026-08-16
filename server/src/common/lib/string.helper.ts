export function isNullOrEmpty(str: string | undefined): boolean {
    if (!str) {
        return true;
    }
    if (typeof str != "string") {
        return true;
    }
    return str.length <= 0;
}
