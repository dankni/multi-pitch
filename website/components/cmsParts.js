/* SOME REUSABLE HTML COMPONENTS */

export function textAreaWithTitle (title, text){
        const html = `
        <div class="holder">
            <h2 class="overlay-title">${title}</h2>
            <textarea id="newJSON">${text}</textarea>
        </div>`;
    return html;
}

export function cmsNavigation (url){
    const html = `
        <div class="container">
            <a class="navbar-brand" href="/?god-mode"><img src="/img/logo/mp-logo-white.png" style="width:30px;" alt="multi-pitch logo"></a>
            <ul>
                <li><a href="${url}">Exit CMS mode</a></li>
                <li><a id="save">Save changes</a></li>
                <li><a id="showHTML">Toggle HTML</a></li>
                <li><a id="showJSON">Show new JSON</a></li>
                <li><a id="showDataFile">Show all-climb data file</a></li>
                <li><label for"minor"><em>Minor Edit</em> <input id="minor" type="checkbox" checked="true" /></label></li>
            </ul>
        </div>`;
    return html;
}

export function saveAndCancelOptions(hiddenGroupName, content){
    const html = `
        <div class="holder">
            <h2 class="overlay-title">${hiddenGroupName}</h2>
            <div id="newHiddenContent">
                ${content}
            </div>
            <button class="open-tile inline-button primary" id="saveHid">Keep Changes & Close</button>
            <button class="open-tile inline-button" id="cancel">Cancel</button>
        </div>`;
    return html;
}

export function labelAndInput(labelText, inputId){
    const html = `<p>${labelText}</p><p contentEditable="true" id="${inputId}"></p><br />`;
    return html;
}

export function labelAndCheckbox(labelText, inputId){
    const html = `<label for="${inputId}Check">
                    ${labelText}
                    <input name="${inputId}Check" 
                     onChange="Boolean(this.checked) ? document.getElementById('${inputId}').textContent = 'true' : 
                     document.getElementById('${inputId}').textContent = 'false';"
                     type="checkbox" 
                     id="${inputId}Check" />
                 </label>
                 <p class="hidden" style="display:none" id="${inputId}"></p>`;
    return html;
}

export function face(direction){
    const mapping = {null : 'Add Direction', 'N' : 'North Facing', 'NE' : 'North East Facing', 'E' : 'East Facing', 'SE' : 'South East Facing', 'S' : 'South Facing', 'SW' : 'South West Facing', 'W' : 'West Facing', 'NW' : ' North West Facing'}
    const html = `
        <div class="info-ring compass ${direction}">
            <span class="single-attribute"  title="${mapping[direction]}" id="face">${direction}</span>
        </div>`;
    return html;
}