'use strict'

const products = require('./products')

const transformReqBody = (body) => {
	body.ext = 'DK.1'
	body.client = {
		type: 'IPH',
		id: 'DK',
		v: '1000700',
		name: 'banedanmarkADHOC',
		os: 'iOS'
	}
	body.ver = '1.11'
	body.auth = {aid: 'jwn7shelamenrb3v-iphone'}

	return body
}

const insaProfile = {
	locale: 'de-DE',
	timezone: 'Europe/Berlin',
	endpoint: 'https://www.dsb.dk/Rejseplan/bin/iphone.exe',
	transformReqBody,

	products: products,

	journeyLeg: true,
	radar: true
}

module.exports = insaProfile;
