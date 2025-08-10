const climbsData = require('../../website/data/data.json');

describe('Load the website page', function () {
    const appUrl = 'localhost:9000';
    
    it('Make sure that we display the right number of cards', () => {
        var numberOfPublishCard = climbsData.climbs.filter(c => c.status === "publish").length;
		cy.visit(appUrl)
		cy.get('#cardHolder .card').should('have.length', numberOfPublishCard)
    })

    it('Make sure advanced filters open on click', () => {
		cy.visit(appUrl)
		cy.get('.filter-toggle').click()
		cy.get('#advancedFilters').should('have.attr', 'style', 'display: flex;')
    });

    it('Make sure the correct cards are removed when an advanced filter is un-checked', () => {
		cy.visit(appUrl)
		cy.get('.filter-toggle').click()
		cy.get('#abseil').click()
		cy.get('#12').should('have.attr', 'style', 'display: none;')
    });

    it('Make sure cards are favourited when clicked', () => {
		cy.visit(appUrl)
		cy.get('div[data-climb-id="25"] .climb-status').click().click()
		cy.get('#25Status').should('have.attr', 'data-status', 'done')
    });
    
    it('Make that we can click a card and see a overlay', () => {
		const card = climbsData.climbs[6];
		cy.visit(appUrl)
		cy.get('div[data-climb-id="' + card.id + '"] a.open-tile').click()
		cy.get('#climbCardDetails .big-card-body h1').contains(card.cliff + ' - ' + card.routeName)
    });

    
    it('Make the dynamic topo images load', () => {
		const card = climbsData.climbs[6];
		cy.visit(appUrl)
		cy.get('div[data-climb-id="16"] a.open-tile').click()
		cy.get('label[for="c3"]').click({force: true})
		cy.get('#canvas[data-success="true"]')
    });
});
