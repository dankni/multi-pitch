// Post-deploy smoke check: does the frontend on production render the weather
// widget against the live feed? No intercepts - real site, real feed.
// Asserts the redesigned strip markup, so run it AFTER the frontend deploys.
// Hits the internet: opt in with CYPRESS_PROD_COMPARE=1
describe('Production live weather check', function () {
    beforeEach(function () {
        if (!Cypress.env('PROD_COMPARE')) this.skip();
    });

    it('widget hydrates from the live feed', () => {
        // the widget only hydrates for climbs the visitor has cached
        cy.request('https://www.multi-pitch.com/data/climbs/54.json').then((response) => {
            cy.visit('https://www.multi-pitch.com/climbs/sammy-higgins-on-eagle-mountain/', {
                onBeforeLoad(win) {
                    win.localStorage.setItem('climb54', JSON.stringify(response.body));
                }
            });
        });

        cy.get('#currentWeather', { timeout: 15000 }).should('be.visible');
        cy.get('#weatherStrip .wx-day').should('have.length.within', 12, 20); // legacy 7-day or full 16-day feed
        cy.get('#weatherStrip .wx-today').should('have.length', 1);
        cy.get('#cragLocalTime').invoke('text').should('match', /^\d{2}:\d{2}$/);
        cy.get('#weatherStrip .wx-day .wx-temp strong').first().invoke('text').should('match', /^-?\d+°$/);

        cy.get('nav').invoke('css', 'display', 'none');
        cy.get('#weather').scrollIntoView();
        cy.get('#currentWeather').screenshot('prod-live-widget', { overwrite: true, padding: 8 });
    });
});
