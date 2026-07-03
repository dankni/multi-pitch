import fs from 'fs';

const content = JSON.parse(fs.readFileSync('./website/blog/content.json'));
const headHTML = fs.readFileSync('./website/components/head.html', 'utf8');
const footerHTML = fs.readFileSync('./website/components/footer.html', 'utf8');
const navHTML = fs.readFileSync('./website/components/nav.html', 'utf8');
const blogHeroImg = fs.readFileSync('./website/components/blog-hero-img.html', 'utf8');
const blogArticleHTML = fs.readFileSync('./website/components/blog-article.html', 'utf8');

const regex = {
  'url': /{{cannonical}}/gi,
  'description': /{{description}}/gi,
  'title': /{{title}}/gi,
  'heroImg': /{{heroImg}}/gi,
  'heroJpg': /{{heroJpg}}/gi,
  'heroCaption': /{{heroCaption}}/gi,
  'heroAlt': /{{heroAlt}}/gi,
  'scripts': /<!-- Scripts -->/gi

};

const newScript = `<!-- Scripts --> <script src="/js/blog.js" type="module"></script>`;

/** create blog content list **/ 
// ToDo: put this in a function and import as module
let blogLandingPageArticleContent = '<section id="blogPosts" class="container"><div class="row">';
for (let i = 0; i < content.articles.length; i++) {
  const article = content.articles[i];

  if(article.publish && article.url !== '/blog/'){
      
    blogLandingPageArticleContent += blogArticleHTML
      .replace(/{{url}}/gi, article.url)
      .replace(/{{heroImg}}/gi, article.heroImg)
      .replace(/{{heroAlt}}/gi, article.heroAlt)
      .replace(/{{created}}/gi, article.created)
      .replace(/{{author}}/gi, article.author)
      .replace(/{{readingTime}}/gi, article.readingTime)
      .replace(/{{title}}/gi, article.title)
      .replace(/{{summary}}/gi, article.summary);
  }
  if(i % 2 === 1 && i !== content.articles.length -1){
     blogLandingPageArticleContent += '</div><div class="row">'; // new row every 2 articles but not the last one
  }
}
blogLandingPageArticleContent += `</div></section>`;

/** create index.html files **/
content.articles.forEach(article => {
  const contentLoc = `./website${article.url}content.html`;
  const contentHTML = fs.readFileSync(contentLoc, 'utf8'); // no error handling here

  let heroImgHTML = blogHeroImg
  .replace(regex.heroAlt, article.heroAlt)
  .replace(regex.heroCaption, article.heroCaption)
  .replace(regex.heroImg, article.heroImg);

  const canonical = `https://www.multi-pitch.com${article.url}`;
  const heroJpgUrl = `https://www.multi-pitch.com${article.heroImg}.jpg`;
  const isLandingPage = article.url === '/blog/';

  let structuredData;
  if (isLandingPage) {
    structuredData = `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.multi-pitch.com/" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": canonical }
      ]
    })}</script>`;
  } else {
    // article.created is human-readable ("11th May 2026"); strip the ordinal so Date can parse it
    const datePublished = new Date(article.created.replace(/(\d+)(st|nd|rd|th)/, '$1')).toISOString().substring(0, 10);
    structuredData = `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": article.title,
      "description": article.metaDescription,
      "image": heroJpgUrl,
      "author": { "@type": "Person", "name": article.author },
      "publisher": {
        "@type": "Organization",
        "name": "Multi-Pitch",
        "logo": { "@type": "ImageObject", "url": "https://www.multi-pitch.com/img/favicon/android-icon-192x192.png" }
      },
      "datePublished": datePublished,
      "dateModified": article.lastUpdated.substring(0, 10),
      "mainEntityOfPage": canonical
    })}</script>`;
  }

  let articleHeadHTML = headHTML
  .replace(regex.url, canonical)
  .replace(regex.description, article.metaDescription)
  .replace(regex.title, article.title)
  .replace(regex.scripts, newScript)
  .replace(regex.heroJpg, heroJpgUrl)
  .replace(/{{ogType}}/gi, isLandingPage ? 'website' : 'article')
  .replace('<!-- Structured Data -->', structuredData)
  .replace(`<meta name="climbId" id="climbIdMeta" content="{{id}}" />`, '');
  
  let articleList = '';
  if(article.url === '/blog/'){
    articleList += blogLandingPageArticleContent;
  }

  let HTML = `${articleHeadHTML}${navHTML}
  <main id="main">
      ${heroImgHTML}
      ${contentHTML}
      ${articleList}
  </main>
  ${footerHTML}`;

  let indexLoc = './website' + article.url + 'index.html';
  fs.writeFile(indexLoc, HTML, {encoding:'utf8',flag:'w'}, function (err) {
      if (err) throw err;
      console.log(indexLoc + " saved!");
  });
});