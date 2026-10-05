/* The bar along the bottom of every training page: the app list, the progress
   page, and the app last used - on this page, where you are rather than a link.
   Its CSS is the "Bottom navigation" block at the end of common/style.css. */
(function(){
    const lastAppKey = "trainingLastApp";

    function svg(viewBox, inner){
        return `<svg class="bottom-nav-icon" viewBox="${viewBox}" aria-hidden="true" focusable="false">${inner}</svg>`;
    }
    function glyph(name){
        return `<i class="demo-icon ${name} bottom-nav-icon" aria-hidden="true"></i>`;
    }

    // The same icons the app cards on the overview wear
    const apps = {
        "rings" : { "name" : "Rings", "icon" : svg("0 0 100 126",
            `<path fill="currentColor" fill-rule="evenodd" d="M11.5,0 C5.5,0.5 1,7 0,19 C0,29 2.2,37 4.5,44 C6.8,52 11,62 13.1,69 C15.2,82 18.6,97 20.9,107 C23,116 33,126 46,126 L54,126 C67,126 77,116 79.1,107 C81.4,97 84.8,82 86.9,69 C89,62 93.2,52 95.5,44 C97.8,37 100,29 100,19 C99,7 94.5,0.5 88.5,0 C85,3.5 81.5,8 78,8 C69,7 61,2.5 50,2.5 C39,2.5 31,7 22,8 C18.5,8 15,3.5 11.5,0 Z M26.5,22.5 H73.5 A8,8 0 0 1 81.5,30.5 V38.5 A8,8 0 0 1 73.5,46.5 H26.5 A8,8 0 0 1 18.5,38.5 V30.5 A8,8 0 0 1 26.5,22.5 Z M32,60 H68 A7,7 0 0 1 75,67 V75 A7,7 0 0 1 68,82 H32 A7,7 0 0 1 25,75 V67 A7,7 0 0 1 32,60 Z M38,94 H62 A6,6 0 0 1 68,100 V105 A6,6 0 0 1 62,111 H38 A6,6 0 0 1 32,105 V100 A6,6 0 0 1 38,94 Z"/>`) },
        "timer" : { "name" : "Circuit", "icon" : glyph("icon-ccw") },
        "gilford" : { "name" : "Gilford", "icon" : glyph("icon-ok") },
        "boulder" : { "name" : "Gym", "icon" : svg("0 0 100 100",
            `<g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12,34 C11,26 15,22 22,22 L86,20 C92,20 94,26 93,33 C92,50 86,62 76,70 C67,77 58,80 50,80 C40,80 30,75 23,66 C16,57 13,45 12,34 Z"/>
                <path d="M20,31 C41,38 70,37 86,27"/>
                <circle cx="52" cy="54" r="11"/>
            </g>
            <circle fill="currentColor" cx="52" cy="54" r="4"/>`) },
        "endurance" : { "name" : "Endurance", "icon" : svg("0 0 100 100",
            `<path fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" d="M6,56 H26 L36,28 L52,76 L62,50 L70,56 H94"/>`) },
        "loft" : { "name" : "Twister", "icon" : glyph("icon-mic") },
        "nohangs" : { "name" : "No Hangs", "icon" : svg("0 0 100 100",
            `<rect fill="currentColor" x="18" y="4" width="64" height="14" rx="3"/>
            <g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M30,18 L50,48 L70,18"/>
                <circle cx="50" cy="32" r="8"/>
                <path d="M50,40 V70 L40,94 M50,70 L60,94"/>
            </g>
            <path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" d="M22,97.5 H78"/>`) },
        "trad" : { "name" : "Outside", "icon" : svg("0 0 100 100",
            `<g transform="rotate(30 50 50)">
                <path fill="currentColor" fill-rule="evenodd" stroke="currentColor" stroke-width="4" stroke-linejoin="round" d="M39,5 Q50,0 61,5 L57,25 Q50,21 43,25 Z M46,9 Q50,7 54,9 V19 Q50,17 46,19 Z"/>
                <path fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" d="M50,24 Q56,52 50,80"/>
                <path fill="none" stroke="currentColor" stroke-width="4.5" d="M50,78 C41,84 42,96 50,96 C58,96 59,84 50,78 Z"/>
            </g>`) }
    };

    const menuIcon = glyph("icon-menu");
    const graphIcon = svg("0 0 100 100",
        `<g fill="currentColor"><rect x="10" y="54" width="20" height="36" rx="3"/><rect x="40" y="32" width="20" height="58" rx="3"/><rect x="70" y="12" width="20" height="78" rx="3"/></g>`);

    // /training/ is the overview, /training/progress/ the charts, and
    // /training/timer/ and the rest are the apps
    let match = /^\/training\/([a-z]+)\//.exec(location.pathname);
    let page = match ? match[1] : "overview";
    let here = apps[page] ? page : null;   // the app this is, if it is one
    let last = here;
    try {
        if(here){ localStorage.setItem(lastAppKey, here); }
        else { last = localStorage.getItem(lastAppKey); }
    } catch(err){
        // storage blocked: no memory of the last app, which only costs the third button
    }
    if(!apps[last]){ last = null; }

    // A link somewhere else, or - for the page you are on - where you are
    function item(href, icon, label, current){
        let inner = `${icon}<span class="bottom-nav-label">${label}</span>`;
        return current
            ? `<span class="bottom-nav-item current" aria-current="page">${inner}</span>`
            : `<a class="bottom-nav-item" href="${href}">${inner}</a>`;
    }

    function appItem(){
        if(last === null){ return `<span class="bottom-nav-item empty" aria-hidden="true"></span>`; }
        return item(`/training/${last}/`, apps[last].icon, apps[last].name, here !== null);
    }

    function build(){
        let nav = document.createElement("nav");
        nav.className = "bottom-nav";
        nav.setAttribute("aria-label", "Training apps");
        nav.innerHTML = item("/training/", menuIcon, "Apps", page === "overview")
            + item("/training/progress/", graphIcon, "Progress", page === "progress")
            + appItem();
        document.body.appendChild(nav);
        document.documentElement.classList.add("has-bottom-nav");
    }

    if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", build);
    } else {
        build();
    }
})();
