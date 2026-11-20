// website/training/common/router.js: the training pages swap in place, in one window
describe('Training router', function () {
    const appUrl = Cypress.env('appUrl');
    const routed = ['/training/progress/', '/training/goals/', '/training/rings/', '/training/timer/', '/training/gilford/',
        '/training/boulder/', '/training/endurance/', '/training/loft/', '/training/dansloft/', '/training/nohangs/',
        '/training/tabata/', '/training/maxpull/', '/training/trad/', '/training/'];

    // as in training-apps.cy.js: no real service worker serving cached files
    Cypress.on('window:before:load', (win) => {
        let serviceWorker = new win.EventTarget();
        Object.assign(serviceWorker, { register: () => Promise.resolve(), getRegistrations: () => Promise.resolve([]), controller: {} });
        Object.defineProperty(win.navigator, 'serviceWorker', { value: serviceWorker, configurable: true });
    });

    beforeEach(() => {
        cy.intercept({ hostname: 'www.googletagmanager.com' }, { statusCode: 204, body: '' });
    });

    function follow(path) {
        cy.document().then((doc) => {
            let link = doc.createElement('a');
            link.href = path;
            doc.body.appendChild(link);
            link.click();
        });
    }

    function heading(path) {
        return cy.request(path).then((response) => /<h1[^>]*>([^<]*)<\/h1>/.exec(response.body)[1].trim());
    }

    it('swaps every page in, its scripts run once, with no load', () => {
        cy.visit(appUrl + '/training/');
        cy.document().then((doc) => { doc.notReloaded = true; });
        routed.forEach((path) => {
            heading(path).then((h1) => {
                follow(path);
                cy.location('pathname').should('equal', path);
                cy.get('nav h1').should('have.text', h1);
                cy.get('nav.bottom-nav').should('have.length', 1);
                cy.get('nav .account-button').should('have.length', 1);
                cy.document().its('notReloaded').should('equal', true);
            });
        });
    });

    it('swaps the stylesheets', () => {
        cy.visit(appUrl + '/training/');
        cy.get('link[href$="/training/overview.css"]').should('have.length', 1);
        follow('/training/rings/');
        cy.get('nav h1').should('not.have.text', 'Training Apps');
        cy.get('link[href$="/training/overview.css"]').should('not.exist');
        cy.get('link[href$="/training/rings/style.css"]').should('have.length', 1).and('have.prop', 'media', 'all');
        cy.get('link[href$="/training/common/style.css"]').should('have.length', 1);
    });

    it('goes back and forward', () => {
        cy.visit(appUrl + '/training/');
        cy.get('.bottom-nav a').contains('Progress').click();
        cy.get('nav h1').should('have.text', 'Progress');
        cy.go('back');
        cy.location('pathname').should('equal', '/training/');
        cy.get('nav h1').should('have.text', 'Training Apps');
        cy.go('forward');
        cy.get('nav h1').should('have.text', 'Progress');
    });

    it('stops what the last page left running, and drops its globals', () => {
        cy.visit(appUrl + '/training/boulder/');
        cy.window().then((win) => {
            expect(win.boulderScale).to.be.a('function');
            win.setInterval(() => { win.document.title = 'leaked'; }, 20);
        });
        follow('/training/rings/');
        cy.get('nav h1').should('not.have.text', 'Gym Session');
        cy.wait(100);
        cy.title().should('not.equal', 'leaked');
        cy.window().then((win) => {
            expect(win.boulderScale).to.equal(undefined);
            expect(win.app.logKey).to.be.a('string');
        });
    });

    it('loads the Tindeq Arcade in full', () => {
        cy.visit(appUrl + '/training/');
        cy.document().then((doc) => { doc.notReloaded = true; });
        follow('/training/gaps/');
        cy.location('pathname').should('equal', '/training/gaps/');
        cy.document().should((doc) => expect(doc.notReloaded).to.equal(undefined));
    });
});
