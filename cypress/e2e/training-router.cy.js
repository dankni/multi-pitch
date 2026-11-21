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

    it('lets a sync started on one page finish on the next', () => {
        const identity = 'eu-west-1:0000-test';
        let targets = [];
        const cors = { 'access-control-allow-origin': '*' };
        cy.intercept({ method: 'OPTIONS', hostname: /\.amazonaws\.com$/ }, { statusCode: 204, headers: Object.assign({
            'access-control-allow-methods': 'POST',
            'access-control-allow-headers': 'content-type,x-amz-target,x-amz-date,x-amz-security-token,x-amz-content-sha256,authorization' }, cors) });
        cy.intercept({ method: 'POST', hostname: /\.amazonaws\.com$/ }, (req) => {
            let target = req.headers['x-amz-target'].split('.').pop();
            targets.push(target);
            const answer = (body, delay) => req.reply({ statusCode: 200, headers: cors, body: body, delay: delay || 0 });
            switch (target) {
                case 'InitiateAuth': return answer({ AuthenticationResult: { IdToken: 'id', AccessToken: 'access', ExpiresIn: 3600 } });
                case 'GetId': return answer({ IdentityId: identity });
                case 'GetCredentialsForIdentity': return answer({ IdentityId: identity, Credentials: {
                    AccessKeyId: 'AKIDTEST', SecretKey: 'secret', SessionToken: 'session', Expiration: Date.now() / 1000 + 3600 } });
                // the first read held back till the page has changed
                case 'GetItem': return answer({}, targets.filter((seen) => seen === 'GetItem').length === 1 ? 1500 : 0);
                default: return answer({});
            }
        });
        // the account's reply lands while the next page is still without the account's code
        let moved = false;
        cy.intercept('/training/common/account.js', (req) => {
            req.on('response', (res) => {
                res.headers['cache-control'] = 'no-store';
                if (moved) { res.setDelay(3000); }
            });
        });
        cy.visit(appUrl + '/training/progress/', {
            onBeforeLoad(win) {
                win.localStorage.setItem('accountRefresh', 'refresh-token');
                win.localStorage.setItem('accountIdentity', identity);
                win.localStorage.setItem('boulderLog', JSON.stringify([{ id: 1, date: '2026-09-10', climbs: ['V2'] }]));
                // every toast shown, even one gone by the end
                win.document.toastsSeen = [];
                new win.MutationObserver(() => win.document.querySelectorAll('.toast').forEach((box) => {
                    if (!win.document.toastsSeen.includes(box.dataset.message)) { win.document.toastsSeen.push(box.dataset.message); }
                })).observe(win.document.documentElement, { childList: true, subtree: true });
            }
        });
        cy.wrap(null).should(() => expect(targets).to.include('GetItem'));
        cy.then(() => { moved = true; });
        follow('/training/rings/');
        cy.get('nav h1').should('not.have.text', 'Progress');
        cy.window().should((win) => expect(win.localStorage.getItem('accountLastSync')).not.to.equal(null));
        cy.wrap(null).should(() => expect(targets).to.include('PutItem'));
        cy.document().its('toastsSeen').should('deep.equal', []);
    });

    it('loads the Tindeq Arcade in full', () => {
        cy.visit(appUrl + '/training/');
        cy.document().then((doc) => { doc.notReloaded = true; });
        follow('/training/gaps/');
        cy.location('pathname').should('equal', '/training/gaps/');
        cy.document().should((doc) => expect(doc.notReloaded).to.equal(undefined));
    });
});
