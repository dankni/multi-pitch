const guideBooks = { books: 
   [ { climbId: 2,
       isbn: '9781873341377',
       title: 'West Country Climbs',
       type: 'guidebook',
       pg: 206,
       description: 'This is a great example of why I believe Rockfax are one of the world’s leading guidebook publishers. This guide covers a huge mix of regions in the south west with clear images and good topography. Especially for Bosigran.',
       imgURL: 'img/guidebooks/west-country-climbs.jpg',
       link: null,
       rrp: 24.99,
       guidePrice: 20 },
     { climbId: 1,
       isbn: '9781906095468',
       title: 'Scottish Rock, Volume 2, North',
       type: 'guidebook',
       pg: 266,
       description: 'A brilliant book covering such a wide and varied set of crags in the north of Scotland. The section on The Old Man of Stoer Routes is good. The images of longer routes can be a bit small at other crags thou.',
       imgURL: 'img/guidebooks/scottish-rock-volume-2.jpg',
       link: null,
       rrp: 25,
       guidePrice: 20 },
     { climbId: 3,
       isbn: '9781873341827',
       title: 'North Wales Climbs',
       type: 'guidebook',
       pg: 149,
       description: 'If you could only own one book on multi-pitch climbing in the UK this book would be a great choice. North wales has pleanty of Trad climbs above 50m. The book covers a good selection of climbs on each crag including Cloggy.',
       imgURL: 'img/guidebooks/north-wales-climbs.jpg',
       link: null,
       rrp: 24.99,
       guidePrice: 21 },
     { climbId: 4,
       isbn: '9786199010518',
       title: 'Vratsa Climbing Guide',
       type: 'guidebook',
       pg: 169,
       description: null,
       imgURL: null,
       link: null,
       rrp: null,
       guidePrice: null },
     { climbId: 5,
       isbn: '9780902940994',
       title: 'Rock Climbing in Donegal',
       type: 'guidebook',
       pg: 80,
       description: 'A very comprehensive guide to Climbing Irelands North West County of Donegal. Author Iain Miller is a very accomplished climber and set many of the first accents in the book including Cnoc Na Mara. The book is great value for money, however if you are on a budget, much of the material is posted free on Iain Millers Website uniqueascent.ie',
       imgURL: 'img/guidebooks/rock-climbing-in-donegal.jpg',
       link: null,
       rrp: 20,
       guidePrice: 20 },
     { climbId: 6,
       isbn: '9781873341971',
       title: 'The Dolomites, Rock Climbs and Via Ferrata',
       type: 'guidebook',
       pg: 175,
       description: 'This guide covers everything you need for a multi-pitch climbing trip regardless of ability, it also has sport, trad and via ferrata routes. It features all the major areas and has very clear topos and route descriptions including Fedele and the extension and adjecent route Dibona.',
       imgURL: 'img/guidebooks/the-dolomites-climbing-guide.jpg',
       link: 'https://amzn.to/2NdBIQw',
       rrp: 29.95,
       guidePrice: 20 },
     { climbId: 7,
       isbn: '9781873341827',
       title: 'North Wales Climbs',
       type: 'guidebook',
       pg: 191,
       description: 'North wales has pleanty of Trad climbs above 50m. This book covers a good selection of climbs from a good selection of cliffs, including a variety of routes up the Idwal Slabs.',
       imgURL: 'img/guidebooks/north-wales-climbs.jpg',
       link: null,
       rrp: 24.99,
       guidePrice: 21 },
     { climbId: 8,
       isbn: '9781873341377',
       title: 'West Country Climbs',
       type: 'guidebook',
       pg: 104,
       description: 'Whilst this is a great book in general, it\'s section on Lundy is of little value. It has no topos and little infomatin on Lundy.',
       imgURL: 'img/guidebooks/west-country-climbs.jpg',
       link: null,
       rrp: 24.99,
       guidePrice: 20 },
     { climbId: 9,
       isbn: '9788898609772',
       title: 'Portugal, Rock climbs on the western tip of Europe',
       type: 'guidebook',
       pg: 34,
       description: 'A solid guidebook with clear topography that is well organised and covers bouldering, sport and trad. The book lacks detailed descriptions on the routes themselves, but this is probably a good thing for those with a strong on-sight ethic. The book is not essential for climbing at Meadinha as the meadinah.com website has far more information but the book is a worthwhile purchase for someone traveling around Portugal, however the price tag feels a bit high all things considered.',
       imgURL: 'img/guidebooks/rock-climbs-in-portugal.jpg',
       link: null,
       rrp: 34.95,
       guidePrice: 34.95 },
     { climbId: 10,
       isbn: '9781873341377',
       title: 'West Country Climbs',
       type: 'guidebook',
       pg: 128,
       description: 'This is a great example of a guidebook. This guide covers a huge mix of regions in the south west with clear images and good topography. Especially for Conakey Cliff and the Clum Coast.',
       imgURL: 'img/guidebooks/west-country-climbs.jpg',
       link: null,
       rrp: 24.99,
       guidePrice: 20 },
     { climbId: 13,
       isbn: '9780902940994',
       title: 'Rock Climbing in Donegal',
       type: 'guidebook',
       pg: 80,
       description: 'A very comprehensive guide to Climbing Irelands North West County of Donegal. Author Iain Miller is a very accomplished climber and set many of the first accents in the book. The book is great value for money, however if you are on a budget, much of the material is posted free on Iain Millers Website uniqueascent.ie',
       imgURL: 'img/guidebooks/rock-climbing-in-donegal.jpg',
       link: null,
       rrp: 20,
       guidePrice: 20 },
     { climbId: 16,
       isbn: '9781873341827',
       title: 'North Wales Climbs',
       type: 'guidebook',
       pg: 156,
       description: 'A brilliant guidebok with a good section on Lliwedd. Overall this book covers a good selection of climbs from a good selection of cliffs, including the 300m routes up Lliwedd',
       imgURL: 'img/guidebooks/north-wales-climbs.jpg',
       link: null,
       rrp: 24.99,
       guidePrice: 21 },
     { climbId: 11,
       isbn: '9781906095581',
       title: 'Scottish Rock, Volume 1, South',
       type: 'guidebook',
       pg: 32,
       description: 'An extensive and well-made guidebook covering every worthwhile crag in Southern Scotland. The guides are clear with generally very good photography, however some of the longer routes lack the clear imagery of their single pitch counterparts.',
       imgURL: 'img/guidebooks/scottish-rock-volume-1.jpg',
       link: null,
       rrp: 25,
       guidePrice: 20 },
     { climbId: 14,
       isbn: '9781873341377',
       title: 'West Country Climbs',
       type: 'guidebook',
       pg: 258,
       description: 'This book comes into its own for so many areas in the south west of Britain. This guide covers a huge mix of regions with clear images and good topography. The section on Chair Ladder is brilliant covers a great mix of multi-pitch routes across the grades.',
       imgURL: 'img/guidebooks/west-country-climbs.jpg',
       link: null,
       rrp: 24.99,
       guidePrice: 20 },
     { climbId: 12,
       isbn: 'no ISBN',
       title: 'Monterrat Free Climbs',
       type: 'guidebook',
       pg: 162,
       description: 'A huge selection of over a thousand routes many of which are big wall multi-pitch climbs. Montserrat is well bolted area but many routes require a full trad rack. The book has some good topography but lacks details when to comes to the approach. The book is a tome of information but not brilliantly organised for such a recent publication. It is also at the more expensive end of guidebook prices, but can be purchased cheaper from mainland Europe.',
       imgURL: 'img/guidebooks/montserrat-free-climbs.jpg',
       link: null,
       rrp: 34,
       guidePrice: 34 },
     { climbId: 17,
       isbn: '9781873341230',
       title: 'Lofoten Climbs',
       type: 'guidebook',
       pg: 354,
       description: 'This covers rock climbing on Lofoten and Stetind in Arctic Norway. A great publication from Rockfax with clear topography and good information. The patronising puffin that appears on certain pages with silly comments does somewhat detract from the professional quality of the book but I’m sure it appeals to some. Overall an essential guidebook for people looking to climb in this part of the world and great value for money.',
       imgURL: 'img/guidebooks/loften-climbs.jpg',
       link: null,
       rrp: 34.99,
       guidePrice: 30 },
     { climbId: 18,
       isbn: '9780850280555',
       title: 'Scafell & Wasdale',
       type: 'guidebook',
       pg: '?',
       description: 'The FRCC Scafell and Wasdale  Climbing guidebook was released in April 2014, 100 years after the first ascent of Central Buttress on Scafell Crag. The Centenary Edition guide is full of inspirational climbs often with great history. The pocket sized nature of the book makes it portable but somewhat less practical for route finding. The BMC super zoom is more useful for Scafell Crag if you are a visual person.',
       imgURL: 'img/guidebooks/Scafell-Wasdale-climbing-guidebook.jpg',
       link: null,
       rrp: 25,
       guidePrice: 25 },
     { climbId: 15,
       isbn: '9781493016129',
       title: 'Rock Climbing Wyoming',
       type: 'guidebook',
       pg: '?',
       description: 'Rock Climbing Wyoming describes 11 major climbing areas in the state of Wyoming. It offers approximately 550 climbing routes. Falcon guides have maps, good topos, and action photos accompanying clearly written descriptions of the routes. The book is ideal for a trip to Wyoming, but enough of the information on the devils tower is available online for those looking to save same money.',
       imgURL: 'img/guidebooks/rock-climbing-wyoming.jpg',
       link: null,
       rrp: 20,
       guidePrice: 20 },
     { climbId: 19,
       isbn: '9780986519109',
       title: 'Canadian Rock: Select Climbs of the West',
       type: 'guidebook',
       pg: '?',
       description: 'The Canadian Rock: Select Climbs of the West guide documents more than 1200 rock climbs across Western Canada, and in full-colour brings together into a single collection the best climbs in Western Canada, from Squamish to Lake Louise, to the Ghost River Valley.',
       imgURL: 'img/guidebooks/canadian-rock-select-climbs-of-the-west.jpg',
       link: null,
       rrp: 34.99,
       guidePrice: 34.99 },
     { climbId: 20,
       isbn: '9780902940291',
       title: 'Rock Climbs in the Mourne Mountains',
       type: 'guidebook',
       pg: 129,
       description: 'This book is a very comprehensive guide to trad climbing in the Mourne Mountains. A worthwile book if you\'re there for a while, however the generic Rock Climbing in Ireland Book will cover you if you only plan a fleeting visit.',
       imgURL: 'img/guidebooks/rock-climbs-in-the-mournes-mountains.jpg',
       link: null,
       rrp: 19.95,
       guidePrice: 19.95 },
     { climbId: 21,
       isbn: 'no ISBN',
       title: 'Lion Rock',
       type: 'PDF',
       pg: 4,
       description: 'This publicly availible guidebook is so clear and comprehensive that I almost didn\'t bother adding Lion Rock to this website because its covered in far better detail in this guide.',
       imgURL: 'img/guidebooks/rock-climbs-in-hong-kong.jpg',
       link: 'https://hongkongclimbing.files.wordpress.com/2012/06/lionrock.pdf',
       rrp: 'FREE',
       guidePrice: 'FREE' },
     { climbId: 22,
       isbn: '9781873341954',
       title: 'Costa Blanca',
       type: 'guidebook',
       pg: 267,
       description: 'A brilliant book covering a wide and varied set of crags in sunny Spain. This Rockfax guide covers the climbs around Calpe including Diedre UBSA and many others. A great book for the multi-pitch climber with a penchant for trad. The old edition can be picked up cheap if you are on a budget, but the updated guide covers more routes and areas. Peñón de Ifach is in both versions in detail.',
       imgURL: 'img/guidebooks/costa-blanca.jpg',
       link: null,
       rrp: 29.95,
       guidePrice: 25 } ] }; 

    //So then I can use this in my mocha tests:
 
        if (typeof module !== 'undefined' && typeof module.exports !== 'undefined'){
 
            module.exports = {
 
                guideBooks

            };
 
        }