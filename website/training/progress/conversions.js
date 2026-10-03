/* The grade conversions on the info panel: bouldering and routes from
   common/grades.js, a radio to switch between them. The grades the charts count
   wear the colour a chart gives them (gradeBands, from common/grades.js): the V grades,
   and the British ones. */
(function(){
    // a word, as a dash would be read as the minus in V- or 6-; small, so the grades stand out
    const between = " <span class=\"between\">to</span> ";

    // ["5.10a", "5.10c"] as 5.10a to c; any other pair as easiest to hardest
    function span(value){
        if(!Array.isArray(value)){ return value; }
        let [easiest, hardest] = value;
        if(/^5\.\d+[a-d]$/.test(easiest) && hardest.slice(0, -1) === easiest.slice(0, -1)){
            return easiest + between + hardest.slice(-1);
        }
        return easiest + between + hardest;
    }

    function swatch(band){
        return `<span class="swatch ${band.cls}" title="${band.name}"></span>`;
    }

    // rows past the last grade shown wait behind a show more button
    function hiddenAfter(table, key, last){
        let cut = table.findIndex(grade => grade[key] === last);
        return index => index > cut ? " hidden" : "";
    }

    const showMore = `<button type="button" class="quiet show-more" data-action="showMoreGrades">Show more</button>`;

    function boulderTable(){
        let hidden = hiddenAfter(boulderGradeTable, "v", "V8");
        return `<table class="log-table conversion-table">
            <thead><tr><th>V</th><th>Font</th><th>British</th></tr></thead>
            <tbody>${boulderGradeTable.map((grade, index) => `<tr${hidden(index)}>
                <td>${swatch(gradeBands.boulder(grade.v))}${grade.v}</td>
                <td>${grade.font}</td><td>${grade.brit}</td>
            </tr>`).join("")}</tbody>
        </table>` + showMore;
    }

    function routeTable(){
        let hidden = hiddenAfter(routeGradeTable, "uk", "E4");
        return `<table class="log-table conversion-table">
            <thead><tr><th>UK</th><th>UIAA</th><th>French</th><th>YDS</th><th><abbr title="Norwegian">Nor</abbr></th></tr></thead>
            <tbody>${routeGradeTable.map((grade, index) => `<tr${hidden(index)}>
                <td>${swatch(gradeBands.trad(grade.uk))}${grade.uk}<small>${span(grade.tech)}</small></td>
                <td>${span(grade.uiaa)}</td><td>${span(grade.french)}</td>
                <td>${span(grade.yds)}</td><td>${span(grade.nordic)}</td>
            </tr>`).join("")}</tbody>
        </table>` + showMore;
    }

    document.getElementById("boulderConversions").innerHTML = boulderTable();
    document.getElementById("routeConversions").innerHTML = routeTable();

    window.showMoreGrades = function(button){
        button.previousElementSibling.querySelectorAll("tr[hidden]").forEach(row => { row.hidden = false; });
        button.remove();
    };

    window.showConversions = function(input){
        document.getElementById("boulderConversions").hidden = input.value !== "boulder";
        document.getElementById("routeConversions").hidden = input.value !== "route";
    };
})();
