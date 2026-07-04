// Applies the colour theme before first paint. Loaded synchronously (render-
// blocking on purpose) from every page's <head> so dark-mode users never see
// a light flash. Kept separate from main.js because main.js is a module and
// therefore deferred past first paint.
// Precedence: explicit user choice (localStorage) > OS preference > light.
(function () {
    try {
        var stored = localStorage.getItem('theme');
        var dark = stored === 'dark' ||
            (!stored && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (dark) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    } catch (e) {
        // storage unavailable -> fall through to the light default
    }
})();
