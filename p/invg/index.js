'use strict'

const products = require('./products')

const transformReqBody = (body) => {
	body.client = {
		type: 'IPH',
		id: 'INVG',
		name: 'invgPROD',
		v: '1020200'
	}
	body.ver = '1.16'
	body.auth = {type: 'AID', aid: 'GITvwi3BGOmTQ2a5'}

	return body
}

const invgProfile = {
	locale: 'de-DE',
	timezone: 'Europe/Berlin',
	endpoint: 'https://fpa.invg.de/bin/mgate.exe',

	// https://github.com/public-transport/hafas-client/issues/93#issuecomment-437594291
	salt: Buffer.from('ERxotxpwFT7uYRsI', 'utf8'),
	addMicMac: true,

	transformReqBody,

	products,

	trip: true,
	radar: true,
	refreshJourney: true
}

module.exports = invgProfile
