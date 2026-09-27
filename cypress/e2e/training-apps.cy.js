// The three training apps that share the two tap confirm in
// website/training/common/functions.js, plus the lap timer's own clock handling.
//
// Every test freezes the clock with cy.clock() before the page loads, so elapsed
// time is driven by cy.tick() rather than by how long the test takes to run.
describe('Training apps', function () {
    const appUrl = 'localhost:9000';
    const sessionDate = new Date(2026, 8, 13, 12, 0, 0); // midday, so the UTC date the apps log matches

    // Analytics is loaded by common/functions.js on every one of these pages.
    // Stubbing it keeps the run off the network and out of the frozen clock's way.
    function stubAnalytics() {
        cy.intercept({ hostname: 'www.googletagmanager.com' }, { statusCode: 204, body: '' });
    }

    // The apps register a service worker, which would serve these specs a cached
    // copy of the last run's files. A no-op register keeps every visit on the
    // real files without the apps having to know they are being tested.
    Cypress.on('window:before:load', (win) => {
        Object.defineProperty(win.navigator, 'serviceWorker', {
            value: { register: () => Promise.resolve(), getRegistrations: () => Promise.resolve([]) },
            configurable: true
        });
    });

    beforeEach(() => {
        cy.clearLocalStorage();
        stubAnalytics();
        cy.clock(sessionDate.getTime());
    });

    describe('Lap timer', function () {
        const timerUrl = appUrl + '/training/timer/';

        // Start the clock and put `laps` laps on it, one every ten seconds
        function runSession(laps) {
            cy.get('#primaryButton').click();
            for (let i = 0; i < laps; i++) {
                cy.tick(10000);
                cy.get('#lapButton').click();
            }
        }

        it('starts at zero with nothing but START on offer', () => {
            cy.visit(timerUrl);
            cy.get('#elapsed').should('have.text', '0:00:00');
            cy.get('#lapCount').should('have.text', '0');
            cy.get('#primaryButton').should('contain', 'START');
            cy.get('#lapButton').should('not.be.visible');
            cy.get('#resetButton').should('not.be.visible');
            cy.get('#finishButton').should('not.be.visible');
        });

        it('shows lap and finish together once a session is under way', () => {
            cy.visit(timerUrl);
            cy.get('#primaryButton').click();
            cy.get('#lapButton').should('be.visible').and('not.be.disabled');
            cy.get('#finishButton').should('be.visible').and('not.be.disabled');
            cy.get('#finishButton').click();
            // the save panel greys finish out, but LAP must not slide into its column
            cy.get('#finishButton').should('be.visible').and('be.disabled');
            cy.get('#lapButton').should('be.visible');
            cy.get('#saveSession').click();
            cy.get('#lapButton').should('not.be.visible');
            cy.get('#finishButton').should('not.be.visible');
        });

        it('counts time once started', () => {
            cy.visit(timerUrl);
            cy.get('#primaryButton').click();
            cy.get('#primaryButton').should('contain', 'PAUSE');
            cy.get('#lapButton').should('not.be.disabled');
            cy.tick(65000);
            cy.get('#elapsed').should('have.text', '0:01:05');
        });

        it('counts a lap on every tap and nothing else', () => {
            cy.visit(timerUrl);
            runSession(3);
            cy.get('#lapCount').should('have.text', '3');
            cy.get('#elapsed').should('have.text', '0:00:30');
        });

        it('ignores the lap button while paused', () => {
            cy.visit(timerUrl);
            runSession(1);
            cy.get('#primaryButton').click(); // PAUSE
            cy.get('#lapButton').should('be.disabled');
            cy.get('#lapButton').click({ force: true });
            cy.get('#lapCount').should('have.text', '1');
        });

        it('leaves paused time off the clock', () => {
            cy.visit(timerUrl);
            cy.get('#primaryButton').click();
            cy.tick(5000);
            cy.get('#primaryButton').click(); // PAUSE
            cy.tick(600000);                  // ten minutes stood around
            cy.get('#elapsed').should('have.text', '0:00:05');
            cy.get('#primaryButton').should('contain', 'RESUME').click();
            cy.tick(5000);
            cy.get('#elapsed').should('have.text', '0:00:10');
        });

        it('rolls over into hours', () => {
            cy.visit(timerUrl);
            cy.get('#primaryButton').click();
            cy.tick(3725000); // 1h 2m 5s
            cy.get('#elapsed').should('have.text', '1:02:05');
        });

        it('picks the session back up after a reload', () => {
            cy.visit(timerUrl);
            runSession(2);
            cy.reload();
            // a reload re-installs the frozen clock back at sessionDate; put it where
            // the wall clock would really be (20s in), then let the ticker redraw
            cy.clock().then((clock) => clock.setSystemTime(sessionDate.getTime() + 20000));
            cy.tick(1000);
            cy.get('#lapCount').should('have.text', '2');
            cy.get('#elapsed').should('have.text', '0:00:21'); // and it kept counting
            cy.get('#primaryButton').should('contain', 'PAUSE'); // still running
        });

        it('only offers reset while the clock is stopped', () => {
            cy.visit(timerUrl);
            runSession(1);
            cy.get('#resetButton').should('not.be.visible');
            cy.get('#primaryButton').click(); // PAUSE
            cy.get('#resetButton').should('be.visible');
            cy.get('#primaryButton').click(); // RESUME
            cy.get('#resetButton').should('not.be.visible');
        });

        it('keeps the session on the first reset tap and clears it on the second', () => {
            cy.visit(timerUrl);
            runSession(2);
            cy.get('#primaryButton').click(); // PAUSE
            cy.get('#resetButton').click();
            cy.get('#resetButton').should('contain', 'SURE?');
            cy.get('#lapCount').should('have.text', '2');
            cy.get('#elapsed').should('have.text', '0:00:20');
            cy.get('#resetButton').click();
            cy.get('#lapCount').should('have.text', '0');
            cy.get('#elapsed').should('have.text', '0:00:00');
            cy.get('#primaryButton').should('contain', 'START');
        });

        it('disarms reset after a few seconds without a second tap', () => {
            cy.visit(timerUrl);
            runSession(1);
            cy.get('#primaryButton').click(); // PAUSE
            cy.get('#resetButton').click();
            cy.get('#resetButton').should('contain', 'SURE?');
            cy.tick(4000);
            cy.get('#resetButton').should('contain', 'RESET');
            cy.get('#lapCount').should('have.text', '1'); // still there
        });

        it('disarms reset when the clock is started again', () => {
            cy.visit(timerUrl);
            runSession(1);
            cy.get('#primaryButton').click(); // PAUSE
            cy.get('#resetButton').click();
            cy.get('#resetButton').should('contain', 'SURE?');
            cy.get('#primaryButton').click(); // RESUME rather than confirming
            cy.get('#primaryButton').click(); // PAUSE again
            cy.get('#resetButton').should('contain', 'RESET'); // not one tap from wiping the session
            cy.get('#lapCount').should('have.text', '1');
        });

        it('saves a finished session to the log', () => {
            cy.visit(timerUrl);
            runSession(4);
            cy.get('#finishButton').click();
            cy.get('#star4').click();
            cy.get('#saveSession').click();
            cy.get('#about').should('be.visible');
            // stored as yyyy-mm-dd, listed as "13 Sep" with "2026" on the line below
            cy.get('#log').should('contain', '13 Sep').and('contain', '2026')
                .and('contain', '4 laps').and('contain', '0:00:40');
            cy.get('#stats').should('contain', '1 session').and('contain', '4 laps');
            cy.get('#log .icon-star.active').should('have.length', 4);
            // the app is back to a clean slate ready for the next session
            cy.get('#elapsed').should('have.text', '0:00:00');
            cy.get('#lapCount').should('have.text', '0');
        });

        it('adds a missing session through the usual save panel', () => {
            cy.visit(timerUrl);
            cy.get('.icon-info').click();
            cy.get('#addMissingLink').click();
            cy.get('#about').should('not.be.visible');
            cy.get('#missingDate').should('have.value', '2026-09-13').clear().type('2026-09-10');
            cy.get('#missingMinutes').clear().type('65');
            cy.get('#missingLaps').clear().type('12');
            cy.get('#elapsed').should('have.text', '1:05:00');
            cy.get('#lapCount').should('have.text', '12');
            cy.get('#star3').click();
            cy.get('#sessionComment').type('forgot to press start');
            cy.get('#saveSession').click();
            cy.get('#log').should('contain', '10 Sep').and('contain', '12 laps').and('contain', '1:05:00');
            cy.get('#log .icon-star.active').should('have.length', 3);
            cy.get('#missingDiv').should('not.be.visible');
            cy.get('#elapsed').should('have.text', '0:00:00');
        });

        it('only offers a missing session while nothing else is under way', () => {
            cy.visit(timerUrl);
            runSession(1);
            cy.get('.icon-info').click();
            cy.get('#addMissingLink').should('not.be.visible');
        });

        it('deletes a logged session once the delete is confirmed', () => {
            cy.visit(timerUrl);
            runSession(1);
            cy.get('#finishButton').click();
            cy.get('#saveSession').click();
            cy.get('#log .icon-trash').click();
            cy.get('#log .icon-ok').click();
            cy.get('#log').should('contain', 'No sessions saved yet');
        });
    });

    describe('Gilford tick list', function () {
        const gilfordUrl = appUrl + '/training/gilford/';

        it('ticks climbs and counts them', () => {
            cy.visit(gilfordUrl);
            cy.get('#primaryButton').click();
            cy.get('#route7').click();
            cy.get('#route12').click();
            cy.get('#tickCount').should('have.text', '2');
            cy.get('#route7').should('have.attr', 'aria-pressed', 'true');
            cy.get('#summary').should('contain', '7a'); // route 12 is the hardest ticked
        });

        it('discards a session with nothing ticked on the first tap', () => {
            cy.visit(gilfordUrl);
            cy.get('#primaryButton').click();
            cy.get('#discard').click();
            cy.get('#sessionHolder').should('not.be.visible');
            cy.get('#primaryButton').should('be.visible');
        });

        it('keeps the ticks on the first discard tap and drops them on the second', () => {
            cy.visit(gilfordUrl);
            cy.get('#primaryButton').click();
            cy.get('#route7').click();
            cy.get('#route12').click();
            cy.get('#discard').click();
            cy.get('#discard').should('contain', 'SURE?');
            cy.get('#tickCount').should('have.text', '2');
            cy.get('#sessionHolder').should('be.visible');
            cy.get('#discard').click();
            cy.get('#sessionHolder').should('not.be.visible');
        });

        it('puts DISCARD back rather than RESET when it disarms', () => {
            cy.visit(gilfordUrl);
            cy.get('#primaryButton').click();
            cy.get('#route7').click();
            cy.get('#discard').click();
            cy.get('#discard').should('contain', 'SURE?');
            cy.tick(4000);
            cy.get('#discard').should('contain', 'DISCARD').and('not.contain', 'RESET');
            cy.get('#tickCount').should('have.text', '1');
        });

        it('says something when the three sevens go up', () => {
            cy.visit(gilfordUrl);
            cy.get('#primaryButton').click();
            cy.get('#route12').click();   // 7a
            cy.get('#route15').click();   // 7a+
            cy.tick(100);
            cy.get('.toast').should('not.exist');
            cy.get('#route18').click();   // 7b, and that is the set
            cy.tick(100);
            cy.get('.toast').should('be.visible').and('contain', "Nice work ticking the 7's");
        });

        it('says something bigger when the whole wall goes up', () => {
            cy.visit(gilfordUrl);
            cy.get('#primaryButton').click();
            for(let id = 1; id <= 24; id++){ cy.get('#route' + id).click(); }
            cy.tick(100);
            cy.get('#tickCount').should('have.text', '24');
            // the sevens went up on the way, but the last tick is the wall
            cy.get('.toast').should('be.visible')
                .and('contain', 'Amazing! you ticked them all');
        });

        it('saves a session and reopens it for editing', () => {
            cy.visit(gilfordUrl);
            cy.get('#primaryButton').click();
            cy.get('#route7').click();
            cy.get('#finishButton').click();
            cy.get('#star3').click();
            cy.get('#saveSession').click();
            cy.get('#log').should('contain', '1 climb');
            cy.get('#log .icon-wrench').click();
            cy.get('#route7').should('have.attr', 'aria-pressed', 'true');
            cy.get('#saveSession').should('have.text', 'UPDATE SESSION');
            // the reopened session must not arrive with a stale SURE? on the button
            cy.get('#discard').should('contain', 'DISCARD');
        });
    });

    describe('Loft climb tracker', function () {
        const loftUrl = appUrl + '/training/loft/';

        // The app builds a SpeechRecognition on load. Stubbing it keeps the test
        // off the microphone and off the network, whichever browser this runs in.
        function visitLoft() {
            cy.visit(loftUrl, {
                onBeforeLoad(win) {
                    win.webkitSpeechRecognition = function () {
                        this.start = () => {};
                        this.abort = () => {};
                    };
                    win.SpeechRecognition = win.webkitSpeechRecognition;
                }
            });
        }

        // START runs a spoken "three, two, one" before the clock begins. Each word
        // waits on the voice, falling back to a one second timeout if the speech
        // engine never reports a start, so the count-in is ticked out generously
        // rather than assuming which of those two paths this browser takes.
        function startAndCountIn() {
            cy.get('#primaryButton').click();
            cy.tick(8000); // the countdown, however slowly it gets through
            cy.tick(2000); // and some time on the clock
        }

        it('only offers reset while the session is paused', () => {
            visitLoft();
            startAndCountIn();
            cy.get('#reset').should('not.be.visible');
            cy.get('#primaryButton').click(); // PAUSE
            cy.get('#reset').should('be.visible');
        });

        it('keeps the session on the first reset tap and clears it on the second', () => {
            visitLoft();
            startAndCountIn();
            cy.get('#elapsed').should('not.have.text', '0:00:00');
            cy.get('#primaryButton').click(); // PAUSE
            cy.get('#reset').click();
            cy.get('#reset').should('contain', 'SURE?');
            cy.get('#elapsed').should('not.have.text', '0:00:00'); // nothing lost yet
            cy.get('#reset').click();
            cy.get('#elapsed').should('have.text', '0:00:00');
            cy.get('#moves').should('have.text', '0');
            cy.get('#primaryButton').should('contain', 'START');
        });

        it('disarms reset after a few seconds without a second tap', () => {
            visitLoft();
            startAndCountIn();
            cy.get('#primaryButton').click(); // PAUSE
            cy.get('#reset').click();
            cy.get('#reset').should('contain', 'SURE?');
            cy.tick(4000);
            cy.get('#reset').should('contain', 'RESET');
            cy.get('#elapsed').should('not.have.text', '0:00:00');
        });
    });

    describe('Bouldering session', function () {
        const boulderUrl = appUrl + '/training/boulder/';

        it('counts the boulders and names the hardest', () => {
            cy.visit(boulderUrl);
            cy.get('#primaryButton').click();
            cy.get('#row-V3 .grade-add').click();
            cy.get('#row-V3 .grade-add').click();
            cy.get('#row-V7 .grade-add').click();
            cy.get('#climbCount').should('have.text', '3');
            cy.get('#summary').should('contain', 'V7');
            cy.get('#row-V3 .grade-count').should('have.text', '2');
        });

        it('takes one back with the minus beside the grade', () => {
            cy.visit(boulderUrl);
            cy.get('#primaryButton').click();
            // nothing climbed at that grade, so there is nothing to take back
            cy.get('#row-V4 .grade-minus').should('be.disabled');
            cy.get('#row-V4 .grade-add').click();
            cy.get('#row-V4 .grade-minus').click();
            cy.get('#climbCount').should('have.text', '0');
            cy.get('#row-V4 .grade-minus').should('be.disabled');
        });

        // the wall labels its problems in one system and the climber often thinks
        // in another, so the tiles have to be able to swap over
        it('renames the grades when the system is changed', () => {
            cy.visit(boulderUrl);
            cy.get('#primaryButton').click();
            cy.get('#row-V3 .route-grade').should('have.text', 'V3');
            cy.get('#system-font').check({ force: true });
            cy.get('#row-V3 .route-grade').should('have.text', 'f6A');
            cy.get('#row-V3 .route-colour').should('contain', 'V3');
            cy.get('#system-british').check({ force: true });
            cy.get('#row-V3 .route-grade').should('have.text', '5a');
        });

        // A session starts at V10; the ladder goes to V17, which is the hardest boulder
        // anyone has climbed, and then it stops having a straight answer
        it('adds a harder grade, and stops at V17', () => {
            cy.visit(boulderUrl);
            cy.get('#primaryButton').click();
            cy.get('#row-V10').should('exist');
            cy.get('#row-V11').should('not.exist');
            cy.get('.grade-harder').click();
            cy.get('#row-V11').should('exist');
            cy.get('#row-V12').should('not.exist');
            for(let i = 0; i < 6; i++){ cy.get('.grade-harder').click(); }
            cy.get('#row-V17').should('exist');
            cy.get('.grade-harder').click();
            cy.tick(100);   // the toast fades in on a timer, and the clock is frozen
            cy.get('.toast').should('be.visible').and('contain', 'You wish! Less clicking more climbing');
            cy.get('#row-V18').should('not.exist');
            // the cross is there for someone who wants it gone now
            cy.get('.toast .toast-close').click();
            cy.get('.toast').should('not.be.visible');
            // and it goes away on its own as well
            cy.get('.grade-harder').click();
            cy.tick(100);
            cy.get('.toast').should('be.visible');
            cy.tick(6000);   // a toast lives 5.2 seconds
            cy.get('.toast').should('not.be.visible');
        });

        it('starts the next session back at V10', () => {
            cy.visit(boulderUrl);
            cy.get('#primaryButton').click();
            cy.get('.grade-harder').click();
            cy.get('#row-V11').should('exist');
            cy.get('#discard').click();   // nothing climbed, so one tap is enough
            cy.get('#primaryButton').click();
            cy.get('#row-V11').should('not.exist');
        });

        // an old session with an 8A on it has to be editable, ladder or no ladder
        it('logs sport climbs on a ladder of their own', () => {
            cy.visit(boulderUrl);
            cy.get('#primaryButton').click();
            cy.get('#row-V3 .grade-add').click();
            cy.get('label[for="tab-sport"]').click();
            // 4, 4+, 5, 5+, then whole grades from 6a, as far as 7c to start with
            cy.get('#grades .route-grade').then(($grades) => {
                expect([...$grades].map((grade) => grade.textContent))
                    .to.deep.equal(['4', '4+', '5', '5+', '6a', '6b', '6c', '7a', '7b', '7c']);
            });
            cy.get('#row-6b .grade-add').click();
            cy.get('#row-6b .grade-add').click();
            cy.get('#climbCount').should('have.text', '2');
            cy.get('#countNoun').should('have.text', 'sport climbs');
            cy.get('#summary').should('have.text', 'Hardest: 6b · 1 boulder');
            // the boulder is still there on the other ladder
            cy.get('label[for="tab-boulder"]').click();
            cy.get('#row-V3 .grade-count').should('have.text', '1');
            cy.get('#summary').should('have.text', 'Hardest: V3 · 2 sport climbs');
        });

        it('adds harder sport grades as far as 9c', () => {
            cy.visit(boulderUrl);
            cy.get('#primaryButton').click();
            cy.get('label[for="tab-sport"]').click();
            cy.get('#row-8a').should('not.exist');
            for(let i = 0; i < 6; i++){ cy.get('.grade-harder').click(); }
            cy.get('#row-9c').should('exist');
            cy.get('.grade-harder').click();
            cy.tick(100);   // the toast fades in on a timer, and the clock is frozen
            cy.get('.toast').should('be.visible').and('contain', 'You wish! Less clicking more climbing');
        });

        it('saves the sport climbs with the boulders and reopens them', () => {
            cy.visit(boulderUrl);
            cy.get('#primaryButton').click();
            cy.get('#row-V3 .grade-add').click();
            cy.get('label[for="tab-sport"]').click();
            cy.get('#row-6b .grade-add').click();
            cy.get('#row-7a .grade-add').click();
            cy.get('#finishButton').click();
            cy.get('#saveSession').click();
            cy.get('#log').should('contain', '1 boulder, 2 sport climbs').and('contain', 'hardest V3 · 7a');
            cy.window().then((win) => {
                let saved = JSON.parse(win.localStorage.getItem('boulderLog'))[0];
                expect(saved.climbs).to.deep.equal(['V3']);
                expect(saved.sport).to.deep.equal(['6b', '7a']);
            });
            cy.get('#log .icon-wrench').click();
            cy.get('#row-V3 .grade-count').should('have.text', '1');
            cy.get('label[for="tab-sport"]').click();
            cy.get('#row-7a .grade-count').should('have.text', '1');
        });

        it('opens a saved session far enough up the ladder to show it', () => {
            cy.visit(boulderUrl);
            cy.get('#primaryButton').click();
            cy.get('.grade-harder').click();
            cy.get('.grade-harder').click();
            cy.get('#row-V12 .grade-add').click();
            cy.get('#finishButton').click();
            cy.get('#saveSession').click();
            cy.get('#log .icon-wrench').click();
            cy.get('#row-V12 .grade-count').should('have.text', '1');
            cy.get('#row-V13').should('not.exist');
        });

        it('saves a session with a note and reopens it for editing', () => {
            cy.visit(boulderUrl);
            cy.get('#primaryButton').click();
            cy.get('#row-V2 .grade-add').click();
            cy.get('#finishButton').click();
            cy.get('#star4').click();
            cy.get('#sessionComment').type('Slabby.');
            cy.get('#saveSession').click();
            cy.get('#log').should('contain', '1 boulder').and('contain', 'hardest V2');
            // big enough to hit with a thumb, not just the 13px glyph
            ['.icon-note', '.icon-wrench', '.icon-trash'].forEach((icon) => {
                cy.get('#log ' + icon).then(($icon) => {
                    const box = $icon[0].getBoundingClientRect();
                    expect(box.width).to.be.at.least(30);
                    expect(box.height).to.be.at.least(36);
                });
            });
            cy.get('#log .icon-note').click();
            cy.get('.comment-pop').should('contain', 'Slabby.');
            cy.get('#log .icon-wrench').click();
            cy.get('#climbCount').should('have.text', '1');
            cy.get('#sessionComment').should('have.value', 'Slabby.');
            cy.get('#saveSession').should('have.text', 'UPDATE SESSION');
        });
    });

    describe('Endurance', function () {
        const enduranceUrl = appUrl + '/training/endurance/';

        // tap every climb on screen; the list redraws on each tap, so by position
        function tickAll(count) {
            for (let i = 0; i < count; i++) {
                cy.get('#climbs button').eq(i).click();
            }
        }

        it('saves the grade of every climb for the overview charts', () => {
            cy.visit(enduranceUrl);
            cy.get('#primaryButton').click();
            tickAll(4);                          // the warm up
            for (let set = 0; set < 3; set++) {
                cy.get('#skipRest').click();
                tickAll(4);                      // an endurance set is four laps
            }
            cy.get('#finishButton').click();
            cy.get('#saveSession').click();
            cy.window().then((win) => {
                const saved = JSON.parse(win.localStorage.getItem('enduranceLog'))[0];
                expect(saved.climbs).to.equal(16);
                expect(saved.grades).to.have.length(16);
                saved.grades.forEach((grade) => expect(grade).to.match(/^[4-7][abc]?\+?$/));
            });
        });
    });

    describe('Trad climbing', function () {
        const tradUrl = appUrl + '/training/trad/';

        it('counts the climbs and names the hardest', () => {
            cy.visit(tradUrl);
            cy.get('#primaryButton').click();
            cy.get('#row-HS .grade-add').click();
            cy.get('#row-E1 .grade-add').click();
            cy.get('#row-HS .grade-add').click();
            cy.get('#climbCount').should('have.text', '3');
            cy.get('#summary').should('have.text', 'Hardest: E1');
            cy.get('#row-HS .grade-count').should('have.text', '2');
            cy.get('#row-HS .grade-minus').click();
            cy.get('#climbCount').should('have.text', '2');
        });

        it('shows the grades in UIAA when asked', () => {
            cy.visit(tradUrl);
            cy.get('#primaryButton').click();
            cy.get('#row-VS .route-grade').should('have.text', 'VS');
            cy.get('#row-VS .route-colour').should('have.text', 'V');
            cy.get('#system-uiaa').check({ force: true });
            cy.get('#row-VS .route-grade').should('have.text', 'V');
            cy.get('#row-VS .route-colour').should('have.text', 'VS');
        });

        it('starts at M to E3 and adds harder grades as far as E11', () => {
            cy.visit(tradUrl);
            cy.get('#primaryButton').click();
            cy.get('#row-M').should('exist');
            cy.get('#row-E3').should('exist');
            cy.get('#row-E4').should('not.exist');
            for(let i = 0; i < 8; i++){ cy.get('.grade-harder').click(); }
            cy.get('#row-E11').should('exist');
            cy.get('.grade-harder').click();
            cy.tick(100);   // the toast fades in on a timer, and the clock is frozen
            cy.get('.toast').should('be.visible').and('contain', 'You wish! Less clicking more climbing');
        });

        it('saves whether the day is on UKC too, and reopens with it', () => {
            cy.visit(tradUrl);
            cy.get('#primaryButton').click();
            cy.get('#row-E1 .grade-add').click();
            cy.get('#alsoOnUkc').click();
            cy.get('#finishButton').click();
            cy.get('#saveSession').click();
            cy.get('#log').should('contain', '1 trad climb').and('contain', 'hardest E1 · UKC data ignored');
            cy.window().then((win) => {
                let saved = JSON.parse(win.localStorage.getItem('tradLog'))[0];
                expect(saved.climbs).to.deep.equal(['E1']);
                expect(saved.ukc).to.equal(true);
            });
            cy.get('#log .icon-wrench').click();
            cy.get('#alsoOnUkc').should('be.checked');
        });

        it('opens straight on the UKC import from the link on the overview', () => {
            cy.visit(tradUrl + '#ukc');
            cy.get('#about').should('be.visible');
            cy.location('hash').should('equal', '');
        });

        it('lists the UKC trad days, less any it has logged itself as on UKC too', () => {
            cy.visit(tradUrl, {
                onBeforeLoad(win) {
                    win.localStorage.setItem('ukcLogbook', JSON.stringify({ imported: '2026-09-13', leftOut: 0, climbs: [
                        { date: '2026-08-31', grade: 'HS', type: 'trad', name: 'Goin Back', crag: 'Moorhill Quarry', notes: 'Pumpy' },
                        { date: '2026-08-06', grade: 'E1', type: 'trad', name: 'No Alibi', crag: 'Moorhill Quarry', notes: '' },
                        { date: '2026-01-26', grade: '4+', type: 'sport', name: 'Scorpion', crag: 'Echo Valley', notes: '' }
                    ] }));
                    win.localStorage.setItem('tradLog', JSON.stringify(
                        [{ id: 1, date: '2026-08-06', climbs: ['E1'], ukc: true, rating: 0 }]));
                }
            });
            cy.get('.icon-info').click();
            cy.get('#ukcSummary').should('have.text', 'Imported 13 Sep 2026 · 1 day, 1 trad climb, in the activity log below.');
            // in the activity log with the app's own session: the sport climb, and
            // UKC's copy of the day logged here, are left out
            cy.get('#log tbody tr').should('have.length', 2);
            cy.get('#log tbody tr').first()
                .should('contain', '31 Aug').and('contain', '1 trad climb')
                .and('contain', 'hardest Goin Back (HS) · Moorhill Quarry · from UKC');
            // read only: edited in UKC, so no wrench and no bin - and no stars,
            // since UKC exports no rating
            cy.get('#log tbody tr').first().find('.icon-wrench, .icon-trash, .icon-star').should('not.exist');
            cy.get('#log tbody tr').first().find('.icon-note').click();
            cy.get('.comment-pop').should('contain', 'Goin Back: Pumpy');
            cy.get('.comment-pop-stars').should('not.exist');
            // the app's own session keeps both
            cy.get('#log tbody tr').eq(1).should('contain', '6 Aug').and('contain', 'UKC data ignored')
                .find('.icon-wrench').should('exist');
        });

        it('imports a UKC logbook from its info panel', () => {
            cy.visit(tradUrl);
            cy.get('#ukcFile').selectFile({ contents: Cypress.Buffer.from([
                'Name,Grade,Style,Partner(empty),Notes,Date,Crag,County,Region,Country,Pitches,Type',
                '"Goin Back","HS 4b","Lead O/S",,,31/Aug/26,"Moorhill Quarry","Co. Down","Northern Ireland","Northern Ireland",1,Trad'
            ].join('\r\n')), fileName: 'dankni_Logbook_DLOG.csv' }, { force: true });
            cy.window().its('localStorage').invoke('getItem', 'ukcLogbook').should('contain', 'Goin Back');
        });
    });

    describe('One app', function () {
        const pages = ['/training/', '/training/progress/', '/training/rings/', '/training/timer/',
            '/training/gilford/', '/training/boulder/', '/training/endurance/', '/training/loft/', '/training/trad/'];

        it('installs as a single app covering every page', () => {
            cy.request(appUrl + '/training/manifest.json').its('body').should((manifest) => {
                expect(manifest.scope).to.equal('/training/');
                expect(manifest.start_url).to.equal('/training/');
                expect(manifest.display).to.equal('standalone');
            });
        });

        it('opens the overview info panel with the shared functions, and closes it on Escape', () => {
            cy.visit(appUrl + '/training/');
            cy.get('nav .icon-info').click();
            cy.get('#about').should('be.visible');
            cy.get('body').type('{esc}');
            cy.get('#about').should('not.be.visible');
            // and no cog hint on a page with no settings to point at
            cy.get('#cogHint').should('not.exist');
        });

        pages.forEach((page) => {
            it('gives ' + page + ' the shared manifest and a full screen button', () => {
                cy.visit(appUrl + page);
                cy.get('link[rel="manifest"]').should('have.attr', 'href', '/training/manifest.json');
                cy.get('meta[name="apple-mobile-web-app-title"]').should('have.attr', 'content', 'Training');
                cy.get('#fullscreen').should('be.visible').and('have.class', 'icon-resize-full');
            });
        });
    });

    describe('Bottom navigation', function () {
        it('leaves the app button empty until an app has been opened', () => {
            cy.visit(appUrl + '/training/');
            cy.get('.bottom-nav .bottom-nav-item').should('have.length', 3);
            // the overview is where you are, so Apps is not a link
            cy.get('.bottom-nav .bottom-nav-item').first().should('contain', 'Apps')
                .and('have.attr', 'aria-current', 'page').and('not.have.attr', 'href');
            cy.get('.bottom-nav a').first().should('contain', 'Progress').and('have.attr', 'href', '/training/progress/');
            cy.get('.bottom-nav .bottom-nav-item').eq(2).should('have.class', 'empty');
        });

        it('marks Progress as the page you are on', () => {
            cy.visit(appUrl + '/training/progress/');
            cy.get('.bottom-nav .bottom-nav-item').eq(1).should('contain', 'Progress')
                .and('have.attr', 'aria-current', 'page');
            cy.get('.bottom-nav a').first().should('contain', 'Apps').and('have.attr', 'href', '/training/');
        });

        it('shows the app you are in, and links back to it from elsewhere', () => {
            cy.visit(appUrl + '/training/timer/');
            // where you are, not a link
            cy.get('.bottom-nav .bottom-nav-item').eq(2).should('have.class', 'current')
                .and('contain', 'Circuit').and('not.have.attr', 'href');
            cy.get('.bottom-nav a').first().should('have.attr', 'href', '/training/');
            cy.visit(appUrl + '/training/');
            cy.get('.bottom-nav .bottom-nav-item').eq(2).should('contain', 'Circuit')
                .and('have.attr', 'href', '/training/timer/');
            // and following it gets there
            cy.get('.bottom-nav .bottom-nav-item').eq(2).click();
            cy.location('pathname').should('equal', '/training/timer/');
        });
    });

    describe('Progress and sessions', function () {
        const overviewUrl = appUrl + '/training/';
        const progressUrl = appUrl + '/training/progress/';

        // The clock is frozen at 13 Sep 2026, so the last 7 days are 7-13 Sep and
        // the 7 before are 31 Aug - 6 Sep.
        const logs = {
            boulderLog: [
                { id: 1, date: '2026-09-13', climbs: ['V2', 'V5', 'V10'], rating: 3 },
                { id: 2, date: '2026-09-03', climbs: ['V3'], rating: 2 },
                { id: 3, date: '2026-07-01', climbs: ['V1'], rating: 1 }
            ],
            gilfordLog: [
                { id: 4, date: '2026-09-12', climbs: [1, 3, 12], rating: 4 }      // 4, 6b, 7a
            ],
            enduranceLog: [
                { id: 5, date: '2026-09-10', style: 'endurance', maxGrade: '7a', sets: 1, climbs: 3,
                  grades: ['6a', '6b', '8a'], rating: 3 },
                { id: 6, date: '2026-08-01', style: 'power', maxGrade: '7a', sets: 3, climbs: 10, rating: 3 }
            ]
        };

        function visitWith(seed) {
            cy.visit(progressUrl, {
                onBeforeLoad(win) {
                    Object.keys(seed).forEach((key) => win.localStorage.setItem(key, JSON.stringify(seed[key])));
                }
            });
        }

        function labels(chart) {
            return cy.get(chart + ' .label').then(($labels) => [...$labels].map((label) => label.textContent));
        }

        it('says there is nothing to chart with nothing logged', () => {
            cy.visit(progressUrl);
            cy.get('#performance').should('not.be.visible');
            cy.get('#progressEmpty').should('be.visible');
        });

        it('says the same when nothing graded has been logged', () => {
            visitWith({ lapTimerLog: [{ id: 1, date: '2026-09-13', laps: 4, total: 60000, rating: 0 }] });
            cy.get('#performance').should('not.be.visible');
            cy.get('#progressEmpty').should('be.visible');
            // the session is still listed, under where the charts would be
            cy.get('#sessions').should('be.visible');
        });

        it('draws both grade charts over the last year by default', () => {
            visitWith(logs);
            cy.get('#performance').should('be.visible');
            cy.get('#progressEmpty').should('not.be.visible');
            cy.get('#range-365').should('be.checked');
            cy.get('#performance svg').should('have.length', 2);
            // nothing in the year before, so no line on any bar
            cy.get('#performance line.before').should('not.exist');
            // the grade colours need no key - the grade is under every column - so
            // the only thing in the key is the line for the year before
            cy.get('#boulderChart .legend').should('have.text', 'The year before');
            cy.get('#sportChart .legend .legend-item').should('have.length', 1);
        });

        it('shows everything over all time', () => {
            visitWith(logs);
            cy.get('label[for="range-all"]').click();
            cy.get('#boulderTotal').should('have.text', '5 boulders in all');
            cy.get('#boulderChart .legend').should('not.exist');
        });

        it('always shows V0 to V8 and carries on up to the hardest boulder', () => {
            visitWith(logs);
            labels('#boulderChart').should('deep.equal',
                ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10']);
            cy.get('#boulderTotal').should('have.text', '5 boulders in the last year, 0 in the year before');
        });

        it('stops the boulder chart at V8 when nothing harder is logged', () => {
            visitWith({ boulderLog: [{ id: 1, date: '2026-09-13', climbs: ['V1', 'V4'], rating: 0 }] });
            labels('#boulderChart').should('deep.equal',
                ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8']);
            cy.get('#sportChart').should('contain', 'No climbs in the last year or the year before.');
        });

        it('adds sport grades outside 5 to 7b only once they are climbed', () => {
            visitWith(logs);
            labels('#sportChart').should('deep.equal',
                ['4', '5', '5+', '6a', '6a+', '6b', '6c', '7a', '7a+', '7b', '8a']);
            // the endurance session saved before grades were kept adds nothing
            cy.get('#sportTotal').should('have.text', '6 climbs in the last year, 0 in the year before');
        });

        it('adds the sport climbs from a gym session', () => {
            visitWith({ boulderLog: [{ id: 1, date: '2026-09-13', climbs: ['V2'], sport: ['6b', '7a', '4+'], rating: 0 }] });
            cy.get('#sportTotal').should('have.text', '3 climbs in the last year, 0 in the year before');
            labels('#sportChart').should('include.members', ['4+', '6b', '7a']);
            cy.get('#allLogs tbody tr').first().should('contain', 'Gym Session')
                .and('contain', '1 boulder, 3 sport climbs').and('contain', 'hardest V2 · 7a');
        });

        it('compares the last 7 days with the 7 before', () => {
            visitWith(logs);
            cy.get('label[for="range-7"]').click();
            cy.get('#boulderTotal').should('have.text', '3 boulders in the last 7 days, 1 in the 7 days before');
            // the 7 days before is a line on each bar, not a bar of its own
            cy.get('#boulderChart .bar').should('have.length', 3);
            cy.get('#boulderChart line.before').should('have.length', 1);
            cy.get('#boulderChart .legend').should('have.text', 'The 7 days before');
            cy.get('#boulderChart title').first().should('contain', 'V0');
        });

        it('keeps the range it was left on', () => {
            visitWith(logs);
            cy.get('label[for="range-30"]').click();
            cy.get('#boulderTotal').should('have.text', '4 boulders in the last 30 days, 0 in the 30 days before');
            cy.reload();
            cy.get('#range-30').should('be.checked');
            cy.get('#boulderTotal').should('have.text', '4 boulders in the last 30 days, 0 in the 30 days before');
        });

        describe('Trad', function () {
            // Three UKC climbs over two days, and a trad app session on the first
            const logbook = { imported: '2026-09-13', leftOut: 0, climbs: [
                { date: '2026-08-31', grade: 'HS', type: 'trad', name: 'Goin Back', crag: 'Moorhill Quarry', notes: '' },
                { date: '2026-08-31', grade: 'S', type: 'trad', name: 'Shuffle', crag: 'Moorhill Quarry', notes: '' },
                { date: '2026-08-06', grade: 'E1', type: 'trad', name: 'No Alibi', crag: 'Moorhill Quarry', notes: '' }
            ] };
            const session = (ukc) => ({ id: 1, date: '2026-08-31', climbs: ['HS', 'S', 'VS'], ukc: ukc, rating: 3 });

            it('charts the trad app with no UKC logbook at all', () => {
                visitWith({ tradLog: [session(false)] });
                cy.get('#tradFigure').should('be.visible');
                cy.get('#ukcNote').should('not.be.visible');
                cy.get('#tradTotal').should('have.text', '3 trad climbs in the last year, 0 in the year before');
                cy.get('#allLogs tbody tr').first().should('contain', 'Trad').and('contain', 'hardest VS');
            });

            it('counts both when the day is not on UKC', () => {
                visitWith({ ukcLogbook: logbook, tradLog: [session(false)] });
                cy.get('#tradTotal').should('have.text', '6 trad climbs in the last year, 0 in the year before');
                cy.get('#allLogs tbody tr').should('have.length', 3);
            });

            it('leaves out the UKC day when the trad app says it is on UKC too', () => {
                visitWith({ ukcLogbook: logbook, tradLog: [session(true)] });
                // the app's three, and UKC's one from 6 Aug - not UKC's two from 31 Aug
                cy.get('#tradTotal').should('have.text', '4 trad climbs in the last year, 0 in the year before');
                cy.get('#allLogs tbody tr').should('have.length', 2);
                cy.get('#allLogs tbody tr').first().should('contain', 'Trad').and('contain', 'UKC data ignored');
                cy.get('#allLogs tbody tr').eq(1).should('contain', 'UKC').and('contain', '6 Aug');
            });
        });

        it('says how much local storage is in use', () => {
            cy.visit(overviewUrl, {
                onBeforeLoad(win) {
                    // half a megabyte of characters, less the length of its own key
                    win.localStorage.setItem('filler', 'x'.repeat(524288 - 'filler'.length));
                }
            });
            cy.get('#storageUse').should('have.text', 'Local storage: 0.50 MB of about 5 MB used');
        });

        it('says which version of the apps is installed, once there is one', () => {
            // the specs stub out the service worker, so nothing is installed yet
            cy.visit(overviewUrl);
            cy.get('#appVersion').should('not.be.visible');
            // an installed version is the service worker's cache, by name
            cy.window().then((win) => win.caches.open('training-v99'));
            cy.reload();
            cy.get('#appVersion').should('have.text', 'App version: v99');
            cy.window().then((win) => win.caches.delete('training-v99'));
        });

        describe('UKC logbook', function () {
            // Rows from a real export: quoted notes with "" and a line break in
            // them, sport routes, trad routes graded French and UIAA, a boulder, and
            // a date UKC only knows the year of.
            const csv = [
                'Name,Grade,Style,Partner(empty),Notes,Date,Crag,County,Region,Country,Pitches,Type',
                '"Goin Back","HS 4b","Lead O/S",,"Nice route, a little pumpy, good fun",31/Aug/26,"Moorhill Quarry","Co. Down","Northern Ireland","Northern Ireland",1,Trad',
                'Shuffle,"S 4a","Lead O/S",,,31/Aug/26,"Moorhill Quarry","Co. Down","Northern Ireland","Northern Ireland",1,Trad',
                '"No Alibi","E1 5b","Lead rpt",,"Nice line, the ""gear"" is fine.',
                'Second line of the note",06/Aug/26,"Moorhill Quarry","Co. Down","Northern Ireland","Northern Ireland",1,Trad',
                'Scorpion,4c,AltLd,,,26/Jan/26,"Vall de Guadar (Echo Valley)",Benidorm,"Costa Blanca",Spain,4,Sport',
                '"Diedro UBSA",5c,"AltLd O/S",,,09/Feb/25,"Penon de Ifach",Calpe,"Costa Blanca",Spain,10,Sport',
                '"Casca la basca",6a+,Lead,,,30/Apr/16,"Arico - Upper Gorge",Tenerife,"Canary Islands",Spain,1,Sport',
                '"Via Normal",4b,"AltLd O/S",,,06/Jul/25,"El Catedral",Tenerife,"Canary Islands",Spain,5,Trad',
                '"Via Steger",IV+,,,,12/Aug/20,"Sella Towers",Dolomites,North,Italy,7,Trad',
                '"Finger Stain","6b+ 5c","TR O/S",,,25/Jul/16,"Harrison\'s Rocks","East Sussex","South-East England",England,1,Trad',
                '"The One They Call the White Hair","VS 4c","Lead O/S",,,???/2024,"Hen Mountain","Co. Down","Northern Ireland","Northern Ireland",1,Trad',
                '"The Prow",f6A,"Sent O/S",,,24/Jul/25,"Bloody Bridge Boulders","Co. Down","Northern Ireland","Northern Ireland",1,Bouldering'
            ].join('\r\n');

            // A second export, to show a new one replaces the first
            const later = [
                'Name,Grade,Style,Partner(empty),Notes,Date,Crag,County,Region,Country,Pitches,Type',
                '"Hound Dog","HVS 5a","TR O/S",,,12/Sep/26,"Moorhill Quarry","Co. Down","Northern Ireland","Northern Ireland",1,Trad'
            ].join('\r\n');

            // The import is in the trad app: choose the file there - it reloads
            // once the logbook is saved - then come back to the progress page
            function choose(text) {
                let firstClimb = text.split('\r\n')[1].split(',')[0].replace(/"/g, '');
                cy.visit(appUrl + '/training/trad/');
                cy.get('#ukcFile').selectFile({ contents: Cypress.Buffer.from(text), fileName: 'dankni_Logbook_DLOG.csv' },
                    { force: true });
                cy.window().its('localStorage').invoke('getItem', 'ukcLogbook').should('contain', firstClimb);
                cy.visit(progressUrl);
            }

            it('points to the import in the trad app until there is trad to chart', () => {
                visitWith(logs);
                cy.get('#performance').should('be.visible');
                cy.get('#tradFigure').should('not.be.visible');
                cy.get('#tradPrompt a').should('have.text', 'Upload UKC log data to combine and add trad climbs')
                    .and('have.attr', 'href', '../trad/#ukc');
                // the import is only in the trad app
                cy.get('#ukcFile').should('not.exist');
                cy.visit(overviewUrl);
                cy.get('#ukcFile').should('not.exist');
            });

            it('charts the trad climbs, turning only UIAA grades British', () => {
                choose(csv);
                cy.get('#performance').should('be.visible');
                cy.get('#tradFigure').should('be.visible');
                // HS, S, E1, and IV+ as HS. French 4b, sandstone 6b+ 5c and the one
                // with only a year are left out.
                cy.get('label[for="range-all"]').click();
                labels('#tradChart').should('deep.equal', ['VD', 'S', 'HS', 'VS', 'HVS', 'E1', 'E2']);
                cy.get('#tradTotal').should('have.text', '4 trad climbs in all');
                cy.get('#ukcImported').should('contain', 'Imported from UKC on 13 Sep 2026.')
                    .and('contain', '3 climbs left out');
            });

            it('adds the sport climbs to the sport chart', () => {
                choose(csv);
                // 4c as 4+, 5c as 5+, and 6a+ as it is
                cy.get('label[for="range-all"]').click();
                cy.get('#sportTotal').should('have.text', '3 climbs in all');
                labels('#sportChart').should('include.members', ['4+', '5+', '6a+']);
            });

            it('adds each day climbed to the sessions', () => {
                choose(csv);
                cy.get('#sessions').should('be.visible');
                // six days: the two climbs on 31 Aug are one session
                cy.get('#allLogs tbody tr').should('have.length', 6);
                cy.get('#allLogs tbody tr').first().should('contain', '31 Aug')
                    .and('contain', 'UKC').and('contain', '2 trad climbs')
                    .and('contain', 'hardest Goin Back (HS) · Moorhill Quarry');
            });

            it('puts the notes of the hardest climb of the day on its session', () => {
                choose(csv);
                // UKC exports no rating, so its days have no stars to show
                cy.get('#allLogs tbody tr').first().find('.icon-star').should('not.exist');
                cy.get('#allLogs tbody tr').first().find('.icon-note').click();
                cy.get('.comment-pop').should('contain', 'Goin Back: Nice route, a little pumpy, good fun');
                cy.get('.comment-pop-stars').should('not.exist');
                // a day whose hardest climb has no notes has no note
                cy.get('#allLogs tbody tr').eq(2).should('contain', '26 Jan').find('.icon-note').should('not.exist');
            });

            it('keeps the name, date, grade, type, crag and notes of each climb', () => {
                choose(csv);
                cy.get('#tradFigure').should('be.visible');
                cy.window().then((win) => {
                    let saved = win.localStorage.getItem('ukcLogbook');
                    expect(saved).not.to.contain('Northern Ireland');   // the region, and the rest, stay in UKC
                    expect(JSON.parse(saved).climbs[0]).to.deep.equal({ date: '2026-08-31', grade: 'HS', type: 'trad',
                        name: 'Goin Back', crag: 'Moorhill Quarry', notes: 'Nice route, a little pumpy, good fun' });
                });
            });

            it('replaces the last import with a new one', () => {
                choose(csv);
                cy.get('#tradTotal').should('have.text', '3 trad climbs in the last year, 0 in the year before');
                choose(later);
                cy.get('#tradTotal').should('have.text', '1 trad climb in the last year, 0 in the year before');
                cy.get('#sportChart').should('contain', 'No climbs in the last year');
                cy.get('#allLogs tbody tr').should('have.length', 1);
            });

            it('compares the last 30 days with the 30 before', () => {
                choose(csv);
                cy.get('label[for="range-30"]').click();
                cy.get('#tradTotal').should('have.text', '2 trad climbs in the last 30 days, 1 in the 30 days before');
            });

            it('can be removed again', () => {
                choose(csv);
                cy.contains('#tradFigure a', 'Remove').click();
                cy.get('#performance').should('not.be.visible');
                cy.get('#progressEmpty').should('be.visible');
                cy.window().then((win) => expect(win.localStorage.getItem('ukcLogbook')).to.equal(null));
                cy.get('#sessions').should('not.be.visible');
            });
        });
    });
});
