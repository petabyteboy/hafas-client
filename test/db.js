'use strict'

const stations = require('db-stations/full.json')
const a = require('assert')
const tapePromise = require('tape-promise').default
const tape = require('tape')
const isRoughlyEqual = require('is-roughly-equal')
const maxBy = require('lodash/maxBy')
const flatMap = require('lodash/flatMap')

const {createWhen} = require('./lib/util')
const co = require('./lib/co')
const createClient = require('..')
const dbProfile = require('../p/db')
const products = require('../p/db/products')
const {
	station: createValidateStation,
	journeyLeg: createValidateJourneyLeg
} = require('./lib/validators')
const createValidate = require('./lib/validate-fptf-with')
const testJourneysStationToStation = require('./lib/journeys-station-to-station')
const testJourneysStationToAddress = require('./lib/journeys-station-to-address')
const testJourneysStationToPoi = require('./lib/journeys-station-to-poi')
const testEarlierLaterJourneys = require('./lib/earlier-later-journeys')
const testLegCycleAlternatives = require('./lib/leg-cycle-alternatives')
const testRefreshJourney = require('./lib/refresh-journey')
const journeysFailsWithNoProduct = require('./lib/journeys-fails-with-no-product')
const testDepartures = require('./lib/departures')
const testDeparturesInDirection = require('./lib/departures-in-direction')
const testDeparturesWithoutRelatedStations = require('./lib/departures-without-related-stations')
const testArrivals = require('./lib/arrivals')
const testJourneysWithDetour = require('./lib/journeys-with-detour')
const testReachableFrom = require('./lib/reachable-from')

const isObj = o => o !== null && 'object' === typeof o && !Array.isArray(o)
const minute = 60 * 1000

const when = createWhen('Europe/Berlin', 'de-DE')

const cfg = {
	when,
	stationCoordsOptional: false,
	products
}

const _validateStation = createValidateStation(cfg)
const validateStation = (validate, s, name) => {
	_validateStation(validate, s, name)
	const match = stations.some(station => (
		station.id === s.id ||
		(station.additionalIds && station.additionalIds.includes(s.id))
	))
	if (!match) {
		console.error(name + `.id: unknown ID "${s.id}"`)
	}
}

