'use strict'

const shorten = require('vbb-short-station-name')
const {to12Digit, to9Digit} = require('vbb-translate-ids')

const _formatStation = require('../../format/station')
const _parseLine = require('../../parse/line')
const _parseLocation = require('../../parse/location')
const createParseBitmask = require('../../parse/products-bitmask')
const createFormatBitmask = require('../../format/products-bitmask')

const modes = require('./modes')

const formatBitmask = createFormatBitmask(modes)

const transformReqBody = (body) => {
	body.client = {type: 'IPA', id: 'BVG'}
	body.ext = 'VBB.2'
	body.ver = '1.11'
	body.auth = {type: 'AID', aid: 'hafas-vbb-apps'}

	return body
}

const parseLine = (profile, l) => {
	const res = _parseLine(profile, l)

	res.mode = res.product = null
	if ('class' in res) {
		const data = modes.bitmasks[parseInt(res.class)]
		if (data) {
			res.mode = data.mode
			res.product = data.type
		}
	}

	return res
}

const parseLocation = (profile, l) => {
	const res = _parseLocation(profile, l)

	// todo: shorten has been made for stations, not any type of location
	res.name = shorten(res.name)

	if (res.type === 'station') {
		res.id = to12Digit(res.id)
		// todo: https://github.com/derhuerst/vbb-hafas/blob/1c64bfe42422e2648b21016d233c808460250308/lib/parse.js#L67-L75
	}
	return res
}

const isIBNR = /^\d{9,}$/
const formatStation = (id) => {
	if (!isIBNR.test(id)) throw new Error('station ID must be an IBNR.')
	id = to9Digit(id)
	return _formatStation(id)
}

const defaultProducts = {
	suburban: true,
	subway: true,
	tram: true,
	bus: true,
	ferry: true,
	express: true,
	regional: true
}
const formatProducts = (products) => {
	products = Object.assign(Object.create(null), defaultProducts, products)
	return {
		type: 'PROD',
		mode: 'INC',
		value: formatBitmask(products) + ''
	}
}

const vbbProfile = {
	timezone: 'Europe/Berlin',
	endpoint: 'https://fahrinfo.vbb.de/bin/mgate.exe',
	transformReqBody,

	parseStationName: shorten,
	parseLocation,
	parseLine,
	parseProducts: createParseBitmask(modes.bitmasks),

	formatStation,
	formatProducts,

	journeyPart: true,
	radar: true
}

module.exports = vbbProfile