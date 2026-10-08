// The three training apps that share the two tap confirm in
// website/training/common/functions.js, plus the lap timer's own clock handling.
//
// Every test freezes the clock with cy.clock() before the page loads, so elapsed
// time is driven by cy.tick() rather than by how long the test takes to run.
describe('Training apps', function () {
    const appUrl = Cypress.env('appUrl');
    const sessionDate = new Date(2026, 8, 13, 12, 0, 0); // midday, so the UTC date the apps log matches

    // Analytics is loaded by common/functions.js on every one of these pages.
    // Stubbing it keeps the run off the network and out of the frozen clock's way.
    function stubAnalytics() {
        cy.intercept({ hostname: 'www.googletagmanager.com' }, { statusCode: 204, body: '' });
    }

    // The apps register a service worker, which would serve these specs a cached
    // copy of the last run's files. A no-op register keeps every visit on the
    // real files without the apps having to know they are being tested.
    // It is an event target, as the real one is, with a version already in
    // charge - so a test can say a new one has taken over with controllerchange.
    Cypress.on('window:before:load', (win) => {
        let serviceWorker = new win.EventTarget();
        Object.assign(serviceWorker, {
            register: () => Promise.resolve(),
            getRegistrations: () => Promise.resolve([]),
            controller: {}
        });
        Object.defineProperty(win.navigator, 'serviceWorker', { value: serviceWorker, configurable: true });
    });

    // Many taps as one command, with the page's own click: much quicker than a
    // cy.click() a tap. Each is looked up as it comes, as a tap can redraw the
    // list it was in.
    function tap(...selectors) {
        cy.document().then((doc) => selectors.forEach((selector) => doc.querySelector(selector).click()));
    }
    const times = (count, selector) => Array(count).fill(selector);

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
            cy.get('#reset').should('not.be.visible');
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
            cy.get('#reset').should('not.be.visible');
            cy.get('#primaryButton').click(); // PAUSE
            cy.get('#reset').should('be.visible');
            cy.get('#primaryButton').click(); // RESUME
            cy.get('#reset').should('not.be.visible');
        });

        it('keeps the session on the first reset tap and clears it on the second', () => {
            cy.visit(timerUrl);
            runSession(2);
            cy.get('#primaryButton').click(); // PAUSE
            cy.get('#reset').click();
            cy.get('#reset').should('contain', 'SURE?');
            cy.get('#lapCount').should('have.text', '2');
            cy.get('#elapsed').should('have.text', '0:00:20');
            cy.get('#reset').click();
            cy.get('#lapCount').should('have.text', '0');
            cy.get('#elapsed').should('have.text', '0:00:00');
            cy.get('#primaryButton').should('contain', 'START');
        });

        it('disarms reset after a few seconds without a second tap', () => {
            cy.visit(timerUrl);
            runSession(1);
            cy.get('#primaryButton').click(); // PAUSE
            cy.get('#reset').click();
            cy.get('#reset').should('contain', 'SURE?');
            cy.tick(4000);
            cy.get('#reset').should('contain', 'RESET');
            cy.get('#lapCount').should('have.text', '1'); // still there
        });

        it('disarms reset when the clock is started again', () => {
            cy.visit(timerUrl);
            runSession(1);
            cy.get('#primaryButton').click(); // PAUSE
            cy.get('#reset').click();
            cy.get('#reset').should('contain', 'SURE?');
            cy.get('#primaryButton').click(); // RESUME rather than confirming
            cy.get('#primaryButton').click(); // PAUSE again
            cy.get('#reset').should('contain', 'RESET'); // not one tap from wiping the session
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
            cy.window().then((win) => expect(JSON.parse(win.localStorage.getItem('lapTimerLog'))[0]).not.to.have.property('grade'));
        });

        it('logs each lap as a boulder of the grade set under the cog', () => {
            cy.visit(timerUrl);
            cy.get('label[for="grade-none"]').should('exist');
            // V0 to V10: a circuit is laps of something well within you
            cy.get('#grade-V10').should('exist');
            cy.get('#grade-V11').should('not.exist');
            cy.get('nav .icon-cog').click();
            cy.get('label[for="grade-V3"]').click();
            cy.get('body').type('{esc}');
            cy.get('#lapLabel').should('have.text', 'V3 laps');
            runSession(9);
            cy.get('#finishButton').click();
            cy.get('#saveSession').click();
            cy.get('#log').should('contain', '9 laps of V3');
            cy.window().then((win) => {
                let entry = JSON.parse(win.localStorage.getItem('lapTimerLog'))[0];
                expect(entry.grade).to.equal('V3');
                expect(entry.laps).to.equal(9);
            });
            // the setting sticks for the next session
            cy.reload();
            cy.get('#grade-V3').should('be.checked');
            // and the progress page counts them as boulders
            cy.visit(appUrl + '/training/progress/');
            cy.get('#boulderTotal').should('have.text', '9 boulders in the last year, 0 in the year before');
            cy.get('#allLogs').should('contain', '9 laps of V3');
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

        it('buzzes on a tick but not on taking one back', () => {
            cy.visit(gilfordUrl, { onBeforeLoad: win => cy.stub(win.navigator, 'vibrate').as('vibrate') });
            cy.get('#primaryButton').click();
            cy.get('#route7').click();
            cy.get('@vibrate').should('have.been.calledOnce');
            cy.get('#route7').click();
            cy.get('@vibrate').should('have.been.calledOnce');
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
            tap(...Array.from({ length: 24 }, (_, i) => '#route' + (i + 1)));
            cy.tick(100);
            cy.get('#tickCount').should('have.text', '24');
            cy.get('.toast').should('be.visible')
                .and('contain', 'Amazing! you ticked them all');
        });

        it('says everything one tick finishes, each in a toast of its own', () => {
            cy.visit(gilfordUrl);
            cy.get('#primaryButton').click();
            cy.get('#route12').click();   // 7a
            cy.get('#route15').click();   // 7a+
            tap(...Array.from({ length: 9 }, (_, i) => '#route' + (i + 1)));
            cy.tick(100);
            cy.get('.toast').should('not.exist');
            cy.get('#route18').click();   // 7b: the sevens, and the twelfth of 24
            cy.tick(100);
            cy.get('.toast').should('have.length', 2);
            cy.get('.toast').eq(0).should('be.visible').and('contain', 'Half the routes on the wall ticked');
            cy.get('.toast').eq(1).should('be.visible').and('contain', "Nice work ticking the 7's");
            // closing one leaves the other
            cy.get('.toast').eq(0).find('.toast-close').click();
            cy.tick(400);
            cy.get('.toast').should('have.length', 1).and('contain', "Nice work ticking the 7's");
            cy.tick(6000);
            cy.get('.toast').should('not.exist');
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

    // Rock rings and no hangs share common/workout.js. A voice that starts at once
    // makes the count in exactly three seconds, and keeps what was said.
    describe('Workouts run to a clock', function () {
        function visitWorkout(path) {
            cy.visit(appUrl + path, {
                onBeforeLoad(win) {
                    win.spoken = [];
                    // tones by frequency: the ping is the high one, the beeps the low
                    win.tones = [];
                    win.AudioContext = function () {
                        let node = () => ({ connect: (next) => next, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } });
                        return {
                            state: 'running', currentTime: 0, destination: {},
                            createGain: node,
                            createOscillator: () => Object.assign(node(), {
                                frequency: {},
                                start() { win.tones.push(this.frequency.value); },
                                stop() {}
                            })
                        };
                    };
                    Object.defineProperty(win, 'speechSynthesis', { configurable: true, value: {
                        speaking: false,
                        pending: false,
                        cancel: () => {},
                        speak: (utterance) => { win.spoken.push(utterance.text); utterance.onstart(); }
                    } });
                }
            });
        }

        it('rock rings puts up each minute in turn', () => {
            visitWorkout('/training/rings/');
            cy.get('#primaryButton').click();
            cy.tick(3000);
            cy.get('#first_task').should('have.text', '3 pull ups');
            cy.get('body').should('have.class', 'green');
            cy.tick(45000);
            cy.get('#next').should('be.visible');
            cy.get('#first_task_preview').should('have.text', '10 second bent-arm hang');
            cy.tick(15000);
            cy.get('#first_task').should('have.text', '10 second bent-arm hang');
            cy.get('#elapsed').should('have.text', '01:00');
        });

        it('no hangs hangs, rests, shows the next rep, and finishes on the last hang', () => {
            visitWorkout('/training/nohangs/');
            // the info panel: example photos, then the routine a line a grip
            cy.get('.grips img').should('have.length', 4).each(($img) => expect($img[0].naturalWidth).to.be.greaterThan(0));
            cy.get('.grips figcaption').should('have.length', 4).first().should('have.text', 'Open Hand');
            cy.get('#routine tr').should('have.length', 6).first().should('have.text', 'Open Hand · 4 Fingers · 6 reps');

            // the main screen lists every grip, a dot a rep, before it starts
            cy.get('#hangs tr').should('have.length', 6).first().should('contain', 'Open Hand · 4 Fingers');
            cy.get('#hangs tr').first().find('.pip').should('have.length', 6);
            cy.get('#hangs .pip').should('have.length', 20);
            cy.get('#hangs tr.current, #hangs tr.done').should('not.exist');

            cy.get('#elapsed').should('have.text', '09:40');   // counts down what is left
            cy.get('#primaryButton').click();
            cy.tick(3000);
            cy.get('#first_task').should('have.text', 'Open Hand · 4 Fingers');
            cy.get('#first_rep').should('have.text', 'Rep 1 of 6');
            cy.get('#first_count').should('have.text', '10');
            cy.get('body').should('have.class', 'green');
            cy.get('#hangs tr').first().should('have.class', 'current');
            cy.get('#hangs .pip').first().should('have.class', 'hanging');

            cy.window().its('tones').should('deep.equal', [1320]);   // a ping as the hang starts
            cy.tick(10000);
            cy.get('#first_task').should('have.text', 'Rest, then');
            cy.get('#first_count').should('have.text', '20');
            cy.get('#first_rep').should('have.text', 'Rep 2 of 6');
            cy.get('#hangs .pip.done').should('have.length', 1);
            cy.get('#hangs .pip.hanging').should('not.exist');
            cy.get('body').should('not.have.class', 'green');
            cy.window().its('tones').should('deep.equal', [1320, 1320]);   // and as it ends
            cy.tick(15000);
            cy.get('body').should('have.class', 'red');
            cy.tick(5000);
            cy.get('#first_rep').should('have.text', 'Rep 2 of 6');
            cy.window().its('tones').should('deep.equal', [1320, 1320, 880, 880, 880, 1320]);   // three beeps to go, then the next hang's ping

            // the rest after a grip's last hang greys it out and lights the next
            cy.tick(135000);
            cy.get('#first_rep').should('have.text', 'Rep 1 of 6');
            cy.get('#hangs tr').eq(0).should('have.class', 'done');
            cy.get('#hangs tr').eq(1).should('have.class', 'current');
            // named as it starts and not before
            cy.tick(15000);
            cy.get('#first_task').should('contain', 'Front 3');
            cy.window().its('spoken').should('include', 'Front 3, Open Hand').and('not.include', 'Next, Front 3, Open Hand')
                .and('not.include', 'Hang').and('not.include', 'Rest');

            // on to the half crimps
            cy.tick(300000);
            cy.get('#first_task').should('contain', 'Half Crimp · Front 2');

            // 20 reps of 30 seconds, less the rest after the last
            cy.tick(100000);
            cy.get('#elapsed').should('have.text', '00:00');
            cy.get('#endingDiv').should('be.visible');
            cy.get('#primaryButton').should('not.be.visible');
            cy.get('#first').should('not.be.visible');
            cy.get('#hangs tr.done').should('have.length', 6);
            cy.get('#hangs .pip.done').should('have.length', 20);
            cy.get('#saveSession').click();
            cy.window().its('localStorage').invoke('getItem', 'noHangsLog').then((log) => {
                expect(JSON.parse(log)).to.have.length(1);
            });
            cy.get('#reset').click();
            cy.get('#primaryButton').should('contain', 'START SESSION');
            cy.get('#elapsed').should('have.text', '09:40');
            cy.get('#hangs tr.done, #hangs .pip.done').should('not.exist');
        });
    });

    /* Tindeq Arcade. Math.random() at 0 makes every wall a 3 second one, 9 m high at 3 m/s, so
       the course is known: the first wall at 5 s, a slab as its 2 kg is the least, so
       its face a metre up - where the hands go - is a little past it. A pull further
       off than leaping reach of that jumps, and one held catches the wall from 4.9 s.
       The second wall is 7.5 s on from topping the first. The game steps on
       Date.now(), so cy.tick() moves it on; the short wait after each lets a frame
       see the new time. */
    describe('Tindeq Arcade', function () {
        const gapsUrl = appUrl + '/training/gaps/';

        // Bluetooth there by default, as on this machine but not on CI, where the
        // page's warning that it can't connect would cover what a test taps
        function visitGaps(extra) {
            cy.visit(gapsUrl, {
                onBeforeLoad(win) {
                    win.Math.random = () => 0;
                    Object.defineProperty(win.navigator, 'bluetooth', { configurable: true,
                        value: { requestDevice: () => Promise.reject(new win.Error('No device chosen')) } });
                    if (extra) { extra(win); }
                }
            });
        }
        function play(ms) {
            cy.tick(ms);
            cy.wait(50);
        }
        const hold = () => { cy.get('#course').trigger('pointerdown'); cy.wait(50); };
        const letGo = () => { cy.window().trigger('pointerup'); cy.wait(50); };
        const savedLog = () => cy.window().its('localStorage').invoke('getItem', 'gapsLog').then((log) => JSON.parse(log));
        const stateIs = (state) => cy.get('body').should('have.attr', 'data-state', state);

        it('climbs a wall on a pull held from before it to the top, and runs into the next with none', () => {
            visitGaps();
            cy.get('#score').should('have.text', '0');
            cy.get('#primaryButton').click();
            stateIs('running');
            play(4500);
            hold();
            play(3600);
            cy.get('#score').should('have.text', '9');
            letGo();
            stateIs('running');
            play(9000);
            stateIs('over');
            cy.get('#overTitle').should('have.text', 'You ran into the wall');
            cy.get('#overScore').should('have.text', 'Score 9 - a new high score');
            cy.get('#best').should('have.text', 'High score 9');
            cy.get('#primaryButton').should('contain', 'PLAY AGAIN');
            cy.get('#overPull').should('not.be.visible');
            savedLog().then((log) => {
                expect(log).to.have.length(1);
                expect(log[0]).to.include({ score: 9, seconds: 3, walls: 1, coins: 0, input: 'tap', maxPull: 20 });
            });
            cy.get('#log tbody tr').should('have.length', 1).and('contain', '9');
            // the rest of the run behind the note button, as the other apps' notes
            cy.get('#log .log-detail').should('not.exist');
            cy.get('#stats').should('contain.text', 'Highscore 9');
            cy.get('nav .icon-info').click();
            cy.get('#log .icon-note').click();
            cy.get('#sessionNote').should('be.visible').and('contain', '1 wall · 3 s of pull · held the screen');
        });

        it('falls off on a pull let go on the wall, and logs the height it reached', () => {
            visitGaps();
            cy.get('#primaryButton').click();
            play(4500);
            hold();
            play(2000);
            // the score is the height, as it is climbed
            cy.get('#score').invoke('text').should('match', /^[1-9]\d*$/);
            letGo();
            play(1500);
            stateIs('over');
            cy.get('#overTitle').should('have.text', 'You fell off');
            cy.get('#overScore').invoke('text').should('match', /^Score [1-9]\d* - a new high score$/);
            savedLog().then((log) => {
                expect(log[0]).to.include({ walls: 0 });
                expect(log[0].score).to.be.above(0);
            });
        });

        it('jumps on a pull far from a wall, and lands running', () => {
            visitGaps();
            cy.get('#primaryButton').click();
            play(1000);
            hold();
            play(200);
            cy.window().then((win) => expect(win.eval('game.air')).to.be.above(0));
            letGo();
            play(1000);
            cy.window().then((win) => {
                expect(win.eval('game.air')).to.equal(0);
                expect(win.eval('game.state')).to.equal('running');
            });
        });

        // With Math.random() at 0 the first coin is over the ground 6 m in, 2.1 m up:
        // the runner's middle is under it at 2.17 s
        it('takes a coin for a point, jumping for it', () => {
            visitGaps();
            cy.get('#primaryButton').click();
            play(1900);
            hold();
            play(600);
            cy.get('#score').should('have.text', '1');
        });

        it('jumps on a Progressor only for a pull of 5 kg or more', () => {
            visitGaps(fakeProgressor);
            cy.get('#connect').click();
            cy.get('#primaryButton').click();
            play(1000);
            cy.window().then((win) => win.sendKg(4));
            cy.wait(50);
            play(200);
            cy.window().then((win) => expect(win.eval('game.air')).to.equal(0));
            cy.window().then((win) => win.sendKg(0));
            cy.wait(50);
            play(100);
            cy.window().then((win) => win.sendKg(6));
            cy.wait(50);
            play(200);
            cy.window().then((win) => expect(win.eval('game.air')).to.be.above(0));
        });

        it('runs into the wall on a pull started too late, at it, and logs nothing for nothing climbed', () => {
            visitGaps();
            cy.get('#primaryButton').click();
            play(5300);
            hold();
            play(1500);
            stateIs('over');
            cy.get('#overTitle').should('have.text', 'You ran into the wall');
            cy.window().its('localStorage').invoke('getItem', 'gapsLog').should('be.null');
        });

        it('takes a pull started early, held for longer', () => {
            visitGaps();
            cy.get('#primaryButton').click();
            play(1000);
            hold();
            play(7500);
            cy.get('#score').should('have.text', '9');
            letGo();
            stateIs('running');
        });

        it('climbs as the girl or the boy, chosen under the cog and kept between visits', () => {
            visitGaps();
            cy.window().then((win) => expect(win.eval('figureKind')).to.equal('girl'));
            cy.get('nav .icon-cog').click();
            cy.get('#climber-girl').should('be.checked');
            cy.get('label[for="climber-boy"]').click();
            cy.window().then((win) => expect(win.eval('figureKind')).to.equal('boy'));
            cy.reload();
            cy.window().then((win) => expect(win.eval('figureKind')).to.equal('boy'));
            cy.get('#climber-boy').should('be.checked');
        });

        it('keeps the max pull between visits', () => {
            visitGaps();
            cy.get('#maxPull').should('have.value', '20');
            cy.get('nav .icon-cog').click();
            cy.get('#maxPull').clear().type('25').trigger('change');
            cy.reload();
            cy.get('#maxPull').should('have.value', '25');
        });

        // A stand-in Progressor: its data point fires what a test sends, and the
        // control point keeps every command written to it
        function fakeProgressor(win) {
            win.written = [];
            let data = new win.EventTarget();
            data.startNotifications = () => Promise.resolve();
            let control = { writeValue: (bytes) => { win.written.push(bytes[0]); return Promise.resolve(); } };
            let service = { getCharacteristic: (uuid) => Promise.resolve(uuid.startsWith('7e4e1702') ? data : control) };
            let device = new win.EventTarget();
            device.name = 'Progressor_1234';
            device.gatt = {
                connected: false,
                connect: () => { device.gatt.connected = true; return Promise.resolve({ getPrimaryService: () => Promise.resolve(service) }); },
                disconnect: () => { device.gatt.connected = false; device.dispatchEvent(new win.Event('gattserverdisconnected')); }
            };
            win.progressorDevice = device;
            // a reply to a command: code 0, four bytes, a uint32 of millivolts for the battery
            win.sendBattery = (mv) => {
                let packet = new DataView(new ArrayBuffer(6));
                packet.setUint8(0, 0);
                packet.setUint8(1, 4);
                packet.setUint32(2, mv, true);
                data.value = packet;
                data.dispatchEvent(new win.Event('characteristicvaluechanged'));
            };
            // a weight notification: code 1, eight bytes, then kg and microseconds
            win.sendKg = (kg) => {
                let packet = new DataView(new ArrayBuffer(10));
                packet.setUint8(0, 1);
                packet.setUint8(1, 8);
                packet.setFloat32(2, kg, true);
                packet.setUint32(6, 123456, true);
                data.value = packet;
                data.dispatchEvent(new win.Event('characteristicvaluechanged'));
            };
            Object.defineProperty(win.navigator, 'bluetooth', { configurable: true,
                value: { requestDevice: () => Promise.resolve(device) } });
        }

        it('connects a Progressor, zeroes and starts it, and climbs on its pull', () => {
            visitGaps(fakeProgressor);
            cy.get('#force').should('not.be.visible');
            cy.get('#connect').should('be.visible').click();
            cy.window().its('written').should('deep.equal', [100, 111, 101]);   // tare, battery, then start measuring
            cy.get('#connect').should('not.be.visible');
            cy.get('#force').should('be.visible');
            cy.get('#pullHint').should('have.text', "Pull each wall's kg on the Progressor to climb it");
            cy.window().then((win) => win.sendKg(12));
            cy.get('#forceText').should('have.text', '12.0 / 2 kg');
            cy.get('#forceFill').should('have.class', 'over');
            cy.window().then((win) => win.sendKg(0));

            cy.get('#primaryButton').click();
            play(4500);
            cy.window().then((win) => win.sendKg(12));
            cy.wait(50);
            play(3600);
            cy.get('#score').should('have.text', '9');
            cy.window().then((win) => win.sendKg(1));   // under the wall's kg is letting go
            cy.wait(50);
            play(9000);
            cy.get('body').should('have.attr', 'data-state', 'over');
            savedLog().its(0).should('include', { input: 'tindeq', maxPull: 20, peakKg: 12 });
            cy.get('#overPull').should('be.visible').and('have.text', 'Max pull 12 kg');

            // and back to the connect button if it goes
            cy.window().then((win) => win.progressorDevice.dispatchEvent(new win.Event('gattserverdisconnected')));
            cy.get('#connect').should('be.visible');
            cy.tick(100);
            cy.get('.toast').should('contain', 'The Progressor disconnected');
        });

        // Math.random() at 0.5 makes every wall 7 s and half the max pull: 10 kg of 20,
        // the first at 5 s
        it('asks each wall for its own kg, and lets a moment under it go', () => {
            visitGaps((win) => { fakeProgressor(win); win.Math.random = () => 0.5; });
            cy.get('#connect').click();
            cy.get('#primaryButton').click();
            play(4500);
            cy.window().then((win) => win.sendKg(8));   // under the 10 kg: still on the ground
            cy.get('#forceText').should('have.text', '8.0 / 10 kg');
            cy.get('#forceFill').should('not.have.class', 'over');
            play(400);
            cy.window().then((win) => expect(win.eval('game.state')).to.equal('running'));
            cy.window().then((win) => win.sendKg(11));
            cy.wait(50);
            play(1000);
            cy.window().then((win) => expect(win.eval('game.state')).to.equal('climbing'));
            // a wobble under the kg for a tenth of a second isn't letting go
            cy.window().then((win) => win.sendKg(9.5));
            cy.wait(50);
            play(100);
            cy.window().then((win) => win.sendKg(11));
            cy.wait(50);
            play(7000);
            cy.get('#score').should('have.text', '21');
            // but longer, on a wall, is
            play(7500);
            cy.window().then((win) => win.sendKg(4));
            cy.wait(50);
            play(1500);
            cy.get('body').should('have.attr', 'data-state', 'over');
        });

        it('draws a wall\'s kg from 2 up to the max pull, around half of it', () => {
            visitGaps();
            cy.window().then((win) => {
                win.eval('maxPull = 20');
                let kgAt = (value) => { win.Math.random = () => value; return win.eval('wallKg()'); };
                expect(kgAt(0)).to.equal(2);       // never under 2 kg
                expect(kgAt(0.5)).to.equal(10);    // half the max
                expect(kgAt(0.999)).to.equal(20);  // never over it
            });
        });

        it('leans a wall back for the lightest pull and out for the max, 13.5 degrees off vertical at most', () => {
            visitGaps();
            cy.window().then((win) => {
                win.eval('maxPull = 20');
                expect(win.eval('wallSlant(2)')).to.be.closeTo(13.5, 0.001);    // a slab
                expect(win.eval('wallSlant(11)')).to.be.closeTo(0, 0.001);      // vertical
                expect(win.eval('wallSlant(20)')).to.be.closeTo(-13.5, 0.001);  // overhanging
            });
        });

        it('sets the Progressor up from under the cog, and says how it is', () => {
            visitGaps(fakeProgressor);
            cy.get('nav .icon-cog').click();
            cy.get('#progressorStatus').should('have.attr', 'data-status', 'off');
            cy.get('#progressorStatusText').should('have.text', 'Not connected');
            cy.get('#progressorSteps li').should('have.length', 4);
            cy.get('#disconnect, #tare, #progressorDetail').should('not.be.visible');

            cy.get('#settingsConnect').click();
            cy.get('#progressorStatus').should('have.attr', 'data-status', 'connected');
            cy.get('#progressorStatusText').should('have.text', 'Connected');
            cy.get('#progressorSteps, #settingsConnect').should('not.be.visible');
            cy.window().then((win) => { win.sendBattery(3950); win.sendKg(7.25); });
            cy.get('#progressorDetail').should('have.text', 'Progressor_1234 · battery 3.95 V · reading 7.3 kg');

            cy.get('#tare').click();
            cy.window().its('written').should('deep.equal', [100, 111, 101, 100]);

            // a disconnect asked for: stop measuring first, and no warning
            cy.get('#disconnect').click();
            cy.window().its('written').should('deep.equal', [100, 111, 101, 100, 102]);
            cy.get('#progressorStatusText').should('have.text', 'Not connected');
            cy.get('#settingsConnect').should('be.visible');
            cy.tick(100);
            cy.get('.toast').should('not.contain', 'disconnected');
        });

        it('says why a connection failed', () => {
            visitGaps((win) => Object.defineProperty(win.navigator, 'bluetooth', { configurable: true,
                value: { requestDevice: () => Promise.reject(Object.assign(new Error('Bluetooth adapter not available.'), { name: 'NotFoundError' })) } }));
            cy.get('nav .icon-cog').click();
            cy.get('#settingsConnect').click();
            cy.get('#progressorError').should('have.text', "Couldn't connect: Bluetooth adapter not available.");
            cy.get('#progressorStatusText').should('have.text', 'Not connected');
        });

        it('says when the browser cannot reach a Progressor', () => {
            visitGaps((win) => Object.defineProperty(win.navigator, 'bluetooth', { configurable: true, value: undefined }));
            cy.get('#connect').should('not.be.visible');
            cy.get('#noBluetooth').should('not.have.attr', 'hidden');
            cy.get('#progressorStatusText').should('have.text', "Can't connect in this browser");
            cy.get('#noBluetoothSettings').should('not.have.attr', 'hidden');
            cy.get('#settingsConnect').should('have.attr', 'hidden');
            // and a toast says so, staying until it is closed
            cy.tick(100);
            cy.get('.toast').should('be.visible').and('contain', "This browser can't connect to a Tindeq Progressor");
            cy.get('.toast').should('have.class', 'warn');
            cy.get('.toast a').should('have.attr', 'href', 'https://caniuse.com/web-bluetooth');
            cy.tick(20000);
            cy.get('.toast').should('be.visible');
            // which the cog leaves to the toast while it is up
            cy.get('nav .icon-cog').click();
            cy.get('#noBluetoothSettings').should('not.be.visible');
            cy.get('.toast-close').click();
            cy.tick(400);
            cy.get('.toast').should('not.exist');
            cy.get('#noBluetoothSettings').should('be.visible');
        });

        // A best of 2 s on the device, logged in metres as before: the first 3 s wall beats it, so the flag is on its top
        it('flags the best on the device, and says when it is beaten', () => {
            visitGaps((win) => win.localStorage.setItem('gapsLog', JSON.stringify([{ id: 1, date: '2026-10-01', metres: 2, gaps: 1, input: 'tap', maxPull: 20 }])));
            cy.window().then((win) => expect(win.eval('bestFlagAt()')).to.include({ edge: 15, top: 9 }));
            cy.get('#primaryButton').click();
            play(4500);
            hold();
            play(3600);
            cy.tick(100);
            cy.get('.toast').should('be.visible').and('contain', 'New high score').and('not.have.class', 'warn');
        });

        it('has no flag with no best yet', () => {
            visitGaps();
            cy.window().then((win) => expect(win.eval('bestFlagAt()')).to.equal(null));
        });

        it('shares the score from the game over screen, with the phone\'s own share sheet', () => {
            visitGaps((win) => {
                Object.defineProperty(win.navigator, 'share', { configurable: true, value: cy.stub().as('share').resolves() });
            });
            cy.get('#share').should('not.be.visible');
            cy.get('#primaryButton').click();
            play(5300);
            play(1500);
            stateIs('over');
            cy.get('#share').should('be.visible').click();
            cy.get('@share').should('have.been.calledWithMatch', { title: 'Tindeq Arcade', text: 'I scored 0 on Tindeq Arcade' });
        });

        it('maximises to the whole screen without the navs, and back', () => {
            visitGaps();
            cy.get('#maximise').click();
            cy.get('nav, .bottom-nav').should('not.be.visible');
            cy.get('#maximise').should('have.class', 'icon-resize-normal');
            cy.get('#course').should(($course) => {
                expect($course[0].offsetHeight).to.be.closeTo($course[0].ownerDocument.defaultView.innerHeight, 1);
            });
            cy.get('#maximise').click();
            cy.get('nav, .bottom-nav').should('be.visible');
            cy.get('#maximise').should('have.class', 'icon-resize-full');
        });

        it('says nothing about Bluetooth where it works, and fills the screen between the navs with the course', () => {
            visitGaps(fakeProgressor);
            cy.tick(100);
            cy.get('.toast').should('not.exist');
            cy.get('#course').then(($course) => {
                let width = $course[0].clientWidth;
                expect(width).to.equal($course[0].ownerDocument.documentElement.clientWidth);
                expect($course[0].offsetHeight).to.be.closeTo($course[0].ownerDocument.defaultView.innerHeight - 58 - 58, 1);
            });
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

        it('flashes a grade green for a moment when it is tapped, with a buzz', () => {
            cy.visit(boulderUrl, { onBeforeLoad: win => cy.stub(win.navigator, 'vibrate').as('vibrate') });
            cy.get('#primaryButton').click();
            cy.get('#row-V3 .grade-add').click();
            cy.get('#row-V3 .grade-add').should('have.class', 'flash');
            cy.tick(300);
            cy.get('#row-V3 .grade-add').should('not.have.class', 'flash');
            cy.get('@vibrate').should('have.been.calledOnceWith', 15);
        });

        it('flashes a grade with a + in it, and counts it', () => {
            cy.visit(boulderUrl, { onBeforeLoad: (win) => win.localStorage.setItem('boulderSplitLow', 'false') });
            cy.get('#primaryButton').click();
            cy.get('label[for="tab-sport"]').click();
            cy.get('[id="row-5+"] .grade-add').click();
            cy.get('[id="row-5+"] .grade-add').should('have.class', 'flash');
            cy.get('#climbCount').should('have.text', '1');
            cy.get('#summary').should('contain', '5+');
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
            tap(...times(6, '.grade-harder'));
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
            cy.get('.toast').should('not.exist');
        });

        it('says the same thing once, however often it is said', () => {
            cy.visit(boulderUrl);
            cy.get('#primaryButton').click();
            tap(...times(7, '.grade-harder'));
            cy.get('.grade-harder').click();
            cy.get('.grade-harder').click();
            cy.tick(100);
            cy.get('.toast').should('have.length', 1);
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

        it('splits 4 to 5+ into 4a to 5c when the setting is on', () => {
            cy.visit(boulderUrl, { onBeforeLoad: (win) => win.localStorage.setItem('boulderSplitLow', 'false') });
            cy.get('#primaryButton').click();
            cy.get('label[for="tab-sport"]').click();
            cy.get('[id="row-5+"] .grade-add').click();
            cy.get('nav .icon-cog').click();
            cy.get('#splitLow').check({ force: true });
            cy.get('#settings .close').click();
            // the two it gains are on show, and 7c is still at the top
            cy.get('#grades .route-grade').then(($grades) => {
                expect([...$grades].map((grade) => grade.textContent)).to.deep.equal(
                    ['4a', '4b', '4c', '5a', '5b', '5c', '6a', '6b', '6c', '7a', '7b', '7c']);
            });
            cy.get('#row-4c .grade-add').click();
            // the 5+ from before still counts, and still outranks 4c
            cy.get('#climbCount').should('have.text', '2');
            cy.get('#summary').should('have.text', 'Hardest: 5+');
            cy.get('#row-5c .grade-add').click();
            cy.get('#summary').should('have.text', 'Hardest: 5c');
            cy.window().then((win) => expect(win.localStorage.getItem('boulderSplitLow')).to.equal('true'));
            // and off again
            cy.get('nav .icon-cog').click();
            cy.get('#splitLow').uncheck({ force: true });
            cy.get('#settings .close').click();
            cy.get('#grades .route-grade').first().should('have.text', '4');
            cy.get('#grades .route-grade').should('have.length', 10);
        });

        it('adds plus grades from 6a up when the setting is on', () => {
            cy.visit(boulderUrl);
            cy.get('#primaryButton').click();
            cy.get('label[for="tab-sport"]').click();
            cy.get('nav .icon-cog').click();
            cy.get('#plusGrades').check({ force: true });
            cy.get('#settings .close').click();
            // still as far as 7c
            cy.get('#grades .route-grade').then(($grades) => {
                expect([...$grades].map((grade) => grade.textContent)).to.deep.equal(
                    ['4a', '4b', '4c', '5a', '5b', '5c', '6a', '6a+', '6b', '6b+', '6c', '6c+', '7a', '7a+', '7b', '7b+', '7c']);
            });
            cy.get('[id="row-6b+"] .grade-add').click();
            cy.get('#row-6b .grade-add').click();
            cy.get('#summary').should('have.text', 'Hardest: 6b+');
            cy.window().then((win) => expect(win.localStorage.getItem('boulderPlusGrades')).to.equal('true'));
            // and off again: the 6b+ still counts
            cy.get('nav .icon-cog').click();
            cy.get('#plusGrades').uncheck({ force: true });
            cy.get('#settings .close').click();
            cy.get('#grades .route-grade').should('have.length', 12);
            cy.get('#climbCount').should('have.text', '2');
        });

        // an old session with an 8A on it has to be editable, ladder or no ladder
        it('logs sport climbs on a ladder of their own', () => {
            cy.visit(boulderUrl);
            cy.get('#primaryButton').click();
            cy.get('#row-V3 .grade-add').click();
            cy.get('label[for="tab-sport"]').click();
            // low grades split out by default, then whole grades from 6a, as far as 7c to start with
            cy.get('#grades .route-grade').then(($grades) => {
                expect([...$grades].map((grade) => grade.textContent))
                    .to.deep.equal(['4a', '4b', '4c', '5a', '5b', '5c', '6a', '6b', '6c', '7a', '7b', '7c']);
            });
            cy.get('#splitLow').should('be.checked');
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
            tap(...times(6, '.grade-harder'));
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

        // tap every climb on screen
        function tickAll(count) {
            tap(...Array.from({ length: count }, (_, i) => "#climb" + i));
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

        it('finishes at any point, counting what was ticked', () => {
            cy.visit(enduranceUrl);
            cy.get('#primaryButton').click();
            tickAll(4);                          // the warm up
            cy.get('#skipRest').click();
            tickAll(2);                          // half of set 1
            cy.get('#finishButton').should('be.visible').click();
            cy.get('#saveSession').click();
            cy.window().then((win) => {
                const saved = JSON.parse(win.localStorage.getItem('enduranceLog'))[0];
                expect(saved.climbs).to.equal(6);
                expect(saved.grades).to.have.length(6);
                expect(saved.sets).to.equal(1);
                expect(saved.finish).to.be.at.least(saved.start);
                expect(saved.minutes).to.equal(0);
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
            tap(...times(8, '.grade-harder'));
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

        it('lists every UKC day, less any it has logged itself as on UKC too', () => {
            cy.visit(tradUrl, {
                onBeforeLoad(win) {
                    win.localStorage.setItem('ukcLogbook', JSON.stringify({ imported: '2026-09-13', leftOut: 0, climbs: [
                        { date: '2026-08-31', grade: 'HS', type: 'trad', name: 'Goin Back', crag: 'Moorhill Quarry', notes: 'Pumpy' },
                        { date: '2026-08-31', grade: 'V3', type: 'boulder', name: 'The Prow', crag: 'Moorhill Quarry', notes: '' },
                        { date: '2026-08-06', grade: 'E1', type: 'trad', name: 'No Alibi', crag: 'Moorhill Quarry', notes: '' },
                        { date: '2026-01-26', grade: '4+', type: 'sport', name: 'Scorpion', crag: 'Echo Valley', notes: '' }
                    ] }));
                    win.localStorage.setItem('tradLog', JSON.stringify(
                        [{ id: 1, date: '2026-08-06', climbs: ['E1'], ukc: true, rating: 0 }]));
                }
            });
            cy.get('.icon-info').click();
            cy.get('#ukcSummary').should('have.text', 'Imported 13 Sep 2026 · 2 days, 3 climbs, in the activity log below.');
            // in the activity log with the app's own session, sport and bouldering
            // days too - but not UKC's copy of the day logged here
            cy.get('#log tbody tr').should('have.length', 3);
            cy.get('#log tbody tr').eq(2).should('contain', '26 Jan').and('contain', '1 sport climb');
            // a route beats a boulder for the day's hardest
            cy.get('#log tbody tr').first()
                .should('contain', '31 Aug').and('contain', '1 trad climb, 1 boulder')
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
            // and on to the progress page, to see it charted
            cy.location('pathname').should('equal', '/training/progress/');
            cy.get('#tradFigure').should('be.visible');
        });
    });

    describe('One app', function () {
        const pages = ['/training/', '/training/progress/', '/training/rings/', '/training/timer/',
            '/training/gilford/', '/training/boulder/', '/training/endurance/', '/training/loft/', '/training/trad/', '/training/nohangs/', '/training/gaps/'];

        it('installs as a single app covering every page', () => {
            cy.request(appUrl + '/training/manifest.json').its('body').should((manifest) => {
                expect(manifest.scope).to.equal('/training/');
                expect(manifest.start_url).to.equal('/training/');
                expect(manifest.display).to.equal('standalone');
            });
        });

        it('offers a reload when a new version takes over, and waits to be tapped', () => {
            cy.visit(appUrl + '/training/timer/');
            cy.window().then((win) => win.navigator.serviceWorker.dispatchEvent(new win.Event('controllerchange')));
            cy.tick(100);   // the toast fades in on a timer, and the clock is frozen
            cy.get('.toast').should('be.visible').and('contain', "There's a new version - tap to reload");
            // it stays, where an ordinary toast is gone in a few seconds
            cy.tick(10000);
            cy.get('.toast').should('be.visible');
            // a tap reloads the page
            cy.window().then((win) => { win.beforeReload = true; });
            cy.get('.toast-action').click();
            cy.window().should('not.have.property', 'beforeReload');
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

            // The host serves /training/timer as well as /training/timer/, without a
            // redirect - every stylesheet and script has to load either way
            it('styles and runs ' + page + ' without its trailing slash', () => {
                cy.visit(appUrl + page.replace(/\/$/, ''));
                cy.get('nav').should('have.css', 'background-color', 'rgb(18, 18, 18)');
                cy.get('.bottom-nav .bottom-nav-item').should('have.length', 3);
                cy.get('#fullscreen').should('be.visible');
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

        it('marks each day climbed on a calendar above the sessions', () => {
            visitWith(Object.assign({}, logs, {
                lapTimerLog: [{ id: 20, date: '2026-09-13', total: 60000, laps: 3, rating: 0 }]   // a second on the 13th
            }));
            cy.get('#sessionCalendar svg').should('be.visible');
            // each day in the colour of its hardest grade, as the charts band them:
            // V10 is very hard, the tick list's 7a hard, V3 medium and V1 easy
            cy.get('#sessionCalendar rect[data-date="2026-09-13"]').should('have.class', 'band-vhard')
                // the day's sessions as the log below names them, a line each
                .find('title').invoke('text').then((text) => {
                    const lines = text.split('\n');
                    expect(lines).to.have.length(3);
                    expect(lines[0]).to.equal('13 Sep 2026');
                    expect(text).to.contain('3 laps').and.contain('hardest V10');
                });
            cy.get('#sessionCalendar rect[data-date="2026-09-12"]').should('have.class', 'band-hard');
            cy.get('#sessionCalendar rect[data-date="2026-09-03"]').should('have.class', 'band-medium');
            cy.get('#sessionCalendar rect[data-date="2026-07-01"]').should('have.class', 'band-easy');
            // a session with no grade in it, and a day with none
            cy.get('#sessionCalendar rect[data-date="2026-08-01"]').should('have.class', 'plain');
            cy.get('#sessionCalendar rect[data-date="2026-09-11"]').should('have.class', 'none')
                .find('title').should('have.text', '11 Sep 2026: no sessions');
            // today is the last square - nothing drawn for the rest of the week
            cy.get('#sessionCalendar rect[data-date="2026-09-14"]').should('not.exist');
            // 13 and 12 Sep, 10 and 3 Sep, 1 Aug and 1 Jul
            cy.get('#sessionCalendar rect:not(.none)').should('have.length', 6);
            cy.get('.calendar-key').should('have.text', '11 May – 13 Sep 2026 · 6 days climbed');
        });

        it('shows the sessions of a day on a tap, for a phone with no hover', () => {
            visitWith(logs);
            cy.get('#sessionCalendar rect[data-date="2026-09-12"]').click();
            cy.get('#sessionNote').should('be.visible').and('contain', '12 Sep 2026').and('contain', '3 climbs');
            // tapped again, or anywhere else, it goes
            cy.get('#sessionCalendar rect[data-date="2026-09-12"]').click();
            cy.get('#sessionNote').should('not.exist');
            // and a day with nothing on it has nothing to show
            cy.get('#sessionCalendar rect[data-date="2026-09-11"]').click();
            cy.get('#sessionNote').should('not.exist');
        });

        it('steps the calendar back through a year, 18 weeks at a time', () => {
            visitWith(logs);
            const earlier = '#sessionCalendar [aria-label="Earlier weeks"]';
            const later = '#sessionCalendar [aria-label="Later weeks"]';
            cy.get('#sessionCalendar rect').first().should('have.attr', 'data-date', '2026-05-11');   // a Monday
            cy.get(later).should('not.be.visible');   // nothing after today
            cy.get(earlier).click();
            cy.get('.calendar-key').should('contain', '5 Jan – 10 May 2026');
            cy.get('#sessionCalendar rect[data-date="2026-09-13"]').should('not.exist');
            cy.get('#sessionCalendar rect').should('have.length', 18 * 7);
            cy.get(earlier).click();
            cy.get('.calendar-key').should('contain', '1 Sep 2025 – 4 Jan 2026');
            // three lots of 18 weeks is as far back as it goes
            cy.get(earlier).should('not.be.visible');
            cy.get(later).click();
            cy.get(later).click();
            cy.get('.calendar-key').should('contain', '11 May – 13 Sep 2026');
        });

        it('switches charts and the calendar off under the cog, and remembers', () => {
            visitWith(logs);
            cy.get('[data-action="openSettings"]').click();
            cy.get('[data-part="sportFigure"]').uncheck({ force: true });
            cy.get('[data-part="sessionCalendar"]').uncheck({ force: true });
            cy.get('#sportFigure').should('not.be.visible');
            cy.get('#sessionCalendar').should('not.be.visible');
            cy.get('#boulderFigure').should('be.visible');
            cy.reload();
            cy.get('#sportFigure').should('not.be.visible');
            cy.get('[data-part="sportFigure"]').should('not.be.checked');
            // the boulder chart drawn to its own width with the sport one gone
            cy.get('#boulderChart').then(chart => {
                cy.get('#boulderChart svg').should('have.attr', 'viewBox', `0 0 ${Math.round(chart[0].clientWidth)} 200`);
            });
            // every chart off takes the range picker with it
            cy.get('[data-part="boulderFigure"]').uncheck({ force: true });
            cy.get('#performance').should('not.be.visible');
            cy.get('[data-part="sportFigure"]').check({ force: true });
            cy.get('#performance').should('be.visible');
            cy.get('#sportFigure').should('be.visible');
        });

        it('says there is nothing to chart with nothing logged', () => {
            cy.visit(progressUrl);
            cy.get('#performance').should('not.be.visible');
            cy.get('#progressEmpty').should('be.visible');
            // and there is still the way to bring a UKC logbook in
            cy.get('#ukcPrompt').should('be.visible');
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

        it('charts split out low grades on the rungs they fall on', () => {
            visitWith({ boulderLog: [{ id: 1, date: '2026-09-13', climbs: [], sport: ['4a', '4c', '5b', '5c'], rating: 0 }] });
            cy.get('#sportTotal').should('have.text', '4 climbs in the last year, 0 in the year before');
            labels('#sportChart').should('include.members', ['4', '4+', '5', '5+']);
            cy.get('#allLogs tbody tr').first().should('contain', '4 sport climbs').and('contain', 'hardest 5c');
            cy.get('.log-heading').should('have.text', 'Activity Log');
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
                cy.get('#allLogs tbody tr').first().should('contain', 'Outside').and('contain', 'hardest VS');
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
                cy.get('#allLogs tbody tr').first().should('contain', 'Outside').and('contain', 'UKC data ignored');
                cy.get('#allLogs tbody tr').eq(1).should('contain', 'UKC').and('contain', '6 Aug');
            });
        });

        describe('Grade conversions', function () {
            it('shows bouldering first, each V grade in its chart colour', () => {
                cy.visit(appUrl + '/training/progress/');
                cy.get('nav .icon-info').click();
                cy.get('#boulderConversions tbody tr').should('have.length', 18).and('be.visible');
                cy.get('#boulderConversions tbody tr').eq(3).should('contain', 'V3').and('contain', 'f6A').and('contain', '5a');
                cy.get('#boulderConversions tbody tr').eq(0).find('.swatch').should('have.class', 'band-easy');
                cy.get('#boulderConversions tbody tr').eq(8).find('.swatch').should('have.class', 'band-vhard');
                cy.get('#routeConversions').should('not.be.visible');
            });

            it('switches to routes in five systems', () => {
                cy.visit(appUrl + '/training/progress/');
                cy.get('nav .icon-info').click();
                cy.get('label[for="conversions-route"]').click();
                cy.get('#boulderConversions').should('not.be.visible');
                cy.get('#routeConversions thead').should('contain', 'UIAA').and('contain', 'YDS').and('contain', 'French');
                cy.get('#routeConversions tbody tr').should('have.length', 17);
                cy.get('#routeConversions tbody tr').eq(6).should('contain', 'E1').and('contain', '5.10a to c');
                cy.get('#routeConversions tbody tr').eq(6).find('.swatch').should('have.class', 'band-hard');
            });
        });

        describe('Backup', function () {
            function visitSeeded() {
                cy.visit(progressUrl, {
                    onBeforeLoad(win) {
                        win.localStorage.setItem('boulderLog', JSON.stringify([{ id: 1, date: '2026-09-10', climbs: ['V2'], rating: 3 }]));
                        win.localStorage.setItem('boulderGradeSystem', 'font');
                        win.localStorage.setItem('boulderCurrent', JSON.stringify({ id: 9, date: '2026-09-13', climbs: [] }));
                        win.localStorage.setItem('ukcLogbook', JSON.stringify({ imported: '2026-09-01', climbs: [] }));
                    }
                });
            }

            function restore(backup) {
                cy.get('nav .icon-info').click();
                cy.get('#backupFile').selectFile({ contents: Cypress.Buffer.from(typeof backup === 'string' ? backup : JSON.stringify(backup)),
                    fileName: 'training-backup.json' }, { force: true });
            }

            it('saves every log and setting, without UKC or a session in progress', () => {
                visitSeeded();
                cy.get('nav .icon-info').click();
                cy.get('#about').should('be.visible');
                cy.contains('#about button', 'SAVE').click();
                cy.readFile('cypress/downloads/training-backup-2026-09-13.json').then((backup) => {
                    expect(backup.backup).to.equal('multi-pitch training apps');
                    expect(backup.logs.boulderLog).to.deep.equal([{ id: 1, date: '2026-09-10', climbs: ['V2'], rating: 3 }]);
                    expect(backup.settings.boulderGradeSystem).to.equal('font');
                    expect(backup.logs).not.to.have.property('ukcLogbook');
                    expect(JSON.stringify(backup)).not.to.contain('ukcLogbook').and.not.to.contain('boulderCurrent');
                });
            });

            it('restores a backup, adding only what is missing', () => {
                visitSeeded();
                restore({
                    backup: 'multi-pitch training apps', version: 1, saved: '2026-09-01',
                    logs: {
                        boulderLog: [{ id: 1, date: '2026-09-10', climbs: ['V9'], rating: 5 },   // already here
                                     { id: 7, date: '2026-08-01', climbs: ['V4'], rating: 2 }],
                        gilfordLog: [{ id: 4, date: '2026-08-12', climbs: [1, 3], rating: 4 }],
                        ukcLogbook: [{ id: 1, date: '2026-01-01' }]
                    },
                    settings: { boulderGradeSystem: 'british', tradGradeSystem: 'uiaa', ukcLogbook: 'x', somethingElse: 'x' }
                });
                // the page starts again with the sessions in it, then says so
                cy.get('#allLogs tbody tr').should('have.length', 3);
                cy.get('.toast').should('exist');
                cy.tick(100);
                cy.get('.toast').should('be.visible').and('contain', 'Backup restored: 2 sessions added');
                cy.window().then((win) => {
                    let boulders = JSON.parse(win.localStorage.getItem('boulderLog'));
                    expect(boulders.map((entry) => entry.id)).to.deep.equal([1, 7]);
                    expect(boulders[0].climbs).to.deep.equal(['V2']);   // the phone's own copy wins
                    expect(JSON.parse(win.localStorage.getItem('gilfordLog'))).to.have.length(1);
                    expect(win.localStorage.getItem('boulderGradeSystem')).to.equal('font');   // set here already
                    expect(win.localStorage.getItem('tradGradeSystem')).to.equal('uiaa');      // wasn't
                    expect(win.localStorage.getItem('ukcLogbook')).to.contain('2026-09-01');
                    expect(win.localStorage.getItem('somethingElse')).to.equal(null);
                });
                // and the same sessions again add nothing
                cy.tick(6000);
                cy.get('.toast').should('not.exist');
                restore({ backup: 'multi-pitch training apps', logs: { boulderLog: [{ id: 7, date: '2026-08-01', climbs: ['V4'] }] } });
                cy.get('.toast').should('exist');
                cy.tick(100);
                cy.get('.toast').should('be.visible').and('contain', 'Nothing new in that backup');
            });

            it('turns away a file that is not a backup', () => {
                visitSeeded();
                restore('{"imported":"2026-09-01","climbs":[]}');
                cy.tick(100);
                cy.get('.toast').should('contain', "Couldn't restore that file");
                cy.window().then((win) => expect(JSON.parse(win.localStorage.getItem('boulderLog'))).to.have.length(1));
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

        it('says how much was downloaded for offline use, once there is any', () => {
            cy.visit(overviewUrl);
            cy.window().then((win) => win.caches.open('training-v99')
                .then(cache => cache.put('/training/filler', new win.Response('x'.repeat(1048576)))));
            cy.reload();
            cy.get('#offlineUse').should('have.text', 'Offline files: 1.00 MB');
            cy.window().then((win) => win.caches.delete('training-v99'));
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

        it('puts the page and the version in the feedback email subject', () => {
            cy.visit(overviewUrl);
            cy.get('#about a[href^="mailto:"]')
                .should('have.attr', 'href', 'mailto:admin@multi-pitch.com?subject=Feedback%3A%20Climbing%20Training%20Apps');
            cy.window().then((win) => win.caches.open('training-v99'));
            cy.visit(appUrl + '/training/loft/');
            cy.get('#about a[href^="mailto:"]')
                .should('have.attr', 'href', 'mailto:admin@multi-pitch.com?subject=Feedback%3A%20Loft%20Climb%20Tracker%20(v99)');
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

            it('points to the import in the trad app until a logbook is imported', () => {
                visitWith(logs);
                cy.get('#performance').should('be.visible');
                cy.get('#tradFigure').should('not.be.visible');
                cy.get('#ukcPrompt').should('be.visible');
                cy.get('#ukcPrompt a').should('have.attr', 'href', '/training/trad/#ukc');
                // and not once there is one
                choose(csv);
                cy.get('#ukcPrompt').should('not.be.visible');
                // the import is in the trad app and under the progress cog
                cy.get('#settings #ukcFile').should('exist');
                cy.get('#ukcSettingsNote').should('not.have.attr', 'hidden');
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

            it('adds the boulders to the boulder chart, Font grades as V', () => {
                choose([
                    'Name,Grade,Style,Partner(empty),Notes,Date,Crag,County,Region,Country,Pitches,Type',
                    '"The Prow",f6A,"Sent O/S",,,24/Jul/25,"Bloody Bridge Boulders","Co. Down","Northern Ireland","Northern Ireland",1,Bouldering',
                    '"Buttercup Traverse Low",f6A+,"Sent O/S",,,19/Jun/25,Altataggart,"Co. Down","Northern Ireland","Northern Ireland",1,Bouldering',
                    'B3,f3,"Sent O/S",,,19/Jun/25,Altataggart,"Co. Down","Northern Ireland","Northern Ireland",1,Bouldering',
                    'Overhang,V5,"Sent",,,19/Jun/25,Altataggart,"Co. Down","Northern Ireland","Northern Ireland",1,Bouldering',
                    'Mystery,5c,"Sent",,,19/Jun/25,Altataggart,"Co. Down","Northern Ireland","Northern Ireland",1,Bouldering'
                ].join('\r\n'));
                cy.window().then((win) => {
                    let grades = JSON.parse(win.localStorage.getItem('ukcLogbook')).climbs.map((climb) => climb.type + ' ' + climb.grade);
                    // f6A and f6A+ as V3, f3 as V0, V5 as it is - and a British 5c left out
                    expect(grades).to.deep.equal(['boulder V3', 'boulder V3', 'boulder V0', 'boulder V5']);
                });
                cy.get('label[for="range-all"]').click();
                cy.get('#boulderTotal').should('have.text', '4 boulders in all');
                cy.get('#ukcImported').should('contain', '1 climb left out');
                cy.contains('#allLogs tbody tr', '19 Jun').should('contain', '3 boulders')
                    .and('contain', 'hardest Overhang (V5)');
            });

            it('adds each day climbed to the sessions', () => {
                choose(csv);
                cy.get('#sessions').should('be.visible');
                // seven days: the two climbs on 31 Aug are one session
                cy.get('#allLogs tbody tr').should('have.length', 7);
                cy.contains('#allLogs tbody tr', '24 Jul').should('contain', '1 boulder');
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
                cy.contains('#tradFigure button', 'Remove').click();
                cy.get('#performance').should('not.be.visible');
                cy.get('#progressEmpty').should('be.visible');
                cy.window().then((win) => expect(win.localStorage.getItem('ukcLogbook')).to.equal(null));
                cy.get('#sessions').should('not.be.visible');
            });
        });
    });
});
