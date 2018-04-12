'use strict'

const products = require('./products')

const transformReqBody = (body) => {
	body.client = {
		type: 'IPH',
		id: 'VBN',
		v: 4020911,
		name: 'vbn-livePROD-ADHOC',
		os: 'iOS'
	}
	body.ver = '1.11'
	body.auth = {aid: 'rnOHBWhesvc7gFkd'}
	body.lang = 'de'

	return body
}

const insaProfile = {
	locale: 'de-DE',
	timezone: 'Europe/Berlin',
	endpoint: 'http://fahrplaner.vbn.de/bin/mgate.exe',
	transformReqBody,

	products: products,

	journeyLeg: true,
	radar: true
}

module.exports = insaProfile;
