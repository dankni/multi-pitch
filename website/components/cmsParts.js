/* SOME REUSABLE HTML COMPONENTS */

export function textAreaWithTitle (title, text){
        const html = `
        <div class="holder">
            <h2 class="overlay-title">${title}</h2>
            <textarea id="newJSON">${text}</textarea>
        </div>`;
    return html;
}

export function cmsNavigation (url, climbId){
    const html = `
        <div class="container">
            <a class="navbar-brand" href="/"><img src="/img/logo/mp-logo-white.png" style="width:30px;" alt="multi-pitch logo"></a>
            <ul>
                <li><a href="${url}">Exit CMS mode</a></li>
                <li><a id="save">Save changes</a></li>
                <li><a id="showHTML">Toggle HTML</a></li>
                <li><a id="showJSON">Show new JSON</a></li>
                <li><a href="/editor/topo-edit/?climbId=${climbId}">Topo editor</a></li>
                <li><a id="showDataFile">Show all-climb data file</a></li>
            </ul>
        </div>`;
    return html;
}

export function saveAndCancelOptions(content){
    const html = `
        <div class="holder">
            <h2 class="overlay-title">Edit grade</h2>
            <div id="newHiddenContent">
                ${content}
            </div>
            <button class="open-tile inline-button primary" id="saveHid">Keep Changes & Close</button>
            <button class="open-tile inline-button" id="cancel">Cancel</button>
        </div>`;
    return html;
}

export function labelAndInput(labelText, inputId){
    const html = `
        <p>${labelText}</p>
        <p contentEditable="true" id="${inputId}"></p>
        <br />`;
    return html;
}