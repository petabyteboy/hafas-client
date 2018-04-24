'use strict'

const tapePromise = require('tape-promise').default
const tape = require('tape')
const isRoughlyEqual = require('is-roughly-equal')
const validateLine = require('validate-fptf/line')

const {createWhen} = require('./lib/util')
const co = require('./lib/co')
const createClient = require('..')
const oebbProfile = require('../p/oebb')
const products = require('../p/oebb/products')
const {
	station: createValidateStation
} = require('./lib/validators')
const createValidate = require('./lib/validate-fptf-with')
const testJourneysStationToStation = require('./lib/journeys-station-to-station')
const testEarlierLaterJourneys = require('./lib/earlier-later-journeys')

const when = createWhen('Europe/Vienna', 'de-AT')

const cfg = {
	when,
	stationCoordsOptional: false,
	products
}

// todo validateDirection: search list of stations for direction

const validate = createValidate(cfg, {
	line: validateLine // bypass line validator in lib/validators
})

const assertValidPrice = (t, p) => {
	t.ok(p)
	if (p.amount !== null) {
		t.equal(typeof p.amount, 'number')
		t.ok(p.amount > 0)
	}
	if (p.hint !== null) {
		t.equal(typeof p.hint, 'string')
		t.ok(p.hint)
	}
}

const test = tapePromise(tape)
const client = createClient(oebbProfile)

const salzburgHbf = '8100002'
const wienFickeystr = '911014'
const wien = '1190100'
const wienWestbahnhof = '1291501'
const klagenfurtHbf = '8100085'
const muenchenHbf = '8000261'
const wienRenngasse = '1390186'

test('journeys – Salzburg Hbf to Wien Westbahnhof', co(function* (t) {
	const journeys = yield client.journeys(salzburgHbf, wienFickeystr, {
		results: 3, when, passedStations: true
	})

	yield testJourneysStationToStation({
		test: t,
		journeys,
		validate,
		fromId: salzburgHbf,
		toId: wienFickeystr
	})

	for (let i = 0; i < journeys.length; i++) {
		const j = journeys[i]
		if (j.price) assertValidPrice(t, j.price, `journeys[${i}].price`)
	}

	t.end()
}))

// todo: journeys, only one product
// todo: journeys, fails with no product

test('Salzburg Hbf to 1220 Wien, Wagramer Straße 5', co(function* (t) {
	const latitude = 48.236216
	const longitude = 16.425863
	const wagramerStr = {
		type: 'location',
    	address: '1220 Wien, Wagramer Straße 5',
    	latitude, longitude
	}
	const journeys = yield client.journeys(salzburgHbf, wagramerStr, {when})

	validate(t, journeys, 'journeys', 'journeys')

	const i = journeys[0].legs.length - 1
	const d = journeys[0].legs[i].destination
	const k = `journeys[0].legs[${i}].destination`
	t.equal(d.address, '1220 Wien, Wagramer Straße 5', k + '.address is invalid')
	t.ok(isRoughlyEqual(.0001, d.latitude, latitude), k + '.latitude is invalid')
	t.ok(isRoughlyEqual(.0001, d.longitude, longitude), k + '.longitude is invalid')

	t.end()
}))

test('Salzburg Hbf to Albertina', co(function* (t) {
	const latitude = 48.204699
	const longitude = 16.368404
	const albertina = {
		type: 'location',
    	id: '975900003',
    	name: 'Albertina',
    	latitude, longitude
	}
	const journeys = yield client.journeys(salzburgHbf, albertina, {when})

	validate(t, journeys, 'journeys', 'journeys')

	const i = journeys[0].legs.length - 1
	const d = journeys[0].legs[i].destination
	const k = `journeys[0].legs[${i}].destination`
	t.equal(d.name, 'Albertina', k + '.name is invalid')
	t.ok(isRoughlyEqual(.0001, d.latitude, latitude), k + '.latitude is invalid')
	t.ok(isRoughlyEqual(.0001, d.longitude, longitude), k + '.longitude is invalid')

	t.end()
}))

test('journeys: via works – with detour', co(function* (t) {
	// Going from Stephansplatz to Schottenring via Donauinsel without detour
	// is currently impossible. We check if the routing engine computes a detour.
	const stephansplatz = '001390167'
	const schottenring = '001390163'
	const donauinsel = '001392277'
	const donauinselPassed = '922001'
	const journeys = yield client.journeys(stephansplatz, schottenring, {
		via: donauinsel,
		results: 1,
		when,
		passedStations: true
	})

	validate(t, journeys, 'journeys', 'journeys')

	const leg = journeys[0].legs.some((leg) => {
		return leg.passed && leg.passed.some((passed) => {
			return (
				passed.station.id === donauinsel ||
				passed.station.id === donauinselPassed
			)
		})
	})
	t.ok(leg, 'Donauinsel is not being passed')

	t.end()
}))

