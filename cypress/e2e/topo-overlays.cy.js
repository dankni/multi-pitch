describe('Topo overlay attribute toggles', function () {
    const appUrl = 'localhost:9000';

    // climb 7 has every overlay attribute: route, 4 pitches (belays + labels),
    // 2 descent entries and 4 alternative routes
    function openTopo(climbId) {
        cy.visit(appUrl);
        cy.get(`div[data-climb-id="${climbId}"] a.open-tile`).click();
        // wait for this climb's card to render: clicking earlier would hit the
        // previous card's (hidden) controls while the climb JSON is in flight
        cy.get(`#climbIdMeta[content="${climbId}"]`);
        // toggling any control swaps the static image for the drawn canvas
        cy.get('label[for="c1"]').click({ force: true });
        cy.get('#canvas[data-success="true"]');
        cy.get('label[for="c1"]').click({ force: true });
        cy.get('#canvas[data-success="true"]');
    }

    // records the colours/labels each draw helper is called with so tests can
    // assert what ended up on the canvas without reading pixels back
    function spyDrawHelpers(win) {
        win.__lines = [];
        win.__belays = [];
        win.__labels = [];
        const origLine = win.drawLine;
        const origBelay = win.drawBelay;
        const origAnnotate = win.annotate;
        win.drawLine = function (ctx, arr, dashed, arrow, color) { win.__lines.push(String(color)); return origLine.apply(this, arguments); };
        win.drawBelay = function (ctx, x, y, line, fill) { win.__belays.push(String(line)); return origBelay.apply(this, arguments); };
        win.annotate = function (ctx, msg, x, y, color) { win.__labels.push(String(msg)); return origAnnotate.apply(this, arguments); };
    }

    const ALTERNATIVE_YELLOW = '255, 239, 101';
    const DESCENT_BLUE = '1, 70, 181';
    const ROUTE_RED = '204,25,29';

    it('draws the alternatives overlay when the main route line is toggled off', () => {
        openTopo(7);
        cy.window().then(spyDrawHelpers);
        cy.get('label[for="c2"]').click({ force: true }); // uncheck Route
        cy.get('#c2').should('not.be.checked');
        cy.get('#c6').should('be.checked');
        cy.window().then((win) => {
            expect(win.__lines.filter((c) => c.includes(ALTERNATIVE_YELLOW)),
                'alternative route lines drawn while route is off').to.have.length.greaterThan(0);
            expect(win.__lines.filter((c) => c.includes(ROUTE_RED)),
                'main route line not drawn while unchecked').to.have.length(0);
        });
    });

    it('hides only the alternatives when their checkbox is toggled off', () => {
        openTopo(7);
        cy.window().then(spyDrawHelpers);
        cy.get('label[for="c6"]').click({ force: true }); // uncheck Alternatives
        cy.window().then((win) => {
            expect(win.__lines.filter((c) => c.includes(ALTERNATIVE_YELLOW)),
                'no alternative lines while unchecked').to.have.length(0);
            expect(win.__lines.filter((c) => c.includes(ROUTE_RED)),
                'main route still drawn').to.have.length.greaterThan(0);
        });
    });

    it('draws the descent overlay when belay points are toggled off', () => {
        openTopo(7);
        cy.window().then(spyDrawHelpers);
        cy.get('label[for="c3"]').click({ force: true }); // uncheck Belay Points
        cy.get('#c4').should('be.checked');
        cy.window().then((win) => {
            expect(win.__lines.filter((c) => c.includes(DESCENT_BLUE)),
                'descent lines drawn while belays are off').to.have.length.greaterThan(0);
        });
    });

    it('re-draws without error when each attribute is toggled off and on', () => {
        openTopo(7);
        ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'].forEach((id) => {
            cy.get(`label[for="${id}"]`).click({ force: true });
            cy.get('#canvas[data-success="true"]');
            cy.get(`label[for="${id}"]`).click({ force: true });
            cy.get('#canvas[data-success="true"]');
        });
    });

    it('draws the topo of the climb being viewed, not the one viewed before it', () => {
        // climb 16 has no alternatives; climb 7 has four. If the second card
        // re-uses the first card's topoData the yellow lines never appear.
        cy.visit(appUrl);
        cy.get('div[data-climb-id="16"] a.open-tile').click();
        cy.get('#climbIdMeta[content="16"]');
        cy.get('label[for="c1"]').click({ force: true });
        cy.get('#canvas[data-success="true"]');
        cy.get('body').type('{esc}');
        cy.get('div[data-climb-id="7"] a.open-tile').click();
        cy.get('#climbIdMeta[content="7"]');
        cy.window().then(spyDrawHelpers);
        cy.get('label[for="c1"]').click({ force: true });
        cy.get('#canvas[data-success="true"]');
        cy.window().then((win) => {
            expect(win.__lines.filter((c) => c.includes(ALTERNATIVE_YELLOW)),
                'climb 7 alternatives drawn after viewing climb 16').to.have.length.greaterThan(0);
        });
    });

    it('renders the drawn topo for every published climb with an interactive topo', { defaultCommandTimeout: 10000 }, () => {
        cy.readFile('website/data/data.json').then((data) => {
            const published = data.climbs.filter((c) => c.status === 'publish');
            const interactive = [];
            published.forEach((climb) => {
                cy.readFile(`website/data/climbs/${climb.id}.json`).then((fileData) => {
                    if (((fileData.climbData.topo || {}).dataFile || 0) > 1) {
                        interactive.push(climb.id);
                    }
                });
            });
            cy.then(() => {
                expect(interactive.length, 'interactive topo climbs found').to.be.greaterThan(0);
                interactive.forEach((id, idx) => {
                    if (idx % 10 === 0) {
                        // reload every 10 climbs: one long-lived page accumulates
                        // enough decoded topo images to stall draws on the CI box
                        cy.visit(appUrl);
                    }
                    cy.get(`div[data-climb-id="${id}"] a.open-tile`).click();
                    // wait for this climb's card before touching the controls
                    cy.get(`#climbIdMeta[content="${id}"]`, { timeout: 15000 });
                    cy.get('label[for="c1"]').click({ force: true });
                    // some topo images are 3-6MB; CI needs time to fetch and draw them
                    cy.get('#canvas', { timeout: 30000 }).should(($c) => {
                        expect($c.attr('data-success'), `topo canvas drawn for climb ${id}`).to.equal('true');
                    });
                    cy.get('body').type('{esc}'); // close the card and return to the grid
                    cy.get('#overlay').should('not.be.visible').then(($o) => {
                        // drop the closed card's DOM so 35 decoded multi-MB topo
                        // images don't pile up in one tab and starve the CI box
                        $o[0].innerHTML = '';
                    });
                });
            });
        });
    });

    it('disables the controls whose overlay data the climb does not have', () => {
        // climb 4 has an interactive topo but no pitch, descent or alternative data
        cy.visit(appUrl);
        cy.get('div[data-climb-id="4"] a.open-tile').click();
        cy.get('#c1').should('be.checked');
        cy.get('#c2').should('be.checked');
        cy.get('#c3').should('be.disabled');
        cy.get('#c4').should('be.disabled');
        cy.get('#c5').should('be.disabled');
        cy.get('#c6').should('be.disabled');
        // the remaining controls still render the canvas fine
        cy.get('label[for="c1"]').click({ force: true });
        cy.get('#canvas[data-success="true"]');
    });
});
