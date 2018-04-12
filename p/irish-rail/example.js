'use strict'

const createClient = require('../..')
const irishProfile = require('.')

const client = createClient(irishProfile)

// from Dublin to Belfast Central
client.journeys('9909002', '9990840', {results: 1})
// client.departures('9909002', {duration: 5})
// client.locations('Dublin', {results: 2})
// client.locations('Hochschule Dublin', {results: 2})
// client.location('9909002') // Dublin
// client.nearby({
// 	type: 'location',
// 	latitude: 53.353,
// 	longitude: -6.247
// }, {distance: 200})
// client.radar({
// 	north: 53.35,
// 	west: -6.245,
// 	south: 53.34,
// 	east: -6.244
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
