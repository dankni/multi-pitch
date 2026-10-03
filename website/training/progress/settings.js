/* The cog: which charts are on show. Dark mode and the UKC import are the shared
   ones from functions.js and ukc.js. */
(function(){
    const hiddenKey = "progressHidden";
    const charts = ["sportFigure", "boulderFigure", "tradFigure"];

    function hiddenParts(){
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(hiddenKey)); } catch(err){ saved = null; }
        return Array.isArray(saved) ? saved : [];
    }

    function showParts(){
        let hidden = hiddenParts();
        document.querySelectorAll("[data-part]").forEach(box => {
            let off = hidden.includes(box.dataset.part);
            box.checked = !off;
            document.getElementById(box.dataset.part).classList.toggle("switched-off", off);
        });
        // no range picker on its own; trad is also hidden when there is none
        document.getElementById("performance").classList.toggle("switched-off",
            charts.every(id => hidden.includes(id) || document.getElementById(id).hidden));
    }

    window.toggleProgressPart = function(input){
        let hidden = hiddenParts().filter(id => id !== input.dataset.part);
        if(!input.checked){ hidden.push(input.dataset.part); }
        try { localStorage.setItem(hiddenKey, JSON.stringify(hidden)); } catch(err){ /* only a preference */ }
        showParts();
    };

    showParts();
})();
