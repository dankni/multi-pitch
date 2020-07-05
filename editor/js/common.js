function addNav(){
    let div = document.createElement('div');
    div.className = 'container';
    div.innerHTML = '<a class="navbar-brand" href="/" aria-label="Multi-Pitch Climbing, Homepage Link"><img src="http://www.multi-pitch.com/img/logo/mp-logo-white.png" alt="multi-pitch climbing" /></a>';
    let ul = document.createElement('ul');
    let navigation = [
        {"url" : "/editor/", "text" : "Summary"},
        {"url" : "/editor/topo-edit/", "text" : "Topo Creator"},
        {"url" : "/editor/changes/", "text" : "View Changes"}
    ];
    for(let i = 0; i < navigation.length; i++){
        let li = document.createElement('li');
        let a = document.createElement('a');
        a.href = navigation[i].url;
        if(navigation[i].url === window.location.pathname){
            a.style = 'text-decoration:underline';
        }
        a.textContent = navigation[i].text;
        li.appendChild(a);
        ul.appendChild(li);
    }
    div.appendChild(ul);
    document.querySelector('nav').appendChild(div);   
}

window.addEventListener('DOMContentLoaded', (event) => {
    addNav();
});

function openModal() {
    document.getElementById('overlay').setAttribute("style", "display:block;background:rgba(0,0,0, 0.7);z-index:14;");
    document.getElementById('close').setAttribute("style", "display:block;");
    document.getElementById('bdy').setAttribute("style", "overflow:hidden");
    document.getElementById('cliff').focus();
}
function hideTile() {
    document.getElementById('close').setAttribute("style", "display:none;");
    document.getElementById('overlay').setAttribute("style", "display:none;background:rgba(0,0,0, 0.0);");
    document.getElementById('bdy').setAttribute("style", "");
}