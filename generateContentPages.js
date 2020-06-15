const fs = require('fs');
const article = require('./website/components/article.js');

const pages = ['/climbing-tips/', '/climbing-tips/climbing-grades/', '/climbing-tips/climbing-gear/', '/climbing-tips/rock-types/']; 
const regexUrl = /{{cannonical}}/gi;
const regexDesc = /{{description}}/gi;
const regexTitle = /{{title}}/gi;
const regexHero = /{{heroJpg}}/gi;
const regexScripts = /<!-- Scripts -->/gi;
const newScript = `<!--scripts -->
<script src="/components/article.js"></script>
<script>
    window.addEventListener('DOMContentLoaded', (event) => {
        makeLinksPushable();
    }); 
</script>`;

let headHTML = fs.readFileSync('./website/components/head.html', 'utf8');
let footerHTML = fs.readFileSync('./website/components/footer.html', 'utf8');
let navHTML = fs.readFileSync('./website/components/nav.html', 'utf8');

pages.forEach(function(page) {
    let contentLoc = './website' + page + 'content.json';
    let content = JSON.parse(fs.readFileSync(contentLoc, 'utf8'));

    let breadcrumb = article.updateBreadcrumb(content.url);
    let introHTML = article.generateIntroHTML(content, breadcrumb);
    let articles = article.generateArticlesHTML(content, false);
    let contentHTML = `
    <main id="main" style="margin-top:80px">
        <div class="container">
        ${introHTML}
        <section id="content">
            ${articles}
        </section>
        </div>
    </main>`;

    let indexLoc = './website' + page + 'index.html';

    headHTML = headHTML.replace(regexUrl, 'https://www.multi-pitch.com/' + page);
    headHTML = headHTML.replace(regexDesc, content.description);
    headHTML = headHTML.replace(regexTitle, content.heading);
    headHTML = headHTML.replace(regexScripts, newScript);
    headHTML = headHTML.replace(regexHero, 'https://www.multi-pitch.com' + content.heroImg);

    let data = headHTML + navHTML + contentHTML + footerHTML;
    fs.writeFile(indexLoc, data, {encoding:'utf8',flag:'w'}, function (err) {
        if (err) throw err;
        console.log("It's saved!");
    });

});