const validate = createValidate(cfg, {
	station: validateStation
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
const client = createClient(dbProfile, 'public-transport/hafas-client:test')

const berlinHbf = '8011160'
const münchenHbf = '8000261'
const jungfernheide = '8011167'
const blnSchwedterStr = '732652'
const westhafen = '008089116'
const wedding = '008089131'
const württembergallee = '731084'
const regensburgHbf = '8000309'
const blnOstbahnhof = '8010255'
const blnTiergarten = '8089091'
const blnJannowitzbrücke = '8089019'

test('journeys – Berlin Schwedter Str. to München Hbf', co(function* (t) {
	const journeys = yield client.journeys(blnSchwedterStr, münchenHbf, {
		results: 3,
		departure: when,
		stopovers: true
	})

	yield testJourneysStationToStation({
		test: t,
		journeys,
		validate,
		fromId: blnSchwedterStr,
		toId: münchenHbf
	})
	// todo: find a journey where there pricing info is always available
	for (let journey of journeys) {
		if (journey.price) assertValidPrice(t, journey.price)
	}

	t.end()
}))

// todo: journeys, only one product

test('journeys – fails with no product', (t) => {
	journeysFailsWithNoProduct({
		test: t,
		fetchJourneys: client.journeys,
		fromId: blnSchwedterStr,
		toId: münchenHbf,
		when,
		products
	})
	t.end()
})

test('Berlin Schwedter Str. to Torfstraße 17', co(function* (t) {
	const torfstr = {
		type: 'location',
		address: 'Torfstraße 17',
		latitude: 52.5416823,
		longitude: 13.3491223
	}
	const journeys = yield client.journeys(blnSchwedterStr, torfstr, {
		results: 3,
		departure: when
	})

	yield testJourneysStationToAddress({
		test: t,
		journeys,
		validate,
		fromId: blnSchwedterStr,
		to: torfstr
	})
	t.end()
}))

test('Berlin Schwedter Str. to ATZE Musiktheater', co(function* (t) {
	const atze = {
		type: 'location',
		id: '991598902',
		name: 'ATZE Musiktheater',
		latitude: 52.542417,
		longitude: 13.350437
	}
	const journeys = yield client.journeys(blnSchwedterStr, atze, {
		results: 3,
		departure: when
	})

	yield testJourneysStationToPoi({
		test: t,
		journeys,
		validate,
		fromId: blnSchwedterStr,
		to: atze
	})
	t.end()
}))

test('journeys: via works – with detour', co(function* (t) {
	// Going from Westhafen to Wedding via Württembergalle without detour
	// is currently impossible. We check if the routing engine computes a detour.
	const journeys = yield client.journeys(westhafen, wedding, {
		via: württembergallee,
		results: 1,
		departure: when,
		stopovers: true
	})

	yield testJourneysWithDetour({
		test: t,
		journeys,
		validate,
		detourIds: [württembergallee]
	})
	t.end()
}))

// todo: without detour

test('earlier/later journeys, Jungfernheide -> München Hbf', co(function* (t) {
	yield testEarlierLaterJourneys({
		test: t,
		fetchJourneys: client.journeys,
		validate,
		fromId: jungfernheide,
		toId: münchenHbf,
		when
	})

	t.end()
}))

test('journeys – leg cycle & alternatives', co(function* (t) {
	yield testLegCycleAlternatives({
		test: t,
		fetchJourneys: client.journeys,
		fromId: blnTiergarten,
		toId: blnJannowitzbrücke
	})
	t.end()
}))

test('refreshJourney', co(function* (t) {
	yield testRefreshJourney({
		test: t,
		fetchJourneys: client.journeys,
		refreshJourney: client.refreshJourney,
		validate,
		fromId: jungfernheide,
		toId: münchenHbf,
		when
	})
	t.end()
}))

test('journeysFromTrip – U Kochstr./Checkpoint Charlie to U Stadtmitte, then to U Klosterstr.', co(function* (t) {
	const blnKochstrCheckpoint = '730874'
	const blnStadtmitteU6 = '732541'
	const berlinKlosterstr = '732545'

	const isTransitLeg = leg => !!leg.line
	const stationIdOrStopId = stop => stop.station && stop.station.id || stop.id
	const departureOf = st => +new Date(st.departure || st.formerScheduledDeparture)
	const arrivalOf = st => +new Date(st.arrival || st.formerScheduledArrival)

	// Note: `journeysFromTrip` only supports queries *right now*, so can't use the unified
	// `when` used in all other tests. To make this test less brittle, we pick a connection
	// that is served all night. 🙄
	const when = new Date()
	const customCfg = Object.assign({}, cfg)
	customCfg.when = when
	const validate = createValidate(customCfg)

	// Find a U6 that will soon go from U Kochstr./Checkpoint Charlie to U Stadtmitte (thus to the north).
	const _journeys = yield client.journeys(blnKochstrCheckpoint, blnStadtmitteU6, {
		departure: when,
		transfers: 0, products: {regionalExp: false, regional: false, suburban: false},
		results: 3, stopovers: true, remarks: false
	})
	const _journey = _journeys.find((j) => {
		const tLeg = j.legs.find(isTransitLeg)
		return tLeg.departure && new Date(tLeg.departure) > Date.now()
	})
	const _leg = _journey.legs.find(isTransitLeg)
	t.equal(stationIdOrStopId(_leg.destination), blnStadtmitteU6, 'precondition failed: leg to U Stadtmitte not found')

	const _trip = yield client.trip(_leg.id, _leg.line.name, {stopovers: true, remarks: false})
	const _tripIds = flatMap(_trip.stopovers.map((st) => {
		return st.station ? [st.stop.id, st.station.id] : [st.stop.id]
	}))
	const idxInTrip = (stop) => {
		let i = -1
		if (stop.station) i = _tripIds.indexOf(stop.station.id)
		if (i === -1) i = _tripIds.indexOf(stop.id)
		return i
	}

	// Find a stopover in the past.
	const prevStopover = maxBy(_trip.stopovers.filter(st => departureOf(st) < when), departureOf)
	t.ok(prevStopover, 'precondition failed: no past stopover found')
	const prevStopId = prevStopover.stop.id
	const prevStationId = prevStopover.stop.station && prevStopover.stop.station.id || NaN

	// todo: Error: Suche aus dem Zug: Vor Abfahrt des Zuges
	const journeys = yield client.journeysFromTrip(_leg.id, prevStopover, berlinKlosterstr, {
		stopovers: true, remarks: false
	})

	// Validate with fake prices.
	const withFakePrice = (j) => {
		const clone = Object.assign({}, j)
		clone.price = {amount: 123, currency: 'EUR'}
		return clone
	}
	validate(t, journeys.map(withFakePrice), 'journeys', 'journeysFromTrip')

	for (let i = 0; i < journeys.length; i++) {
		const j = journeys[i]
		const n = `journeys[${i}]`

		// 1st & 2nd transit leg
		const iLegA = j.legs.findIndex(l => !!l.line)
		const legA = j.legs[iLegA]
		const iLegB = 1 + j.legs.slice(iLegA + 1).findIndex(l => !!l.line)
		const legB = j.legs[iLegB]

		const nChange = n + `.legs[${iLegA}].destination`
		const changeId = stationIdOrStopId(legA.destination)
		t.equal(changeId, blnStadtmitteU6, nChange + ' is not U Stadtmitte (U6)')
		const destId = stationIdOrStopId(legB.destination)
		t.equal(destId, berlinKlosterstr, n + `.legs[${iLegB}].destination is not U Spittelmarkt`)

		// We expect the first transit leg of the journey to go from the stop the train (trip)
		// has *previously* been at to the stop where to change (U Mehringdamm).
		// Because of inexact departure times, we can only assert that

		// - the leg *doesn't* start with the first stopover of the trip
		const nOrigin = n + `.legs[${iLegA}].origin`
		const originI = idxInTrip(legA.origin)
		t.notOk(originI === -1, nOrigin + ' is missing in the trip')
		t.ok(originI > 0, nOrigin + ' is the first stopover of the trip')

		// - on the trip, the change stop is *after* the origin
		const changeI = idxInTrip(legA.destination)
		t.notOk(changeI === -1, nChange + ' is missing in the trip')
		t.ok(changeI > originI)
	}

	t.end()
}))

test('trip details', co(function* (t) {
	const journeys = yield client.journeys(berlinHbf, münchenHbf, {
		results: 1, departure: when
	})

	const p = journeys[0].legs[0]
	t.ok(p.id, 'precondition failed')
	t.ok(p.line.name, 'precondition failed')
	const trip = yield client.trip(p.id, p.line.name, {when})

	const validateJourneyLeg = createValidateJourneyLeg(cfg)
	const validate = createValidate(cfg, {
		journeyLeg: (validate, leg, name) => {
			if (!leg.direction) leg.direction = 'foo' // todo, see #49
			validateJourneyLeg(validate, leg, name)
		}
	})
	validate(t, trip, 'journeyLeg', 'trip')

	t.end()
}))

test('departures at Berlin Schwedter Str.', co(function* (t) {
	const departures = yield client.departures(blnSchwedterStr, {
		duration: 5, when
	})

	yield testDepartures({
		test: t,
		departures,
		validate,
		id: blnSchwedterStr
	})
	t.end()
}))

test('departures with station object', co(function* (t) {
	const deps = yield client.departures({
		type: 'station',
		id: jungfernheide,
		name: 'Berlin Jungfernheide',
		location: {
			type: 'location',
			latitude: 1.23,
			longitude: 2.34
		}
	}, {when})

	validate(t, deps, 'departures', 'departures')
	t.end()
}))

test('departures at Berlin Hbf in direction of Berlin Ostbahnhof', co(function* (t) {
	yield testDeparturesInDirection({
		test: t,
		fetchDepartures: client.departures,
		fetchTrip: client.trip,
		id: berlinHbf,
		directionIds: [blnOstbahnhof, '8089185', '732676'],
		when,
		validate
	})
	t.end()
}))

test('departures without related stations', co(function* (t) {
	yield testDeparturesWithoutRelatedStations({
		test: t,
		fetchDepartures: client.departures,
		id: '8089051', // Berlin Yorckstr. (S1)
		when,
		products: {bus: false},
		linesOfRelatedStations: ['S 2', 'S 25', 'S 26', 'U 7']
	})
	t.end()
}))

test('arrivals at Berlin Schwedter Str.', co(function* (t) {
	const arrivals = yield client.arrivals(blnSchwedterStr, {
		duration: 5, when
	})

	yield testArrivals({
		test: t,
		arrivals,
		validate,
		id: blnSchwedterStr
	})
	t.end()
}))

test('nearby Berlin Jungfernheide', co(function* (t) {
	const nearby = yield client.nearby({
		type: 'location',
		latitude: 52.530273,
		longitude: 13.299433
	}, {
		results: 2, distance: 400
	})

	validate(t, nearby, 'locations', 'nearby')

	t.equal(nearby.length, 2)

	const s0 = nearby[0]
	// todo: trim IDs
	t.ok(s0.id === '008011167' || s0.id === jungfernheide)
	t.equal(s0.name, 'Berlin Jungfernheide')
	t.ok(isRoughlyEqual(.0005, s0.location.latitude, 52.530408))
	t.ok(isRoughlyEqual(.0005, s0.location.longitude, 13.299424))
	t.ok(s0.distance >= 0)
	t.ok(s0.distance <= 100)

	t.end()
}))

test('locations named Jungfernheide', co(function* (t) {
	const locations = yield client.locations('Jungfernheide', {
		results: 10
	})

	validate(t, locations, 'locations', 'locations')
	t.ok(locations.length <= 10)
	t.ok(locations.some((l) => {
		// todo: trim IDs
		if (l.station) {
			if (l.station.id === '008011167' || l.station.id === jungfernheide) return true
		}
		return l.id === '008011167' || l.id === jungfernheide
	}), 'Jungfernheide not found')

	t.end()
}))

test('station', co(function* (t) {
	const s = yield client.station(regensburgHbf)

	validate(t, s, ['stop', 'station'], 'station')
	t.equal(s.id, regensburgHbf)

	t.end()
}))

test('reachableFrom', co(function* (t) {
	const torfstr17 = {
		type: 'location',
		address: 'Torfstraße 17',
		latitude: 52.5416823,
		longitude: 13.3491223
	}

	yield testReachableFrom({
		test: t,
		reachableFrom: client.reachableFrom,
		address: torfstr17,
		when,
		maxDuration: 15,
		validate
	})
	t.end()
}))
