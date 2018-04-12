'use strict'

const products = require('./products')

const transformReqBody = (body) => {
	body.client = {
		type: 'IPH',
		id: 'IRISHRAIL',
		v: '3000800',
		name: 'IrishRailPROD',
		os: 'iPhone OS 9.3.5'
	}
	body.ver = '1.11'
	body.auth = {aid: 'P9bplgVCGnozdgQE'}
	body.lang = 'de'

	return body
}

const insaProfile = {
	locale: 'de-DE',
	timezone: 'Europe/Berlin',
	// todo: use HTTPS, ignore invalid cert
	endpoint: 'http://journeyplanner.irishrail.ie/bin/mgate.exe',
	transformReqBody,

	products: products,

	journeyLeg: true,
	radar: true
}

module.exports = insaProfile;
