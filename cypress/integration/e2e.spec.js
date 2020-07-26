const expect = require('chai').expect;
const climbsData = require('../../website/data/data.json');



describe('Load the website page', function () {
    const appUrl = 'http://localhost:9000';
    
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

});
