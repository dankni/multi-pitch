describe('Map page (self-hosted Leaflet)', function () {
    const appUrl = 'localhost:9000';

    const stubWeather = () => {
        cy.fixture('weather.json').then((weather) => {
            weather.forEach(w => { if (w.currently) w.currently.time = Math.floor(Date.now() / 1000); });
            cy.intercept('GET', 'https://s3-eu-west-1.amazonaws.com/multi-pitch.data/climbing-data-extended-weather.json',
                { body: weather });
        });
    };

    it('renders tiles and one marker per published climb', () => {
        stubWeather();
        cy.visit(appUrl + '/map/');
        cy.get('#map .leaflet-tile-pane', { timeout: 15000 }).should('exist');
        cy.readFile('website/data/data.json').then((data) => {
            const published = data.climbs.filter(c => c.status === 'publish').length;
            cy.get('#map .leaflet-marker-icon', { timeout: 15000 }).should('have.length', published);
        });
        // leaflet assets load from our own origin, not a CDN
        cy.document().then(doc => {
            const leafletScript = [...doc.querySelectorAll('script')].find(s => s.src.includes('leaflet.js'));
            expect(leafletScript.src).to.contain('/vendor/leaflet/');
        });
    });

    it('renders on a phone viewport', () => {
        cy.viewport('iphone-x');
        stubWeather();
        cy.visit(appUrl + '/map/');
        cy.get('#map .leaflet-marker-icon', { timeout: 15000 }).should('have.length.greaterThan', 40);
    });
});
