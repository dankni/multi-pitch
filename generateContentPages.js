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

    const canonical = 'https://www.multi-pitch.com' + page;
    const isHubPage = page === '/climbing-tips/';
    const breadcrumbItems = [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.multi-pitch.com/" },
        { "@type": "ListItem", "position": 2, "name": "Climbing Tips", "item": "https://www.multi-pitch.com/climbing-tips/" }
    ];
    if (!isHubPage) {
        breadcrumbItems.push({ "@type": "ListItem", "position": 3, "name": content.heading, "item": canonical });
    }
    const structuredData = `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbItems
    })}</script>`;

    // a fresh copy of the head template per page, so placeholders are still present
    const pageHeadHTML = headHTML
        .replace(/{{cannonical}}/gi, canonical)
        .replace(/{{description}}/gi, content.description)
        .replace(/{{title}}/gi, content.heading)
        .replace(/<!-- Scripts -->/gi, newScript)
        .replace(/{{heroJpg}}/gi, 'https://www.multi-pitch.com' + (content.heroImg || '/img/tiles/bosigran-climbing-small.jpg'))
        .replace(/{{ogType}}/gi, 'article')
        .replace('<!-- Structured Data -->', structuredData)
        .replace(`<meta name="climbId" id="climbIdMeta" content="{{id}}" />`, '');

    const indexLoc = './website' + page + 'index.html';
    fs.writeFile(indexLoc, pageHeadHTML + navHTML + contentHTML + footerHTML, {encoding:'utf8',flag:'w'}, function (err) {
        if (err) throw err;
        console.log(indexLoc + " saved!");
    });
});
