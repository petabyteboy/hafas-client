'use strict'

const products = require('./products')

const transformReqBody = (body) => {
	body.client = {
		type: 'IPH',
		id: 'HAFAS',
		v: '4000000',
		name: 'cflPROD-STORE',
		os: 'iPhone OS 9.3.5'
	}
	body.ver = '1.16'
	body.auth = {aid: 'ALT2vl7LAFDFu2dz'}
	body.lang = 'de'

	return body
}

const insaProfile = {
	locale: 'de-DE',
	timezone: 'Europe/Berlin',
	// todo: use HTTPS, ignore invalid cert
	endpoint: 'http://horaires.cfl.lu/bin/mgate.exe',
	transformReqBody,

	products: products,

	trip: true,
	radar: true
	// todo: reachableFrom?
}

module.exports = insaProfile;
