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
    this.timeout('5s');
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

        it('Make sure that we can click a card and see a overlay', done => {
            var randomCard = climbs.climbsData.climbs[6];

            nightmare.goto(appUrl)
                .click('div[data-test="climbid-' + randomCard.id + '"] a.open-tile')
                .wait('#overlay .big-card')
                .evaluate(function () {
                    return document.querySelector("#overlay .card-body h4").textContent.trim();
                })
                .end()
                .then(function (cliffAndRouteName) {
                    expect(cliffAndRouteName.trim()).to.equal(randomCard.cliff + ' - ' + randomCard.routeName);
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

    describe("/ weather", () => {
        it('Make sure that we display the right number of pins', done => {
            var numberOfPublishCard = climbs.climbsData.climbs.filter(c => c.status === "publish").length;

            nightmare
                .goto(appUrl + "/map/weather.html")
                .wait(3000)
                .evaluate(function () {
                    return document.querySelectorAll(".leaflet-marker-icon").length;
                })
                .end()
                .then(function (displayedCards) {
                    expect(numberOfPublishCard).to.equal(displayedCards);
                    done()
                })
                .catch(done)
        });

    });

    describe("/ map", () => {
        it('Make sure that we display the right number of pins', done => {
            var numberOfPublishCard = climbs.climbsData.climbs.filter(c => c.status === "publish").length;

            nightmare
                .goto(appUrl + "/map")
                .wait(3000)
                .evaluate(function () {
                    return document.querySelectorAll(".leaflet-marker-icon").length;
                })
                .end()
                .then(function (displayedCards) {
                    expect(numberOfPublishCard).to.equal(displayedCards);
                    done()
                })
                .catch(done)
        });

    });
});
