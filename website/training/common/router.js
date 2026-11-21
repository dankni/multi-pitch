/* The training pages as one page: a link between them swaps the next one in with
   pushState - title, stylesheets, body, then its scripts run and DOMContentLoaded
   fires, in one go so nothing half drawn is painted. The page going is torn down
   first: its listeners outside the body, timers, frames, observers and globals,
   after "trainingleave" on window lets it drop the rest (wake lock, Bluetooth).
   trainingKeep() loads files that outlast every page instead: the account.

   The first script on every page it swaps. Scripts run again on each visit, so
   none may have a let, const or class at the top level - only var. */
(function(){
    // gaps runs its own game loop and the style guide is a demo: both load in full
    const pages = /^\/training\/((boulder|dansloft|endurance|gilford|goals|loft|maxpull|nohangs|progress|rings|tabata|timer|trad)\/)?(index\.html)?$/;
    const self = "/training/common/router.js";

    const addListener = EventTarget.prototype.addEventListener;
    const removeListener = EventTarget.prototype.removeEventListener;
    const realTimeout = window.setTimeout, realClearTimeout = window.clearTimeout;
    const realInterval = window.setInterval, realClearInterval = window.clearInterval;
    const realFrame = window.requestAnimationFrame, realCancelFrame = window.cancelAnimationFrame;

    const builtIn = new Set(Object.getOwnPropertyNames(window));
    // analytics' own, which outlive a page
    const analytics = /^(dataLayer|gtag|google_|gaGlobal|gaplugins|_ga)/;

    let listeners = [];
    let timeouts = new Set(), intervals = new Set(), frames = new Set();
    let observers = [];

    // trainingKeep()'s files, and the globals they declare
    let keptFiles = {};
    let keptUrls = [];
    let keptNames = new Set();
    let keeping = Promise.resolve();

    // called from a kept file, even after an await, so it outlasts the page
    function fromKept(){
        if(keptUrls.length === 0){ return false; }
        let stack = new Error().stack || "";
        return keptUrls.some(url => stack.includes(url));
    }

    EventTarget.prototype.addEventListener = function(type, listener, options){
        if(listener && (!(this instanceof Node) || this === document || this === document.documentElement || this === document.body) && !fromKept()){
            listeners.push([this, type, listener, options]);
        }
        return addListener.call(this, type, listener, options);
    };

    window.setTimeout = function(callback, delay, ...args){
        let id = realTimeout.call(window, function(){
            timeouts.delete(id);
            if(typeof callback === "function"){ callback.apply(this, args); }
        }, delay);
        if(!fromKept()){ timeouts.add(id); }
        return id;
    };
    window.clearTimeout = function(id){ timeouts.delete(id); realClearTimeout.call(window, id); };
    window.setInterval = function(...args){
        let id = realInterval.apply(window, args);
        if(!fromKept()){ intervals.add(id); }
        return id;
    };
    window.clearInterval = function(id){ intervals.delete(id); realClearInterval.call(window, id); };
    if(realFrame){
        window.requestAnimationFrame = function(callback){
            let id = realFrame.call(window, time => { frames.delete(id); callback(time); });
            if(!fromKept()){ frames.add(id); }
            return id;
        };
        window.cancelAnimationFrame = function(id){ frames.delete(id); realCancelFrame.call(window, id); };
    }

    ["ResizeObserver", "IntersectionObserver", "MutationObserver"].forEach(name => {
        let Real = window[name];
        if(typeof Real !== "function"){ return; }
        window[name] = class extends Real {
            constructor(...args){
                super(...args);
                if(!fromKept()){ observers.push(this); }
            }
        };
    });

    function tearDown(){
        window.dispatchEvent(new Event("trainingleave"));
        listeners.forEach(([target, type, listener, options]) => removeListener.call(target, type, listener, options));
        listeners = [];
        timeouts.forEach(id => realClearTimeout.call(window, id));
        intervals.forEach(id => realClearInterval.call(window, id));
        frames.forEach(id => realCancelFrame.call(window, id));
        timeouts.clear(); intervals.clear(); frames.clear();
        observers.forEach(observer => observer.disconnect());
        observers = [];
        if("speechSynthesis" in window && window.speechSynthesis){ window.speechSynthesis.cancel(); }
        // a var or function can't be deleted, only emptied
        Object.getOwnPropertyNames(window).forEach(name => {
            if(builtIn.has(name) || keptNames.has(name) || analytics.test(name)){ return; }
            try {
                if(!delete window[name]){ window[name] = undefined; }
            } catch(err){
                // read only - leave it
            }
        });
    }

    function runScript(text, src){
        let tag = document.createElement("script");
        tag.textContent = src ? text + "\n//# sourceURL=" + src : text;
        document.head.appendChild(tag);   // an inline script runs as it goes in
        tag.remove();
    }

    /* Files run once, in order, and kept through every page change - each
       loaded as a file, so its url is in the stack of anything it calls */
    function keep(urls){
        urls = urls.map(url => new URL(url, location.href).href);
        urls.filter(url => !keptFiles[url]).forEach(url => {
            keptUrls.push(url);
            let text = fetchText(url);
            keptFiles[url] = Promise.all([text, keeping]).then(([text]) => new Promise((resolve, reject) => {
                let before = new Set(Object.getOwnPropertyNames(window));
                let tag = document.createElement("script");
                tag.src = url;
                tag.onload = () => {
                    let declared = [...text.matchAll(/^(?:async\s+)?(?:function\s*\*?\s*|var\s+)([A-Za-z_$][\w$]*)/gm)].map(match => match[1]);
                    let added = Object.getOwnPropertyNames(window).filter(name => !before.has(name));   // a UMD build's
                    declared.concat(added).forEach(name => keptNames.add(name));
                    resolve();
                };
                tag.onerror = () => reject(new Error("Couldn't load " + url));
                document.head.appendChild(tag);   // not the body, which the next page replaces
            })).catch(err => {
                delete keptFiles[url];
                keptUrls = keptUrls.filter(other => other !== url);
                throw err;
            });
            keeping = keptFiles[url].catch(() => {});
        });
        return Promise.all(urls.map(url => keptFiles[url]));
    }

    function fetchText(url){
        return fetch(url).then(response => {
            if(!response.ok){ throw new Error(response.status + " " + url); }
            return response.text();
        });
    }

    // The new page's stylesheets, in its order among those already here, not applied yet
    function addStyles(doc, url){
        let wanted = [...doc.querySelectorAll('link[rel="stylesheet"]')].map(link => new URL(link.getAttribute("href"), url).href);
        let here = [...document.querySelectorAll('link[rel="stylesheet"]')];
        let after = null;
        let added = [];
        wanted.forEach(href => {
            let link = here.find(old => old.href === href);
            if(!link){
                link = document.createElement("link");
                link.rel = "stylesheet";
                link.media = "print";
                link.href = href;
                if(after !== null){ after.after(link); }
                else if(here.length > 0){ here[0].before(link); }
                else { document.head.appendChild(link); }
                added.push(link);
            }
            after = link;
        });
        let loaded = added.map(link => new Promise(resolve => { link.onload = link.onerror = resolve; }));
        return Promise.all(loaded).then(() => ({ wanted, added, here }));
    }

    function swapStyles({ wanted, added, here }){
        added.forEach(link => link.media = "all");
        here.filter(link => !wanted.includes(link.href)).forEach(link => link.remove());
    }

    let latest = 0;
    let shown = location.pathname + location.search;

    async function go(url, push){
        let mine = ++latest;
        let styles = null;
        try {
            let doc = new DOMParser().parseFromString(await fetchText(url), "text/html");
            let scripts = [...doc.querySelectorAll("script")];
            if(!scripts.some(script => script.getAttribute("src") === self)){ throw new Error("Not one of the pages swapped in"); }
            scripts = scripts.filter(script => script.getAttribute("src") !== self);
            // deferred ones after the rest, as on a load
            let deferred = script => script.defer && script.hasAttribute("src");
            scripts = scripts.filter(script => !deferred(script)).concat(scripts.filter(deferred));
            let texts = Promise.all(scripts.map(script => script.hasAttribute("src")
                ? fetchText(new URL(script.getAttribute("src"), url).href)
                : Promise.resolve(script.textContent)));
            [texts, styles] = await Promise.all([texts, addStyles(doc, url)]);
            if(mine !== latest){
                styles.added.forEach(link => link.remove());
                return;
            }

            // a tap fades across with the bottom nav held still; back and forward have the browser's own swipe
            let still = matchMedia("(prefers-reduced-motion: reduce)").matches;
            if(push && document.startViewTransition && !still){
                let transition = document.startViewTransition(() => commit(mine, doc, url, push, styles, scripts, texts));
                transition.ready.catch(() => {});   // skipped by another starting
                await transition.updateCallbackDone;
            } else {
                commit(mine, doc, url, push, styles, scripts, texts);
            }
        } catch(err){
            if(mine !== latest){ return; }
            console.log("Loading in full:", err.message);
            if(styles !== null){ styles.added.forEach(link => link.remove()); }
            if(push){ location.assign(url); } else { location.reload(); }
        }
    }

    function commit(mine, doc, url, push, styles, scripts, texts){
        // a newer tap overtook this one while the transition waited for a frame
        if(mine !== latest){
            styles.added.forEach(link => link.remove());
            return;
        }
        tearDown();
        if(push){
            history.replaceState(Object.assign({}, history.state, { "scroll" : window.scrollY }), "");
            history.pushState({ "scroll" : 0 }, "", url);
        }
        shown = location.pathname + location.search;

        document.title = doc.title;
        let description = doc.querySelector('meta[name="description"]');
        let ours = document.querySelector('meta[name="description"]');
        if(description && ours){ ours.content = description.content; }
        swapStyles(styles);
        document.documentElement.classList.remove("nav-panel");

        let body = document.body;
        [...body.attributes].forEach(attribute => body.removeAttribute(attribute.name));
        [...doc.body.attributes].forEach(attribute => body.setAttribute(attribute.name, attribute.value));
        doc.body.querySelectorAll("script").forEach(script => script.remove());
        body.replaceChildren(...[...doc.body.childNodes].map(node => document.adoptNode(node)));

        scripts.forEach((script, i) => runScript(texts[i], script.getAttribute("src")));
        document.dispatchEvent(new Event("DOMContentLoaded", { "bubbles" : true }));
        window.scrollTo(0, push || !history.state ? 0 : history.state.scroll || 0);
    }

    // for a script to move on without a link
    window.trainingGo = url => {
        let target = new URL(url, location.href);
        if(target.origin === location.origin && pages.test(target.pathname)){ go(target.href, true); }
        else { location.assign(target.href); }
    };
    window.trainingKeep = keep;
    builtIn.add("trainingGo").add("trainingKeep");

    history.scrollRestoration = "manual";

    // on window, so it comes after the page's own handlers, which may have taken the click
    addListener.call(window, "click", event => {
        if(event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey){ return; }
        let link = event.target.closest ? event.target.closest("a[href]") : null;
        if(link === null || link.target || link.hasAttribute("download")){ return; }
        let url = new URL(link.href, location.href);
        if(url.origin !== location.origin || !pages.test(url.pathname)){ return; }
        if(url.pathname + url.search === shown && url.hash){ return; }   // a jump within the page
        event.preventDefault();
        go(url.href, true);
    });

    addListener.call(window, "popstate", () => {
        if(location.pathname + location.search === shown){ return; }   // only the hash moved
        if(!pages.test(location.pathname)){ location.reload(); return; }
        go(location.href, false);
    });
})();
