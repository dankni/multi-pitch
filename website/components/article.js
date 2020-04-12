function makeLinksPushable () {
    let pushableLinks = document.querySelectorAll('.pushable');
    for(let i = 0; i < pushableLinks.length; i++){
        pushableLinks[i].addEventListener('click', function(event){ // ToDo: needs accessibility support
            getContent(pushableLinks[i].href + 'content.json', false);
        });
        pushableLinks[i].classList.remove('pushable');
    }
}
  
function getContent(url, sorted){
    event.preventDefault();
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.onload = function() {
        if (this.status >= 200 && this.status < 400) {    
            let content = JSON.parse(this.response);
            loadContent(url, content, sorted)
        }
    }
    request.onerror = function() { console.log('Error ' + this.status);   };
    request.send();
}
  
function loadContent(url, content, sorted){
    history.pushState(null, content.navLink, url.replace('content.json', ''));
    document.getElementById('main').innerHTML = ''; // clear body content
    updateMeta();
    let breadcrumb = updateBreadcrumb(content.url);
    let introHTML = generateIntroHTML(content, breadcrumb);
    let articles = generateArticlesHTML(content, sorted);
    let html = `
    <div class="container">
        ${introHTML}
        <section id="content">
        ${articles}
        </section>
    </div>`;
    document.getElementById('main').innerHTML = html; // appends
    window.scrollTo({ top: 0, behavior: 'smooth' });
    makeLinksPushable();
}
  
function updateMeta(content){

}

function generateIntroHTML(content, breadcrumb){
let title = content.heading;
let intro = content.intro;
let searchDisplay = 'none';
if(content.search === true) { searchDisplay = 'block'};
return `
<section>
    <div class="row">
    <div class="col col-md-12">
        <h1>${title}</h1>
    </div>
    </div>        
    <div class="row">
        <div class="col">
            <p id="intro">${intro}</p>
        </div>
    </div>
    <form id="search" style="display:${searchDisplay};">
    <input type="text" placeholder="Search" style="width:100%;padding:10px;font-size:1.6rem;">
    </form>
    ${breadcrumb}
</section>
<hr>`;
}
            
function generateArticlesHTML(content, sorted){
    let articles = '';
    if(content.articles && sorted === true){
        content.articles.sort( function( a, b ) {
            a = a.title.toLowerCase();
            b = b.title.toLowerCase();
            return a < b ? -1 : a > b ? 1 : 0;
        });
    }
    for(let i = 0; i < content.articles.length; i++){
        if(content.articles[i].publish === true){
        let h2 = content.articles[i].title;
        let p = content.articles[i].paragraph;
        let url = '';
        let alt = '';
        let a = '';
        if(content.articles[i].img){
            let img = content.articles[i].img.url;
            url = img.substring(0, img.length - 4) + '-s.jpg';
            alt = content.articles[i].img.alt;
        }
        if(content.articles[i].link){
            let pushable = '';
            if(content.articles[i].link.pushable === true) { pushable = 'pushable'; }
            a = '<br /> <a class="seperated-link ' + pushable + '" href="' + content.articles[i].link.href + '">' + content.articles[i].link.text + ' &#8250;</a>';
        }
        let article = 
        `<article class="row">
            <h2 class="col-12">${h2}</h2>
            <div class="col-12 col-md-4 col-sm-5 col-lg-3">
                <figure class="compend-fig">
                    <img src="${url}" alt="${alt}" class="cat-img" onclick="openLightBox('${content.articles[i].img.url}', '${alt}')" />
                    <figcaption>${alt}</figcaption>
                </figure>
            </div>
            <p class="col-12 col-md-8 col-sm-7 col-lg-9">
                ${p} ${a}
            </p>
        </article>`;
        articles += article;
        }
    }
    return articles;
}
  
function updateBreadcrumb(url){
    let parts = url.split('/');
    let breadcrumbDisplay = 'none';
    let breadcrumbUrl = '';
    let breadcrumbTxt = '';
    // Its a 3rd lvl page
    if(parts[2]){
        breadcrumbDisplay = 'inline';
        breadcrumbUrl = url;
        parts[2] = parts[2].charAt(0).toUpperCase() + parts[2].slice(1);
        breadcrumbTxt = parts[2].replace('-', ' ');
    }
    let html = `
    <div id="breadcrumb">
        <a href="/">Home</a> /
        <a href="/climbing-tips/" class="pushable">Compendium</a> 
        <span id="dividerTwo" style="display: ${breadcrumbDisplay};">/</span>
        <a href="${breadcrumbUrl}" class="pushable" id="thirdLvl" style="display: ${breadcrumbDisplay};">${breadcrumbTxt}</a>
    </div>`;
    return html;
}

function openLightBox(img, alt) {
    document.getElementById('overlay').innerHTML = `<img src="${img}" alt="${alt}" id="modalStart" style="display:block;margin:10px auto;max-height:90vh;max-width:90vw"/>`;
    document.getElementById('overlay').setAttribute("style", "display:block;background:rgba(0,0,0, 0.7);z-index:14;");
    document.getElementById('close').setAttribute("style", "display:block;");
    document.getElementById('bdy').setAttribute("style", "overflow:hidden");
    document.getElementById('modalStart').focus(); // accessibility
}

function hideTile() {
    document.getElementById('close').setAttribute("style", "display:none;"); // for the subscribe overlay
    document.getElementById('overlay').setAttribute("style", "display:none;background:rgba(0,0,0, 0.0);");
    document.getElementById('bdy').setAttribute("style", "");
}
  
//So then I can use this in nodejs and in the browser
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
        updateBreadcrumb, generateIntroHTML, generateArticlesHTML
    };
}