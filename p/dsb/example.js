'use strict'

const createClient = require('../..')
const dsbProfile = require('.')

const client = createClient(dsbProfile)

// from København Central to Aalborg
// client.journeys('008600626', '008600020', {results: 1})
client.departures('008600626', { duration: 5 })
// client.locations('KØbenhaven', {results: 2})
// client.location('008600626') // København Central
// client.nearby({
// 	type: 'location',
// 	latitude: 55.673,
// 	longitude: 12.566
// }, {distance: 200})
// client.radar({
// 	north: 55.673,
// 	west: 12.566,
// 	south: 55.672,
// 	east: 12.567
// }, {results: 10})

// .then(([journey]) => {
// 	const leg = journey.legs[0]
// 	return client.journeyLeg(leg.id, leg.line.name)
// })

.then(data => {
	console.log(require('util').inspect(data, { depth: null }))
})
.catch(console.error)
