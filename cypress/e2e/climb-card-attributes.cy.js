const climbsData = require('../../website/data/data.json');

// The climb data stores tidal/abseil inconsistently across climbs: 1, "1",
// true, false, "" and null all appear. These tests pin the rendered outcome
// for each stored shape so a refactor of climbCard.js or a re-export of the
// climb JSON files cannot silently drop or invent attribute rings.
describe('Climb card attribute rings', function () {
    const appUrl = 'localhost:9000';

    function openCard(climbId) {
        cy.visit(appUrl);
        cy.get(`div[data-climb-id="${climbId}"] a.open-tile`).click();
        cy.get('#climbCardDetails');
    }

    it('shows tidal, abseil and facing rings when stored as numbers (climb 1)', () => {
        openCard(1); // tidal: 1, abseil: 1, face: "SE"
        cy.get('#climbCardDetails').contains('.single-attribute', 'Tidal').should('be.visible');
        cy.get('#climbCardDetails').contains('.single-attribute', 'Abseil').should('be.visible');
        cy.get('.info-ring.compass.SE #face')
            .should('have.text', 'SE')
            .and('have.attr', 'title', 'South East Facing');
        cy.get('#rockType').should('have.text', 'Sandstone');
    });

    it('shows only the tidal ring when stored as booleans (climb 14)', () => {
        openCard(14); // tidal: true, abseil: false
        cy.get('#climbCardDetails').contains('.single-attribute', 'Tidal').should('be.visible');
        cy.get('#climbCardDetails').contains('.single-attribute', 'Abseil').should('not.exist');
    });

    it('shows only the abseil ring when stored as strings (climb 8)', () => {
        openCard(8); // tidal: "", abseil: "1"
        cy.get('#climbCardDetails').contains('.single-attribute', 'Abseil').should('be.visible');
        cy.get('#climbCardDetails').contains('.single-attribute', 'Tidal').should('not.exist');
    });

    it('shows neither ring when both attributes are empty (climb 7)', () => {
        openCard(7); // tidal: "", abseil: ""
        cy.get('#climbCardDetails').contains('.single-attribute', 'Tidal').should('not.exist');
        cy.get('#climbCardDetails').contains('.single-attribute', 'Abseil').should('not.exist');
        cy.get('.info-ring.compass.NW #face').should('have.text', 'NW');
    });

    it('renders the core stat rings from the climb data (climb 7)', () => {
        const climb = climbsData.climbs.find((c) => c.id === 7);
        openCard(7);
        cy.get('#grade').invoke('text').should('match', /^D\b/);
        cy.get('#length').should('contain.text', climb.length + 'm');
        cy.get('#pitches').should('have.text', String(climb.pitches));
        cy.get('#approachTimeRing').should('contain.text', climb.approachTime);
    });
});
