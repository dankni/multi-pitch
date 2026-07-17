describe('Weather forecast strip', function () {
    const appUrl = 'localhost:9000';
    const climbSlug = '/climbs/original-route-on-old-man-of-stoer/';

    const DAY_KEYS = ['currently']
        .concat(Array.from({ length: 15 }, (_, i) => 'offsetPlus' + (i + 1)))
        .concat(Array.from({ length: 4 }, (_, i) => 'offsetMinus' + (i + 1)));

    // shift every timestamp in the fixture forward by whole days so "today"
    // in the fixture is always the real today - keeps the recorded fixture
    // evergreen without distorting hours, icons or values
    const rebaseFixture = (weather) => {
        const now = Math.floor(Date.now() / 1000);
        weather.forEach(w => {
            if (!w.currently) return;
            const dayShift = Math.round((now - w.currently.time) / 86400) * 86400;
            DAY_KEYS.forEach(key => {
                const day = w[key];
                if (!day) return;
                day.time += dayShift;
                if (day.sunriseTime) day.sunriseTime += dayShift;
                if (day.sunsetTime) day.sunsetTime += dayShift;
            });
            if (w.hourly) w.hourly.time = w.hourly.time.map(t => t + dayShift);
        });
    };

    const stubWeatherFeed = (mutate) => {
        cy.fixture('weather.json').then((weather) => {
            rebaseFixture(weather);
            if (mutate) mutate(weather);
            cy.intercept('GET', 'https://s3-eu-west-1.amazonaws.com/multi-pitch.data/climbing-data-extended-weather.json',
                { body: weather }).as('weatherFeed');
        });
    };

    const visitClimbWithWeather = (theme, mutate) => {
        stubWeatherFeed(mutate);
        cy.readFile('website/data/climbs/1.json').then((climbFile) => {
            cy.visit(appUrl + climbSlug, {
                onBeforeLoad(win) {
                    // weather hydration only runs for climbs the visitor has cached
                    win.localStorage.setItem('climb1', JSON.stringify(climbFile));
                    win.localStorage.setItem('theme', theme);
                }
            });
        });
    };

    // element screenshots auto-scroll the target under the fixed navbar, so
    // hide the navbar and rewind the strip, then save a screenshot usable in the PR
    const screenshotWidget = (name) => {
        cy.get('#currentWeather').should('be.visible');
        cy.get('nav').invoke('css', 'display', 'none');
        cy.get('#weatherStrip').invoke('prop', 'scrollLeft', 0);
        cy.document().then(doc => doc.activeElement && doc.activeElement.blur()); // clear the focus ring so shots show the resting state
        cy.get('#currentWeather').screenshot(name, { overwrite: true, padding: 8 });
        cy.get('nav').invoke('css', 'display', '');
    };

    it('renders the 18 day strip with local crag time', () => {
        visitClimbWithWeather('light');

        cy.get('#currentWeather').should('be.visible');
        cy.get('#weatherStrip .wx-day').should('have.length', 18); // 3 past + today + 14 forecast
        cy.get('#weatherStrip .wx-today').should('have.length', 1).and('contain', 'Today');
        cy.get('#weatherStrip .wx-past').should('have.length', 3);

        // local time at the crag, from the feed's IANA timezone
        cy.get('#cragLocalTime').invoke('text').should('match', /^\d{2}:\d{2}$/);
        cy.get('#cragTimeZone').should('contain', 'Europe/London');

        // every day carries an icon, temps, rain and wind
        cy.get('#weatherStrip .wx-day .weather').should('have.length', 18);
        cy.get('#weatherStrip .wx-day .wx-temp strong').first().invoke('text').should('match', /^-?\d+°$/);
        cy.get('#weatherStrip .wx-today .wx-pop').invoke('text').should('match', /^\d+%$/);
        // past days report what fell (mm), not a chance-of-rain percentage
        cy.get('#weatherStrip .wx-past .wx-pop').first().invoke('text').should('match', /^\s*$/);
        cy.get('#weatherStrip .wx-past .wx-mm').first().invoke('text').should('match', /^\d+(\.\d+)?mm$/);
        cy.get('#weatherStrip .wx-wind').first().should('contain', 'mph');
    });

    it('opens today hour-by-hour by default and switches day on click', () => {
        visitClimbWithWeather('light');

        // BBC-style default: the always-on detail panel opens on today
        cy.get('#weatherHourly').should('be.visible');
        cy.get('#weatherHourly .wx-day-summary').should('exist')
            .and('contain', 'sun ')          // per-day sunrise-sunset
            .and('contain', 'low tide');     // climb 1 is a tidal sea stack
        cy.get('#weatherHourly .wx-hour').should('have.length', 24);
        cy.get('#weatherStrip .wx-today').should('have.class', 'wx-selected');

        // hour cells carry local time, icon, temp, rain and wind
        cy.get('#weatherHourly .wx-hour .wx-dow').first().invoke('text').should('match', /^\d{2}:\d{2}$/);
        cy.get('#weatherHourly .wx-hour .weather').should('exist');
        cy.get('#weatherHourly .wx-pop').first().invoke('text').should('match', /^\d+%$/);

        // hovering tomorrow is enough to move the selection (no click needed)
        cy.get('#weatherStrip .wx-day[data-day="offsetPlus1"]').trigger('mouseover');
        cy.get('#weatherHourly .wx-hour').should('have.length', 24);
        cy.get('#weatherHourly .wx-hour .wx-dow').first().should('have.text', '00:00');
        cy.get('#weatherStrip .wx-day[data-day="offsetPlus1"]').should('have.class', 'wx-selected');
        cy.get('#weatherStrip .wx-today').should('not.have.class', 'wx-selected');

        // tapping still works too (touch devices have no hover)
        cy.get('#weatherStrip .wx-day[data-day="offsetPlus3"]').click();
        cy.get('#weatherStrip .wx-day[data-day="offsetPlus3"]').should('have.class', 'wx-selected');
    });

    it('every day is interactive and carries a full hourly breakdown', () => {
        visitClimbWithWeather('light');

        cy.get('#weatherStrip .wx-day[data-day]').should('have.length', 18); // all days respond to hover/tap
        cy.get('#weatherStrip .wx-hours-day').should('have.length', 18); // full-window hourly covers every day

        // even a far-out day and a past day show their detail on hover
        cy.get('#weatherStrip .wx-day[data-day="offsetPlus10"]').trigger('mouseover');
        cy.get('#weatherHourly .wx-day-summary').should('exist');
        cy.get('#weatherHourly .wx-hour').should('have.length', 24);
        cy.get('#weatherStrip .wx-day[data-day="offsetMinus2"]').trigger('mouseover');
        cy.get('#weatherHourly .wx-day-summary').should('contain', 'rain fell');
    });

    it('auto-scrolls today into view on a phone viewport', () => {
        cy.viewport('iphone-x');
        visitClimbWithWeather('light');

        cy.get('#weatherStrip .wx-day').should('have.length', 18);
        cy.get('#weatherStrip').invoke('prop', 'scrollLeft').should('be.greaterThan', 0);
    });

    it('still renders a feed without hourly or 16 day fields (old 7 day schema)', () => {
        // no embedded hourly and no per-climb hourly file either
        cy.intercept('GET', 'https://s3-eu-west-1.amazonaws.com/multi-pitch.data/climbing-weather-hourly/*',
            { statusCode: 404, body: '' });
        visitClimbWithWeather('light', (weather) => {
            weather.forEach(w => {
                delete w.hourly; // legacy feed shape
                for (let i = 8; i <= 15; i++) delete w['offsetPlus' + i];
            });
        });

        cy.get('#weatherStrip .wx-day').should('have.length', 11); // 3 past + today + 7
        // the day summary still shows for every day; only the hour rows are absent
        cy.get('#weatherHourly').should('be.visible');
        cy.get('#weatherHourly .wx-day-summary').should('exist');
        cy.get('#weatherHourly .wx-hour').should('not.exist');
        cy.get('#weatherStrip .wx-hours-day').should('not.exist');
        cy.get('#weatherStrip .wx-day[data-day="offsetPlus5"]').trigger('mouseover');
        cy.get('#weatherHourly .wx-day-summary').should('exist');
    });

    it('fetches the per-climb hourly file when the feed has no embedded hourly', () => {
        cy.fixture('weather.json').then((weather) => {
            rebaseFixture(weather);
            const climbOne = weather.find(w => w.climbId === 1);
            const hourlyBody = { climbId: 1, timezone: climbOne.timezone, hourly: climbOne.hourly };
            weather.forEach(w => { delete w.hourly; }); // production feed shape after the split
            cy.intercept('GET', 'https://s3-eu-west-1.amazonaws.com/multi-pitch.data/climbing-data-extended-weather.json',
                { body: weather });
            cy.intercept('GET', 'https://s3-eu-west-1.amazonaws.com/multi-pitch.data/climbing-weather-hourly/1.json',
                { body: hourlyBody }).as('hourlyFile');
        });
        cy.readFile('website/data/climbs/1.json').then((climbFile) => {
            cy.visit(appUrl + climbSlug, {
                onBeforeLoad(win) { win.localStorage.setItem('climb1', JSON.stringify(climbFile)); }
            });
        });

        cy.wait('@hourlyFile');
        cy.get('#weatherHourly .wx-hour').should('have.length', 24); // hour rows appear once the file lands
        cy.get('#weatherStrip .wx-hours-day').should('have.length', 18);
    });

    it('long routes show model top-out conditions, medium routes an estimate', () => {
        // model-driven: Via Maria (370m) carries per-day topOut in the feed
        stubWeatherFeed();
        cy.readFile('website/data/climbs/42.json').then((climbFile) => {
            cy.visit(appUrl + '/climbs/via-maria-on-sass-pordoi-south-face/', {
                onBeforeLoad(win) { win.localStorage.setItem('climb42', JSON.stringify(climbFile)); }
            });
        });
        cy.get('#weatherHourly .wx-day-summary').should('contain', 'base ')
            .and('contain', 'top of route')
            .and('contain', '(370m higher)');
        cy.get('#weatherHourly .wx-day-summary').invoke('text')
            .should('match', /top of route -?\d+ to -?\d+°C/); // real model numbers, not a delta

        // the summit mark: every day cell and hour cell carries the top-of-route temp
        cy.get('#weatherStrip .wx-day .wx-top').should('have.length', 18);
        cy.get('#weatherStrip .wx-top').first().invoke('text').should('match', /^▲≈?-?\d+°$/);
        cy.get('#weatherHourly .wx-hour .wx-top').should('have.length', 24);

        // the dew point "?" opens and closes an explainer
        cy.get('#weatherHourly .wx-help').click();
        cy.get('#weatherHourly .wx-help-pop').should('be.visible').and('contain', 'friction');
        cy.get('#weatherHourly .wx-help').click();
        cy.get('#weatherHourly .wx-help-pop').should('not.be.visible');

        // estimate fallback: no topOut in the feed but a route long enough to matter
        stubWeatherFeed((weather) => {
            const one = weather.find(w => w.climbId === 1);
            one.routeLength = 200; // pretend Stoer were 200m
        });
        cy.readFile('website/data/climbs/1.json').then((climbFile) => {
            cy.visit(appUrl + climbSlug, {
                onBeforeLoad(win) { win.localStorage.setItem('climb1', JSON.stringify(climbFile)); }
            });
        });
        cy.get('#weatherHourly .wx-day-summary').should('contain', 'top of route ≈').and('contain', '(est., 200m higher)');
        cy.get('#weatherStrip .wx-day .wx-top').first().invoke('text').should('match', /^▲≈-?\d+°$/); // estimate carries the approx sign
    });

    it('stays hidden when the feed is stale', () => {
        visitClimbWithWeather('light', (weather) => {
            weather.forEach(w => { if (w.currently) w.currently.time = Math.floor(Date.now() / 1000) - 3 * 86400; });
        });

        cy.get('#weatherStrip .wx-day').should('not.exist');
        cy.get('#currentWeather').should('not.be.visible');
    });

    it('hydrates the homepage cards and weather score', () => {
        stubWeatherFeed();
        cy.visit(appUrl);

        // climb 1 is in the fixture: icon class, temp range and sort score land on its card
        cy.get('#weather-1').should('have.attr', 'class').and('match', /clear-day|partly-cloudy-day|cloudy|fog|rain|sleet|snow/);
        cy.get('#temp-1').invoke('text').should('match', /-?\d+ to -?\d+° C/);
        cy.get('div.card[id="1"]').invoke('attr', 'data-weather-score')
            .then(parseFloat).should('be.within', 0, 1);
    });

    it('sorts climbs by the weather on a chosen day', () => {
        stubWeatherFeed();
        cy.visit(appUrl);
        cy.get('#weather-1').should('have.attr', 'class').and('contain', 'weather '); // hydration done

        // picking the weather sort reveals the day scrubber: one tick per day,
        // weekends emphasised (that's when trips happen), primed to Today
        cy.get('.filter-toggle').click(); // sort controls live in the filter panel
        cy.get('#sortOrder').select('Good Weather');
        cy.get('#weatherDayPicker').should('be.visible');
        cy.get('#weatherDayPicker .wx-tick').should('have.length', 15); // today + offsetPlus1..14
        cy.get('#weatherDayPicker .wx-tick-weekend').should('have.length.within', 4, 6);
        cy.get('#weatherDayValue').should('contain', 'Today');
        cy.get('#weatherDayRange').should('have.value', '0');

        // scrub to the day after tomorrow and expect climb 1's card to show that day's weather
        cy.fixture('weather.json').then((weather) => {
            const climbOne = weather.find(w => w.climbId === 1);
            const target = climbOne.offsetPlus2;

            cy.get('#weatherDayRange').invoke('val', 2).trigger('input').trigger('change');
            cy.get('#weatherDayValue').should('not.contain', 'Today'); // live label follows the thumb
            cy.get('#weatherDayValue').invoke('text').should('match', /^\w{3} \d{1,2}$/);

            cy.get('#weather-1').should('have.class', target.icon);
            cy.get('#temp-1').should('contain',
                Math.round(target.temperatureMin) + '-' + Math.round(target.temperatureHigh));

            // the deck is re-sorted: the best-scoring card leads and carries a real score
            cy.get('.card').first().invoke('attr', 'data-weather-score')
                .then(parseFloat).should('be.greaterThan', 0);
            cy.get('.card').first().invoke('attr', 'id').then(id => {
                expect(['1', '34', '40']).to.include(id); // only fixture climbs have scores
            });

            // PR prototype: day chips + deck sorted by that day's weather
            cy.get('#sortOrder').scrollIntoView({ offset: { top: -150, left: 0 } });
            cy.screenshot('weather-sort-by-date', { capture: 'viewport', overwrite: true });
        });
    });

    describe('PR prototype screenshots (desktop/mobile x light/dark)', () => {
        // desktop shots select tomorrow: a full 24h hourly row plus the
        // selected-day highlight demonstrates the interaction in the PR
        it('desktop light', () => {
            visitClimbWithWeather('light');
            cy.get('#weatherStrip .wx-day[data-day="offsetPlus1"]').click();
            cy.get('#weatherHourly .wx-hour').should('have.length', 24);
            screenshotWidget('weather-strip-desktop-light');
        });

        it('desktop dark', () => {
            visitClimbWithWeather('dark');
            cy.get('html').should('have.attr', 'data-theme', 'dark');
            cy.get('#weatherStrip .wx-day[data-day="offsetPlus1"]').click();
            cy.get('#weatherHourly .wx-hour').should('have.length', 24);
            screenshotWidget('weather-strip-desktop-dark');
        });

        it('mobile light', () => {
            cy.viewport('iphone-x');
            visitClimbWithWeather('light');
            cy.get('#weatherHourly .wx-hour').should('exist');
            screenshotWidget('weather-strip-mobile-light');
        });

        it('mobile dark', () => {
            cy.viewport('iphone-x');
            visitClimbWithWeather('dark');
            cy.get('html').should('have.attr', 'data-theme', 'dark');
            cy.get('#weatherHourly .wx-hour').should('exist');
            screenshotWidget('weather-strip-mobile-dark');
        });
    });
});
