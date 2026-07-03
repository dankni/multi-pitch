import fs from 'fs';
import { updateBreadcrumb, generateIntroHTML, generateArticlesHTML } from './website/components/article.js';

const pages = [
    '/climbing-tips/',
    '/climbing-tips/climbing-grades/',
    '/climbing-tips/climbing-gear/',
    '/climbing-tips/rock-types/',
    '/climbing-tips/climbing-terminology/'
];

const newScript = `<!--scripts -->
<script src="/components/article.js" type="module"></script>
<script>
    window.addEventListener('DOMContentLoaded', (event) => {
        makeLinksPushable();
    });
</script>`;

const headHTML = fs.readFileSync('./website/components/head.html', 'utf8');
const footerHTML = fs.readFileSync('./website/components/footer.html', 'utf8');
const navHTML = fs.readFileSync('./website/components/nav.html', 'utf8');

pages.forEach(function(page) {
    const content = JSON.parse(fs.readFileSync('./website' + page + 'content.json', 'utf8'));

    const breadcrumb = updateBreadcrumb(content.url);
    const introHTML = generateIntroHTML(content, breadcrumb);
    const articles = generateArticlesHTML(content, false);
    const contentHTML = `
    <main id="main" style="margin-top:80px">
        <div class="container">
        ${introHTML}
        <section id="content">
            ${articles}
        </section>
        </div>
    </main>`;

    // a fresh copy of the head template per page, so placeholders are still present
    const pageHeadHTML = headHTML
        .replace(/{{cannonical}}/gi, 'https://www.multi-pitch.com' + page)
        .replace(/{{description}}/gi, content.description)
        .replace(/{{title}}/gi, content.heading)
        .replace(/<!-- Scripts -->/gi, newScript)
        .replace(/{{heroJpg}}/gi, 'https://www.multi-pitch.com' + content.heroImg)
        .replace(`<meta name="climbId" id="climbIdMeta" content="{{id}}" />`, '');

    const indexLoc = './website' + page + 'index.html';
    fs.writeFile(indexLoc, pageHeadHTML + navHTML + contentHTML + footerHTML, {encoding:'utf8',flag:'w'}, function (err) {
        if (err) throw err;
        console.log(indexLoc + " saved!");
    });
});
