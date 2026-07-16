// Captures the live production weather section for the same climb, so a PR
// can show old-vs-new side by side. Hits the internet: opt in with
//   CYPRESS_PROD_COMPARE=1 npx cypress run --spec cypress/e2e/weather-prod-compare.cy.js
describe('Production weather section (comparison capture)', function () {
    const prodUrl = 'https://www.multi-pitch.com/climbs/original-route-on-old-man-of-stoer/';

    beforeEach(function () {
        if (!Cypress.env('PROD_COMPARE')) this.skip();
    });

    it('captures the prod weather section on desktop', () => {
        cy.visit(prodUrl);
        cy.get('#weather').should('exist');
        cy.get('nav').invoke('css', 'display', 'none');
        cy.get('#weather').screenshot('prod-weather-desktop', { overwrite: true, padding: 8 });
    });

    it('captures the prod weather section on mobile', () => {
        cy.viewport('iphone-x');
        cy.visit(prodUrl);
        cy.get('#weather').should('exist');
        cy.get('nav').invoke('css', 'display', 'none');
        cy.get('#weather').screenshot('prod-weather-mobile', { overwrite: true, padding: 8 });
    });
});
