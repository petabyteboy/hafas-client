'use strict'

const createClient = require('../..')
const insaProfile = require('.')

const client = createClient(insaProfile)

// from Bremen Hbf to Bremerhaven Hbf
// client.journeys('008000050', '008000051', {results: 1})
client.departures('008000050', {duration: 5})
// client.locations('Bremen Hbf', {results: 2})
// client.locations('Hochschule Bremen', {results: 2})
// client.location('008000050') // Bremen Hbf
// client.nearby({
// 	type: 'location',
// 	latitude: 53.1,
// 	longitude: 8.81
// }, {distance: 200})
// client.radar({
// 	north: 53.1,
// 	west: 8.81,
// 	south: 53.0,
// 	east: 8.82
// }, {results: 10})

// .then(([journey]) => {
// 	const leg = journey.legs[0]
// 	console.error(leg.id, leg.line.name)
// 	return client.journeyLeg(leg.id, leg.line.name)
// })

.then(data => {
	console.log(require('util').inspect(data, { depth: null }))
})
.catch(console.error)
