'use strict'

const createClient = require('../..')
const cmtaProfile = require('.')

const client = createClient(cmtaProfile, 'hafas-client-example')

// Ingolstadt Hbf to Audi Parkplatz
client.journeys('8000183', '84999', {results: 1})
// .then(([journey]) => {
// 	const leg = journey.legs[0]
// 	return client.trip(leg.id, leg.line.name, {polyline: true})
// })
// .then(([journey]) => {
// 	return client.refreshJourney(journey.refreshToken, {stopovers: true, remarks: true})
// })

// client.departures('8000183', {duration: 5})
// client.arrivals('8000183', {duration: 10, stationLines: true})

// client.locations('tillystr 1', {results: 2})
// client.station('84999') // Audi Parkplatz
// client.nearby({
// 	type: 'location',
// 	latitude: 48.74453,
// 	longitude: 11.43733
// }, {distance: 200})

// client.radar({
// 	north: 48.74453,
// 	west: 11.42733,
// 	south: 48.73453,
// 	east: 11.43733
// }, {results: 10})

// todo: `reachableFrom` with `Ingolstadt, Tillystraße 1` 48.745769 | 11.432814

.then((data) => {
	console.log(require('util').inspect(data, {depth: null}))
})
.catch(console.error)
