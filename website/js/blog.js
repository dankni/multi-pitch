function makeLinksPushable () {
    let pushableLinks = document.querySelectorAll('.pushable');
    for(let i = 0; i < pushableLinks.length; i++){
        pushableLinks[i].addEventListener('click', function(clickEvent){ // ToDo: needs accessibility support
            getContent(pushableLinks[i].href, false, clickEvent);
            history.pushState({"page" : pushableLinks[i].href}, pushableLinks[i].innerHTML, pushableLinks[i].href);
        });
        pushableLinks[i].classList.remove('pushable');
        // popstate event in main.js
    }
    document.querySelectorAll('a[href^="#"]').forEach(anchor => { // in page smooth scroll for anchor links
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
}

window.addEventListener('DOMContentLoaded', (event) => {
    makeLinksPushable();
    getAllPosts();
});

function getAllPosts(){
    fetch('/blog/content.json')
        .then(response => {
            if (!response.ok) {
                throw new Error("Error getting content");
            }
            return response.json();
        })
        .then(content => {
            localStorage.setItem('allBlogPosts', JSON.stringify(content.articles));
        })
        .catch(error => {
            console.log(error);
        });
}

function getArticleFromURL(url){
    let allPosts = JSON.parse(localStorage.getItem('allBlogPosts'));
    for(let i = 0; i < allPosts.length; i++){
        if(url.endsWith(allPosts[i].url)){
            return allPosts[i];
        }
    }
    return null;
}

window.getContent = function(url, sorted, clickEvent) {    
    if(clickEvent){
        clickEvent.preventDefault();
    }
    let content = getArticleFromURL(url);
    if(document.getElementById('blogPosts')){
        document.getElementById('blogPosts').outerHTML = ''; // clear blog posts list
    }
    updateMeta(content);
    updateHeroImage(content); // clear body content
    getMainHTML(content);
    if(content.url === '/blog/'){
        generateArticlesHTML();
    }
}

function getTemplate(filepath) {
    return fetch(filepath).then(response => { // no error handling here
        let txt = response.text();
        return txt;
    });
}   

function updateHeroImage(content){
    getTemplate('/components/blog-hero-img.html')
        .then(function doSomething(tpl) {
            let heroImgHTML = tpl
            .replace(/{{heroAlt}}/gi, content.heroAlt)
            .replace(/{{heroCaption}}/gi, content.heroCaption)
            .replace(/{{heroImg}}/gi, content.heroImg);
            document.getElementById('hero').outerHTML = heroImgHTML;
        });
}
  
function updateMeta(content){
    document.title = content.title;
    document.querySelector('meta[name="description"]').setAttribute("content", content.metaDescription);
    document.querySelector('meta[property="og:title"]').setAttribute("content", content.title);
    document.querySelector('meta[property="og:description"]').setAttribute("content", content.metaDescription)
    document.querySelector('meta[property="og:image"]').setAttribute("content", content.heroImg + '-1200.jpg');
    document.querySelector('meta[property="og:url"]').setAttribute("content", "https://www.multi-pitch.com" + content.url);
}

function getMainHTML(content){
    getTemplate(content.url + 'content.html')
        .then((html) => {
            document.getElementById('content').outerHTML = html;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
}

function generateArticlesHTML(){
    let allBlogPosts = JSON.parse(localStorage.getItem('allBlogPosts'));
    getTemplate('/components/blog-article.html')
        .then((html) => {
        const tpl = html;
        let articlesHTML = '<section id="blogPosts" class="container"><div class="row">';
        for(let i = 0; i < allBlogPosts.length; i++){
            if(allBlogPosts[i].publish !== true || allBlogPosts[i].url === '/blog/'){
                continue; // skip unpublished articles and the blog landing page itself
            }
            
            articlesHTML += tpl
            .replace(/{{url}}/gi, allBlogPosts[i].url)
            .replace(/{{heroImg}}/gi, allBlogPosts[i].heroImg)
            .replace(/{{heroAlt}}/gi, allBlogPosts[i].heroAlt)
            .replace(/{{created}}/gi, allBlogPosts[i].created)
            .replace(/{{author}}/gi, allBlogPosts[i].author)
            .replace(/{{title}}/gi, allBlogPosts[i].title)
            .replace(/{{summary}}/gi, allBlogPosts[i].summary);
            
            if(i % 2 === 1 && i !== allBlogPosts.length -1){
                articlesHTML += '</div><div class="row">'; // new row every 2 articles but not the last one
            }
        }
        articlesHTML += '</div></section>';
        document.getElementById('main').innerHTML += articlesHTML;
        makeLinksPushable();
    });
}

window.openLightBox = function(img, alt) { // so that I can use it globally
    const blogImgs = document.querySelectorAll('.blog-img');
    let currentIndex = Array.from(blogImgs).findIndex(el => el.getAttribute('src') === img || el.getAttribute('data-src') === img);
    if (currentIndex === -1) currentIndex = 0; // fallback

    function showImage(index) {
        const image = blogImgs[index];
        if (image) {
            const src = image.src || image.getAttribute('data-src');
            const altText = image.alt || alt;
            document.getElementById('overlay').innerHTML = `
                <button id="prevBtn" class="lightbox-nav" ${index === 0 ? 'disabled' : ''}>&lt;</button>
                <img src="${src}" alt="${altText}" id="modalStart" 
                onKeyDown="return event.code != 'Escape' || hideTile(false)" tabindex="0" />
                <button id="nextBtn" class="lightbox-nav" ${index === blogImgs.length - 1 ? 'disabled' : ''}>&gt;</button>
                <p class="modal-caption">Photo: ${altText}</p>
            `;
            document.getElementById('modalStart').focus(); // accessibility
            // Add event listeners for navigation
            document.getElementById('prevBtn').addEventListener('click', () => navigate(-1));
            document.getElementById('nextBtn').addEventListener('click', () => navigate(1));
        }
    }

    function navigate(direction) {
        currentIndex += direction;
        if (currentIndex < 0) currentIndex = 0;
        if (currentIndex >= blogImgs.length) currentIndex = blogImgs.length - 1;
        showImage(currentIndex);
    }

    // Keyboard navigation
    function handleKeydown(event) {
        if (event.code === 'ArrowLeft') {
            navigate(-1);
        } else if (event.code === 'ArrowRight') {
            navigate(1);
        } else if (event.code === 'Escape') {
            document.removeEventListener('keydown', handleKeydown);
            hideTile(false);
        }
    }

    document.addEventListener('keydown', handleKeydown);

    document.getElementById('overlay').setAttribute("style", "display:block;background:rgba(0,0,0, 0.7);z-index:14;");
    document.getElementById('close').setAttribute("style", "display:block;");
    document.getElementById('bdy').setAttribute("style", "overflow:hidden");

    showImage(currentIndex);
}

//So then I can use this in nodejs and in the browser
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
        getMainHTML, generateArticlesHTML, updateHeroImage, getAllPosts, getArticleFromURL, openLightBox
    };
}