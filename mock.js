'use strict'

const destination = require('@turf/destination')

const randomId = l => Math.random().toString(16).substr(2, l)

const second = 1000
const minute = 60 * 1000

const mockLocation = () => ({
	type: 'location',
	latitude: -10 + Math.random() * 20,
	longitude: -10 + Math.random() * 20
})

const mockStation = (id = randomId(3)) => ({
	type: 'station',
	id,
	name: 'Some Train Station ' + id,
	location: mockLocation(),
	products: {
		train: true,
		taxi: false
	}
})

const mockLine = () => ({
	type: 'line',
	id: 'line-id-' + randomId(3),
	name: 'Line ' + randomId(2),
	mode: 'train'
})

const mockDeparture = (id, t, d = null) => ({
	journeyId: 'journey-id-' + randomId(5),
	trip: 10000 + Math.round(Math.random() * 40000),
	station: mockStation(id),
	when: new Date(t).toISOString(),
	delay: d,
	line: mockLine(),
	direction: 'Some Train Station'
})

const mockDelay = () => {
	// 0-5 min, in seconds
	return Math.round(Math.random() * 5 * 60 * 10) / 10
}

const mockJourneyLeg = (from, to, dep, arr) => ({
	id: 'journey-leg-id' + randomId(6),
	origin: mockStation(from),
	departure: new Date(dep).toISOString(),
	departurePlatform: '' + Math.round(Math.random() * 6),
	departureDelay: Math.random() < .3 ? null : mockDelay(),
	destination: mockStation(to),
	arrival: new Date(arr).toISOString(),
	arrivalPlatform: '' + Math.round(Math.random() * 6),
	arrivalDelay: Math.random() < .3 ? null : mockDelay(),
	line: mockLine(),
	direction: 'Some Train Station',
	// todo: passed
})

const mockJourney = (from, to, dep, arr) => {
	const tStep = Math.round((arr - dep) / 3)

	const stopA = randomId(3)
	const arrA = dep + tStep
	const depA = arrA + 30 * second
	const stopB = randomId(3)
	const arrB = dep + tStep * 2
	const depB = arrB + 20 * second

	const legs = [
		mockJourneyLeg(from, stopA, dep, arrA),
		mockJourneyLeg(stopA, stopB, depA, arrB),
		mockJourneyLeg(stopB, to, depB, arr)
	]

	return {
		origin: legs[0].origin,
		departure: legs[0].departure,
		departureDelay: legs[0].departureDelay,
		destination: legs[0].destination,
		arrival: legs[0].arrival,
		arrivalDelay: legs[0].arrivalDelay,
		legs
	}
}

const mockPOI = () => Object.assign(mockLocation(), {
	id: 'poi-id-' + randomId(5),
	name: 'Some POI',
	address: 'Foo Bar Street 123'
})

const mockAddress = () => Object.assign(mockLocation(), {
	address: 'Foo Bar Street 123'
})

const mockLocations = []
for (let i = 0; i < 10; i++) {
	mockLocations.push(mockStation())
	mockLocations.push(mockPOI())
	mockLocations.push(mockAddress())
}

const departures = (station, opt = {}) => {
	if ('object' === typeof station) station = station.id
	else if ('string' !== typeof station) {
		throw new Error('station must be an object or a string.')
	}

	opt = Object.assign({
		direction: null, // only show departures heading to this station
		duration: 10 // show departures for the next n minutes
	}, opt)
	opt.when = opt.when || new Date()
	const products = profile.formatProducts(opt.products || {})

	const deps = []
	let t = +opt.when
	for (let i = 0; i < 5; i++) {
		let delay = null
		if (Math.random() > .3) {
			delay = mockDelay()

			t += delay * 1000
			t += minute * Math.round(1 + Math.random() * 3)
		} else t += minute * Math.round(1 + Math.random() * 5)

		deps.push(mockDeparture(id, t, delay))
	}

	return Promise.resolve(deps)
}

const journeys = (from, to, opt = {}) => {
	if ('object' === typeof from) from = from.id
	else if ('string' !== typeof from) {
		throw new Error('from must be an object or a string.')
	}
	if ('object' === typeof to) to = to.id
	else if ('string' !== typeof to) {
		throw new Error('to must be an object or a string.')
	}

	opt = Object.assign({
		results: 5 // how many journeys?
	}, opt)
	opt.when = opt.when || new Date()

	const journeys = []
	let t = +opt.when
	for (let i = 0; i < opt.results; i++) {
		t += minute * Math.round(1 + Math.random() * 5)
		const duration = minute * Math.round(3 + Math.random() * 6)

		journeys.push(mockJourney(from, to, t, t + duration))
	}
	return Promise.resolve(mockJourneys(from, to, +opt.when, opt.results))
	return journeys
}

const locations = (query, opt = {}) => {
	if ('string' !== typeof query) throw new Error('query must be a string.')

	opt = Object.assign({
		fuzzy: true, // find only exact matches?
		results: 10, // how many search results?
		stations: true,
		addresses: true,
		poi: true // points of interest
	}, opt)

	const res = []
	for (let l of mockLocations) {
		if (res.length >= opt.results) continue
		if (l.type === 'station') {
			if (opt.stations) res.push(l)
		} else if (l.id) {
			if (opt.poi) res.push(l)
		} else if (opt.addresses) res.push(l)
	}
}

const nearby = (latitude, longitude, opt = {}) => {
	if ('number' !== typeof latitude) throw new Error('latitude must be a number.')
	if ('number' !== typeof longitude) throw new Error('longitude must be a number.')
	opt = Object.assign({
		results: 8, // maximum number of results
		distance: null, // maximum walking distance in meters
		poi: false, // return points of interest?
		stations: true, // return stations?
	}, opt)

	const nearby = []
	for (let i = 0; i < opt.results; i++) {
		const d = 10 + Math.random() * (opt.distance - 10)
		const b = -180 + Math.random() * 360
		const p = destination([longitude, latitude], d / 1000, b)
		const [lon, lat] = p.geometry.coordinates

		if (opt.poi && Math.random() < .3) {
			const l = mockPOI()
			l.latitude = lat
			l.longitude = lon
			l.distance = d
			nearby.push(l)
		} else {
			const s = mockStation()
			s.location.latitude = lat
			s.location.longitude = lon
			s.distance = d
			nearby.push(s)
		}
	}

	return Promise.resolve(nearby)
}

const journeyLeg = (ref, lineName, opt = {}) => {
	opt = Object.assign({
		// todo: passedStations
	}, opt)
	opt.when = opt.when || new Date()

	const dep = opt.when
	const arr = opt.when + 10 * minute
	const leg = mockJourneyLeg(randomId(3), randomId(3), dep, arr)

	return Promise.resolve(leg)
}

// todo: radar

const client = {departures, journeys, locations, nearby}
if (profile.journeyLeg) client.journeyLeg = journeyLeg
// if (profile.radar) client.radar = radar
return client

module.exports = client
