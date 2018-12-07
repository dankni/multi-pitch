const Nightmare = require('nightmare');
const expect = require('chai').expect;
const climbs = require('../website/data/climbs.js');
const app = require('../server');


before(async function () {
    await app.promiseStart;
});

after(async function () {
    await app.stop();
});


describe('Load a Page', function () {
    // Recommended: 5s locally, 10s to remote server, 30s from airplane ¯\_(ツ)_/¯
    this.timeout('5s');

    let nightmare = null;
    beforeEach(() => {
        nightmare = new Nightmare()
    });

    describe('/ hompage', () => {
        it('Make sure that we display the right number of cards', done => {
            var numberOfPublishCard = climbs.climbsData.climbs.filter(c => c.status === "publish").length;

            nightmare.goto('http://localhost:9000')
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

            nightmare.goto('http://localhost:9000')
                .click('div[data-test="climbid-' + randomCard.id + '"] a.open-tile')
                .wait('#overlay .big-card')
                .evaluate(function () {
                    return document.querySelector("#overlay .card-body h4").textContent.trim();
                })
                .end()
                .then(function (cliffAndRouteName) {
                    console.log(cliffAndRouteName.trim(), randomCard.cliff + ' - ' + randomCard.routeName);
                    expect(cliffAndRouteName.trim()).to.equal(randomCard.cliff + ' - ' + randomCard.routeName);
                    done()
                })
                .catch(done)
        })
    })
});
