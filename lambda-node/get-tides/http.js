// Node's own fetch in place of axios: resolves { data } like axios.get, and
// rejects on a 4xx/5xx or after 10s, which fetch alone would not
async function get(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${url}`);
    }
    return { data: await response.json() };
}

module.exports = { get };
