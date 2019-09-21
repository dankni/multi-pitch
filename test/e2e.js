const Nightmare = require('nightmare');
const expect = require('chai').expect;
const climbs = require('../website/data/data.js');
const app = require('../server');


before(async function () {
    await app.promiseStart;
});

after(async function () {
    await app.stop();
});


describe('Load the website page', function () {
    // Recommended: 5s locally, 10s to remote server, 30s from airplane ¯\_(ツ)_/¯
    this.timeout('12s');
    const appUrl = 'http://localhost:9000';
    let nightmare = null;
    beforeEach(() => {
        nightmare = new Nightmare({
            openDevTools: {
                mode: 'detach'
            },
            show: false,
            webPreferences: {
                partition: 'nopersist'
            }
        });
    });

    describe('/ hompage', () => {
        it('Make sure that we display the right number of cards', done => {
            var numberOfPublishCard = climbs.climbsData.climbs.filter(c => c.status === "publish").length;

            nightmare.goto(appUrl)
            .evaluate(function () {
                return document.querySelectorAll("#cardHolder .card").length;
            })
            .end()
            .then(function (displayedCards) {
                expect(numberOfPublishCard).to.equal(displayedCards);
                done()
            })
            .catch(done)
        });
        
        it('Make sure advanced filters open on click', done => {
    
            nightmare.goto(appUrl)
            .click('.filter-toggle')
            .evaluate(function () {
                return document.getElementById("advancedFilters").style.display;
            })
            .end()
            .then(function (filterState) {
                expect(filterState).to.equal('flex');
                done()
            })
            .catch(done)
        });

        it('Make sure the correct cards are removed when an advanced filter is un-checked', done => {
    
            nightmare.goto(appUrl)
            .click('#absail')
            .evaluate(function () {
                return document.getElementById("12").style.display;
            })
            .end()
            .then(function (rocaGrisDisplay) {
                expect(rocaGrisDisplay).to.equal('none');
                done()
            })
            .catch(done)
        });

        it('Make sure that we can click a card and see a overlay', done => {
            var randomCard = climbs.climbsData.climbs[6];

            nightmare.goto(appUrl)
            .click('div[data-test="climbid-' + randomCard.id + '"] a.open-tile')
            .wait('#climbCardDetails')
            .evaluate(function () {
                return document.querySelector("#climbCardDetails .big-card-body h1").textContent.trim();
            })
            .end()
            .then(function (cliffAndRouteName) {
                expect(cliffAndRouteName.trim()).to.equal(randomCard.cliff + ' - ' + randomCard.routeName);
                done()
            })
            .catch(done)
        });

        it('Make sure the share buttons have the correct URL', done => {
            var randomCard = climbs.climbsData.climbs[1];

            nightmare.goto(appUrl)
            .click('div[data-test="climbid-' + randomCard.id + '"] a.open-tile')
            .wait('#climbCardDetails')
            .evaluate(function () {
                return document.querySelector("#whatsappShare").href.split('/climbs/')[1].endsWith(window.location.href.split('/climbs/')[1]);
            })
            .end()
            .then(function (shareLink) {
                expect(shareLink).to.equal(true);
                done()
            })
            .catch(done)

        });

        it('Make the dynamic topo images load', done => {
            // Note this is nore really a true test as it only checks the canvas is toggled.
            // However the next test should pick up any errors so is acctually the real test of this feature

            nightmare.goto(appUrl)
            .click('div[data-test="climbid-16"] a.open-tile')
            .wait('#climbCardDetails')
            .click('#c3')
            .wait(500)
            .evaluate(function () {
                return document.querySelector("#canvas").style.display;
            })
            .end()
            .then(function (canvasStyle) {
                expect(canvasStyle).to.equal('block');
                done()
            })
            .catch(done)

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
            .catch(done)
        });

    });
});
