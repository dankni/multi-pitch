const Nightmare = require('nightmare');
const expect = require('chai').expect;
const climbsData = require('../website/data/data.json');
const app = require('../server');


before(async function () {
    await app.promiseStart;
});

after(async function () {
    await app.stop();
});


describe('Load the website page', function () {
    this.timeout('12s');
    const appUrl = 'http://localhost:9000';
    let nightmare = null;
    beforeEach(() => {
        nightmare = new Nightmare({
//            openDevTools: {
           //     mode: 'detach'
       //     },
            show: false,
	    frame: false,
            maxHeight:16384,
            maxWidth:16384,        
            width: 1200,
            height: 1024, 
	    waitTimeout: 12000,
	    gotoTimeout: 5000,
	    loadTimeout: 5000,
	    loadTimeout: 5000
      //      webPreferences: {
     //           partition: 'nopersist'
     //       }
        });
    });

    describe('/ hompage', () => {
        it('Make sure that we display the right number of cards', done => {
            var numberOfPublishCard = climbsData.climbs.filter(c => c.status === "publish").length;

            nightmare.goto(appUrl)
	    .wait('body span.scroll-down-link')
   	    .click('body span.scroll-down-link')
	    .wait('#cardHolder .card')
            .evaluate(function () {
                return document.querySelectorAll("#cardHolder .card").length;
            })
            .end()
            .then(function (displayedCards) {
                expect(numberOfPublishCard).to.equal(displayedCards);
                done()
            })
		.catch( e => {
		    console.error('Capturing this error:', e)
		    done(e)
		})
        });
        it('Make sure advanced filters open on click', done => {
    
            nightmare.goto(appUrl)
	    .wait('body span.scroll-down-link')
   	    .click('body span.scroll-down-link')
	    .wait('#cardHolder .card')
            .click('.filter-toggle')
            .evaluate(function () {
                return document.getElementById("advancedFilters").style.display;
            })
            .end()
            .then(function (filterState) {
                expect(filterState).to.equal('flex');
                done()
            })
		.catch( e => {
		    console.error('Capturing this error:', e)
		    done(e)
		})
        });
        it('Make sure the correct cards are removed when an advanced filter is un-checked', done => {
    
            nightmare.goto(appUrl)
	    .wait('body span.scroll-down-link')
   	    .click('body span.scroll-down-link')
	    .wait('#cardHolder .card')
            .click('#abseil')
            .evaluate(function () {
                return document.getElementById("12").style.display;
            })
            .end()
            .then(function (rocaGrisDisplay) {
                expect(rocaGrisDisplay).to.equal('none');
                done()
            })
            		.catch( e => {
		    console.error('Capturing this error:', e)
		    done(e)
		})

        });

        it('Make sure cards are favourited when clicked', done => {
            nightmare.goto(appUrl)
	    .wait('body span.scroll-down-link')
   	    .click('body span.scroll-down-link')
	    .wait('#cardHolder .card')
            .click('div[data-climb-id="25"] .climb-status')
            .click('div[data-climb-id="25"] .climb-status')
            .evaluate(function () {
                return document.getElementById("25Status").dataset.status;
            })
            .end()
            .then(function (status) {
                expect(status).to.equal('done');
                done()
            })
		.catch( e => {
		    console.error('Capturing this error:', e)
		  
		    done(e)
		})
        });

        it('Make that we can click a card and see a overlay', done => {
            var randomCard = climbsData.climbs[6];

            nightmare.goto(appUrl)
	    .screenshot('./test/screenshots/4.png')	
	    .wait('body span.scroll-down-link')
   	    .click('body span.scroll-down-link')
	    .screenshot('./test/screenshots/4-2.png')	
	    .wait('#cardHolder .card')
            .click('div[data-climb-id="' + randomCard.id + '"] a.open-tile')
            .evaluate(function () {
                return document.querySelector("#climbCardDetails .big-card-body h1").textContent.trim();
            })
            .end()
            .then(function (cliffAndRouteName) {
                expect(cliffAndRouteName.trim()).to.equal(randomCard.cliff + ' - ' + randomCard.routeName);
                done()
            })
        	.catch( e => {
		    console.error('Capturing this error:', e)
		    done(e)
		})    
        });

        it('Make sure the share buttons have the correct URL', done => {
            var randomCard = climbsData.climbs[1];
            nightmare.goto(appUrl)
	    .screenshot('./test/screenshots/5.png')	
	    .wait('body span.scroll-down-link')
   	    .click('body span.scroll-down-link')
	    .screenshot('./test/screenshots/5-2.png')	
	    .wait('#cardHolder .card')
            .click('div[data-climb-id="' + randomCard.id + '"] a.open-tile')
            .wait('#climbCardDetails')
            .evaluate(function () {
                return document.querySelector("#whatsappShare").href.split('/climbs/')[1].endsWith(window.location.href.split('/climbs/')[1]);
            })
            .end()
            .then(function (shareLink) {
                expect(shareLink).to.equal(true);
                done()
            })
            	.catch( e => {
		    console.error('Capturing this error:', e)
		    done(e)
		})

        });

        it('Make the dynamic topo images load', done => {
            nightmare.goto(appUrl)
	    .wait('body span.scroll-down-link')
   	    .click('body span.scroll-down-link')
	    .wait('#cardHolder .card')
            .click('div[data-climb-id="16"] a.open-tile')
            .wait('#climbCardDetails')
            .click('#c3')
            .wait('#canvas[data-success="true"]')
            .evaluate(function () {
                return document.querySelector("#canvas").dataset.success;
            })
            .end()
            .then(function (dataSuccess) {
                expect(dataSuccess).to.equal('true');
                done()
            })
            	.catch( e => {
		    console.error('Capturing this error:', e)
		    done(e)
		})
        });

        it('should not log any errors - on the main page', done => {
            const errors = [];

            nightmare
            .on('page', function (type, message, stack) {
                if (type === 'error') {
                    errors.push(message);
                }
            })
            .on('console', function (type, message) {
                if (type === 'error') {
                    errors.push(message);
                }
            })
            .goto(appUrl)
            .end()
            .then(_ => {
                expect(errors).to.have.lengthOf(0);
                done();
            })
            	.catch( e => {
		    console.error('Capturing this error:', e)
		    done(e)
		})
        });

    });
});