test('journeys: via works – without detour', co(function* (t) {
	// When going from Karlsplatz to Praterstern via Museumsquartier, there is
	// *no need* to change trains / no need for a "detour".
	const karlsplatz = '001390461'
	const praterstern = '001290201'
	const museumsquartier = '001390171'
	const museumsquartierPassed = '901014'

	const journeys = yield client.journeys(karlsplatz, praterstern, {
		via: museumsquartier,
		results: 1,
		when,
		passedStations: true
	})

	validate(t, journeys, 'journeys', 'journeys')

	const l1 = journeys[0].legs.some((leg) => {
		return (
			leg.destination.id === museumsquartier ||
			leg.destination.id === museumsquartierPassed
		)
	})
	t.notOk(l1, 'transfer at Museumsquartier')

	const l2 = journeys[0].legs.some((leg) => {
		return leg.passed && leg.passed.some((passed) => {
			return passed.station.id === museumsquartierPassed
		})
	})
	t.ok(l2, 'Museumsquartier is not being passed')

	t.end()
}))

test('earlier/later journeys, Salzburg Hbf -> Wien Westbahnhof', co(function* (t) {
	yield testEarlierLaterJourneys({
		test: t,
		fetchJourneys: client.journeys,
		validate,
		fromId: salzburgHbf,
		toId: wienWestbahnhof
	})

	t.end()
}))

test('leg details for Wien Westbahnhof to München Hbf', co(function* (t) {
	const journeys = yield client.journeys(wienWestbahnhof, muenchenHbf, {
		results: 1, when
	})

	const p = journeys[0].legs[0]
	t.ok(p.id, 'precondition failed')
	t.ok(p.line.name, 'precondition failed')
	const leg = yield client.journeyLeg(p.id, p.line.name, {when})

	validate(t, leg, 'journeyLeg', 'leg')
	t.end()
}))

test('departures at Wien Renngasse', co(function* (t) {
	const deps = yield client.departures(wienRenngasse, {
		duration: 5, when
	})

	validate(t, deps, 'departures', 'departures')
	for (let i = 0; i < deps.length; i++) {
		const dep = deps[i]
		const name = `deps[${i}]`

		// todo: fis this
		// ÖBB HAFAS data is just too detailed :P
		// t.equal(dep.station.name, 'Wien Renngasse', name + '.station.name is invalid')
		// t.equal(dep.station.id, wienRenngasse, name + '.station.id is invalid')
	}
	// todo: move into deps validator
	t.deepEqual(deps, deps.sort((a, b) => t.when > b.when))

	t.end()
}))

test('departures with station object', co(function* (t) {
	const deps = yield client.departures({
		type: 'station',
		id: salzburgHbf,
		name: 'Salzburg Hbf',
		location: {
			type: 'location',
			latitude: 1.23,
			longitude: 2.34
		}
	}, {when})

	validate(t, deps, 'departures', 'departures')
	t.end()
}))

test('nearby Salzburg Hbf', co(function* (t) {
	const nearby = yield client.nearby({
		type: 'location',
		longitude: 13.045604,
		latitude: 47.812851
	}, {
		results: 5, distance: 400
	})

	validate(t, nearby, 'locations', 'nearby')
	t.equal(nearby.length, 5)

	const s = nearby[0]
	t.ok(s.id === '008100002' || s.id === '8100002', 'id should be 8100002')
	t.equal(s.name, 'Salzburg Hbf')
	t.ok(isRoughlyEqual(s.location.latitude, 47.812851, .0005))
	t.ok(isRoughlyEqual(s.location.longitude, 13.045604, .0005))
	t.ok(s.distance >= 0)
	t.ok(s.distance <= 100)

	t.end()
}))

test('locations named Salzburg', co(function* (t) {
	const locations = yield client.locations('Salzburg', {
		results: 20
	})

	validate(t, locations, 'locations', 'locations')
	t.ok(locations.length <= 20)

	t.ok(locations.find(s => s.type === 'station'))
	t.ok(locations.find(s => s.id && s.name)) // POIs
	t.ok(locations.some(s => s.id === '008100002' || s.id === '8100002'))

	t.end()
}))

test('location', co(function* (t) {
	const loc = yield client.location(wienRenngasse)

	// todo: find a way to always get products from the API
	// todo: cfg.stationProductsOptional option
	const allProducts = products.reduce((acc, p) => (acc[p.id] = true, acc), {})
	const validateStation = createValidateStation(cfg)
	const validate = createValidate(cfg, {
		station: (validate, s, name) => {
			const withFakeProducts = Object.assign({products: allProducts}, s)
			validateStation(validate, withFakeProducts, name)
		}
	})
	validate(t, loc, 'station', 'station')

	t.equal(loc.id, wienRenngasse)

	t.end()
}))

test('radar Salzburg', co(function* (t) {
	let vehicles = yield client.radar({
		north: 47.827203,
		west: 13.001261,
		south: 47.773278,
		east: 13.07562
	}, {
		duration: 5 * 60,
		// when
	})

	// todo: find a way to always get frames from the API
	vehicles = vehicles.filter(m => m.frames && m.frames.length > 0)

	// todo: find a way to always get products from the API
	// todo: cfg.stationProductsOptional option
	const allProducts = products.reduce((acc, p) => (acc[p.id] = true, acc), {})
	const validateStation = createValidateStation(cfg)
	const validate = createValidate(cfg, {
		station: (validate, s, name) => {
			const withFakeProducts = Object.assign({products: allProducts}, s)
			validateStation(validate, withFakeProducts, name)
		},
		line: validateLine
	})
	validate(t, vehicles, 'movements', 'vehicles')

	t.end()
}))
