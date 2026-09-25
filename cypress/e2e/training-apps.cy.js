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
            cy.get('#log .icon-note').click();
            cy.get('.comment-pop').should('contain', 'Slabby.');
            cy.get('#log .icon-wrench').click();
            cy.get('#climbCount').should('have.text', '1');
            cy.get('#sessionComment').should('have.value', 'Slabby.');
            cy.get('#saveSession').should('have.text', 'UPDATE SESSION');
        });
    });
});
