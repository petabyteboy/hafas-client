'use strict'

const assert = require('assert')
const tapePromise = require('tape-promise').default
const tape = require('tape')

const {createWhen} = require('./lib/util')
const co = require('./lib/co')
const createClient = require('..')
const invgProfile = require('../p/invg')
const products = require('../p/invg/products')
const createValidate = require('./lib/validate-fptf-with')
const testJourneysStationToStation = require('./lib/journeys-station-to-station')
const testJourneysStationToAddress = require('./lib/journeys-station-to-address')
const testJourneysStationToPoi = require('./lib/journeys-station-to-poi')
const testEarlierLaterJourneys = require('./lib/earlier-later-journeys')
const testRefreshJourney = require('./lib/refresh-journey')
const journeysFailsWithNoProduct = require('./lib/journeys-fails-with-no-product')
const testDepartures = require('./lib/departures')
const testArrivals = require('./lib/arrivals')

const when = createWhen(invgProfile.timezone, invgProfile.locale)

const validate = createValidate({when, products})

const test = tapePromise(tape)
const client = createClient(invgProfile, 'public-transport/hafas-client:test')

const ingolstadtHbf = '8000183'
const audiParkplatz = '84998' // Audi Parkplatz
const uhlandstr1 = {
	type: 'location',
	address: 'Ingolstadt, Uhlandstraße 1',
	latitude: 48.775236,
	longitude: 11.441138
}

test('journeys – Ingolstadt Hbf to Audi Parkplatz', co(function* (t) {
	const journeys = yield client.journeys(ingolstadtHbf, audiParkplatz, {
		results: 3,
		departure: when,
		stopovers: true
	})

	yield testJourneysStationToStation({
		test: t,
		journeys,
		validate,
		fromId: ingolstadtHbf,
		toId: audiParkplatz
	})
	t.end()
}))

// todo: journeys, only one product

test('journeys – fails with no product', (t) => {
	journeysFailsWithNoProduct({
		test: t,
		fetchJourneys: client.journeys,
		fromId: ingolstadtHbf,
		toId: audiParkplatz,
		when,
		products
	})
	t.end()
})

test('Ingolstadt Hbf to Uhlandstr. 1', co(function*(t) {
	const journeys = yield client.journeys(ingolstadtHbf, uhlandstr1, {
		results: 3,
		departure: when
	})

	yield testJourneysStationToAddress({
		test: t,
		journeys,
		validate,
		fromId: ingolstadtHbf,
		to: uhlandstr1
	})
	t.end()
}))

test('Ingolstadt Hbf to Städtisches Freibad', co(function*(t) {
	const freibad = {
		type: 'location',
		id: '980000591',
		name: 'Ingolstadt, Städtisches Freibad (Sport)',
		latitude: 48.761473,
		longitude: 11.418602
	}
	const journeys = yield client.journeys(ingolstadtHbf, freibad, {
		results: 3,
		departure: when
	})

	yield testJourneysStationToPoi({
		test: t,
		journeys,
		validate,
		fromId: ingolstadtHbf,
		to: freibad
	})
	t.end()
}))

// todo: via works – with detour
// todo: without detour

test('earlier/later journeys', co(function* (t) {
	yield testEarlierLaterJourneys({
		test: t,
		fetchJourneys: client.journeys,
		validate,
		fromId: ingolstadtHbf,
		toId: audiParkplatz
	})

	t.end()
}))

test('refreshJourney', co(function* (t) {
	yield testRefreshJourney({
		test: t,
		fetchJourneys: client.journeys,
		refreshJourney: client.refreshJourney,
		validate,
		fromId: ingolstadtHbf,
		toId: audiParkplatz,
		when
	})
	t.end()
}))

test('trip details', co(function* (t) {
	const journeys = yield client.journeys(ingolstadtHbf, audiParkplatz, {
		results: 1, departure: when
	})

	const p = journeys[0].legs.find(leg => leg.line)
	t.ok(p.id, 'precondition failed')
	t.ok(p.line.name, 'precondition failed')
	const trip = yield client.trip(p.id, p.line.name, {when})

	validate(t, trip, 'journeyLeg', 'trip')
	t.end()
}))

test('departures at Ingolstadt Hbf', co(function*(t) {
	const departures = yield client.departures(ingolstadtHbf, {
		duration: 10, when
	})

	yield testDepartures({
		test: t,
		departures,
		validate,
		id: ingolstadtHbf
	})
	t.end()
}))

test('departures with station object', co(function* (t) {
	const deps = yield client.departures({
		type: 'station',
		id: ingolstadtHbf,
		name: 'Ingolstadt Hbf',
		location: {
			type: 'location',
			latitude: 48.822834,
			longitude: 11.461148
		}
	}, {when})

	validate(t, deps, 'departures', 'departures')
	t.end()
}))

test('arrivals at Ingolstadt Hbf', co(function*(t) {
	const arrivals = yield client.arrivals(ingolstadtHbf, {
		duration: 10, when
	})

	yield testArrivals({
		test: t,
		arrivals,
		validate,
		id: ingolstadtHbf
	})
	t.end()
}))

// todo: nearby

test('locations named "freibad"', co(function*(t) {
	const freibadIngolstadt = '980000591'
	const locations = yield client.locations('freibad', {
		results: 5
	})

	validate(t, locations, 'locations', 'locations')
	t.ok(locations.length <= 10)

	t.ok(locations.find(s => s.type === 'stop' || s.type === 'station'))
	t.ok(locations.find(s => s.id && s.name)) // POIs
	t.ok(locations.some((l) => {
		const trim = str => str && str.replace(/^0+/, '')
		return l.station && trim(l.station.id) === freibadIngolstadt || trim(l.id) === freibadIngolstadt
	}))

	t.end()
}))

test('station Ettinger Str.', co(function* (t) {
	const ettingerStr = '18304'
	const s = yield client.station(ettingerStr)

	validate(t, s, ['stop', 'station'], 'station')
	t.equal(s.id, ettingerStr)

	t.end()
}))

test('radar', co(function* (t) {
	const vehicles = yield client.radar({
		north: 48.74453,
		west: 11.42733,
		south: 48.73453,
		east: 11.43733
	}, {
		duration: 5 * 60, when, results: 10
	})

	validate(t, vehicles, 'movements', 'vehicles')
	t.end()
}))
