'use strict'

const minBy = require('lodash/minBy')
const maxBy = require('lodash/maxBy')
const isObj = require('lodash/isObject')
const sortBy = require('lodash/sortBy')
const pRetry = require('p-retry')

const defaultProfile = require('./lib/default-profile')
const createParseBitmask = require('./parse/products-bitmask')
const createFormatProductsFilter = require('./format/products-filter')
const validateProfile = require('./lib/validate-profile')
const _request = require('./lib/request')

const isNonEmptyString = str => 'string' === typeof str && str.length > 0

const validateLocation = (loc, name = 'location') => {
	if (!isObj(loc)) {
		throw new Error(name + ' must be an object.')
	} else if (loc.type !== 'location') {
		throw new Error('invalid location object.')
	} else if ('number' !== typeof loc.latitude) {
		throw new Error(name + '.latitude must be a number.')
	} else if ('number' !== typeof loc.longitude) {
		throw new Error(name + '.longitude must be a number.')
	}
}

const createClient = (profile, userAgent, request = _request) => {
	profile = Object.assign({}, defaultProfile, profile)
	if (!profile.parseProducts) {
		profile.parseProducts = createParseBitmask(profile)
	}
	if (!profile.formatProductsFilter) {
		profile.formatProductsFilter = createFormatProductsFilter(profile)
	}
	validateProfile(profile)

	if ('string' !== typeof userAgent) {
		throw new Error('userAgent must be a string');
	}

	const _stationBoard = (station, type, parser, opt = {}) => {
		if (isObj(station)) station = profile.formatStation(station.id)
		else if ('string' === typeof station) station = profile.formatStation(station)
		else throw new Error('station must be an object or a string.')

		if ('string' !== typeof type || !type) {
			throw new Error('type must be a non-empty string.')
		}

		opt = Object.assign({
			direction: null, // only show departures heading to this station
			duration: 10, // show departures for the next n minutes
			stationLines: false, // parse & expose lines of the station?
			remarks: true, // parse & expose hints & warnings?
			// departures at related stations
			// e.g. those that belong together on the metro map.
			includeRelatedStations: true
		}, opt)
		opt.when = new Date(opt.when || Date.now())
		if (Number.isNaN(+opt.when)) throw new Error('opt.when is invalid')
		const products = profile.formatProductsFilter(opt.products || {})

		const dir = opt.direction ? profile.formatStation(opt.direction) : null
		return request(profile, userAgent, opt, {
			meth: 'StationBoard',
			req: {
				type,
				date: profile.formatDate(profile, opt.when),
				time: profile.formatTime(profile, opt.when),
				stbLoc: station,
				dirLoc: dir,
				jnyFltrL: [products],
				dur: opt.duration,
				getPasslist: false, // todo
				stbFltrEquiv: !opt.includeRelatedStations
			}
		})
		.then((d) => {
			if (!Array.isArray(d.jnyL)) return []
			const parse = parser(profile, opt, {
				locations: d.locations,
				lines: d.lines,
				hints: d.hints,
				warnings: d.warnings
			})
			return d.jnyL.map(parse)
			.sort((a, b) => new Date(a.when) - new Date(b.when))
		})
	}

	const departures = (station, opt = {}) => {
		return _stationBoard(station, 'DEP', profile.parseDeparture, opt)
	}
	const arrivals = (station, opt = {}) => {
		return _stationBoard(station, 'ARR', profile.parseArrival, opt)
	}

	const journeys = (from, to, opt = {}) => {
		from = profile.formatLocation(profile, from, 'from')
		to = profile.formatLocation(profile, to, 'to')

		if (('earlierThan' in opt) && ('laterThan' in opt)) {
			throw new Error('opt.earlierThan and opt.laterThan are mutually exclusive.')
		}
		if (('departure' in opt) && ('arrival' in opt)) {
			throw new Error('opt.departure and opt.arrival are mutually exclusive.')
		}
		let journeysRef = null
		if ('earlierThan' in opt) {
			if (!isNonEmptyString(opt.earlierThan)) {
				throw new Error('opt.earlierThan must be a non-empty string.')
			}
			if (('departure' in opt) || ('arrival' in opt)) {
				throw new Error('opt.earlierThan and opt.departure/opt.arrival are mutually exclusive.')
			}
			journeysRef = opt.earlierThan
		}
		if ('laterThan' in opt) {
			if (!isNonEmptyString(opt.laterThan)) {
				throw new Error('opt.laterThan must be a non-empty string.')
			}
			if (('departure' in opt) || ('arrival' in opt)) {
				throw new Error('opt.laterThan and opt.departure/opt.arrival are mutually exclusive.')
			}
			journeysRef = opt.laterThan
		}

		opt = Object.assign({
			results: null, // number of journeys – `null` means "whatever HAFAS returns"
			via: null, // let journeys pass this station?
			stopovers: false, // return stations on the way?
			transfers: 5, // maximum of 5 transfers
			transferTime: 0, // minimum time for a single transfer in minutes
			// todo: does this work with every endpoint?
			accessibility: 'none', // 'none', 'partial' or 'complete'
			bike: false, // only bike-friendly journeys
			tickets: false, // return tickets?
			polylines: false, // return leg shapes?
			remarks: true, // parse & expose hints & warnings?
			walkingSpeed: 'normal', // 'slow', 'normal', 'fast'
			// Consider walking to nearby stations at the beginning of a journey?
			startWithWalking: true
		}, opt)
		if (opt.via) opt.via = profile.formatLocation(profile, opt.via, 'opt.via')

		if (opt.when !== undefined) {
			throw new Error('opt.when is not supported anymore. Use opt.departure/opt.arrival.')
		}
		let when = new Date(), outFrwd = true
		if (opt.departure !== undefined && opt.departure !== null) {
			when = new Date(opt.departure)
			if (Number.isNaN(+when)) throw new Error('opt.departure is invalid')
		} else if (opt.arrival !== undefined && opt.arrival !== null) {
			when = new Date(opt.arrival)
			if (Number.isNaN(+when)) throw new Error('opt.arrival is invalid')
			outFrwd = false
		}

		const filters = [
			profile.formatProductsFilter(opt.products || {})
		]
		if (
			opt.accessibility &&
			profile.filters &&
			profile.filters.accessibility &&
			profile.filters.accessibility[opt.accessibility]
		) {
			filters.push(profile.filters.accessibility[opt.accessibility])
		}

		if (!['slow','normal','fast'].includes(opt.walkingSpeed)) {
			throw new Error('opt.walkingSpeed must be one of these values: "slow", "normal", "fast".')
		}

		const gisFltrL = []
		if (profile.journeysWalkingSpeed) {
			gisFltrL.push({
				meta: 'foot_speed_' + opt.walkingSpeed,
				mode: 'FB',
				type: 'M'
			})
		}

		// With protocol version `1.16`, the VBB endpoint *used to* fail with
		// `CGI_READ_FAILED` if you pass `numF`, the parameter for the number
		// of results. To circumvent this, we loop here, collecting journeys
		// until we have enough.
		// todo: revert this change, see https://github.com/public-transport/hafas-client/issues/76#issuecomment-424448449
		const journeys = []
		const more = (when, journeysRef) => {
			const query = {
				outDate: profile.formatDate(profile, when),
				outTime: profile.formatTime(profile, when),
				ctxScr: journeysRef,
				getPasslist: !!opt.stopovers,
				maxChg: opt.transfers,
				minChgTime: opt.transferTime,
				depLocL: [from],
				viaLocL: opt.via ? [{loc: opt.via}] : null,
				arrLocL: [to],
				jnyFltrL: filters,
				getTariff: !!opt.tickets,
				outFrwd,
				ushrp: !!opt.startWithWalking,
				gisFltrL,
				getPT: true, // todo: what is this?
				getIV: false, // todo: walk & bike as alternatives?
				getPolyline: !!opt.polylines
				// todo: `getConGroups: false` what is this?
			}
			if (profile.journeysNumF && opt.results !== null) query.numF = opt.results
			return request(profile, userAgent, opt, {
				cfg: {polyEnc: 'GPA'},
				meth: 'TripSearch',
				req: profile.transformJourneysQuery(query, opt)
			})
			.then((d) => {
				if (!Array.isArray(d.outConL)) return []

				const parse = profile.parseJourney(profile, opt, {
					locations: d.locations,
					lines: d.lines,
					hints: d.hints,
					warnings: d.warnings,
					polylines: opt.polylines && d.common.polyL || []
				})

				if (!journeys.earlierRef) journeys.earlierRef = d.outCtxScrB

				let latestDep = -Infinity
				for (let j of d.outConL) {
					j = parse(j)
					journeys.push(j)

					if (journeys.length >= opt.results) { // collected enough
						journeys.laterRef = d.outCtxScrF
						return journeys
					}
					const dep = +new Date(j.legs[0].departure)
					if (dep > latestDep) latestDep = dep
				}

				const when = new Date(latestDep)
				return more(when, d.outCtxScrF) // otherwise continue
			})
		}

		return more(when, journeysRef)
	}

	const refreshJourney = (refreshToken, opt = {}) => {
		if ('string' !== typeof refreshToken || !refreshToken) {
			new Error('refreshToken must be a non-empty string.')
		}

		opt = Object.assign({
			stopovers: false, // return stations on the way?
			tickets: false, // return tickets?
			polylines: false, // return leg shapes?
			remarks: true // parse & expose hints & warnings?
		}, opt)

		return request(profile, userAgent, opt, {
			meth: 'Reconstruction',
			req: {
				ctxRecon: refreshToken,
				getIST: true, // todo: make an option
				getPasslist: !!opt.stopovers,
				getPolyline: !!opt.polylines,
				getTariff: !!opt.tickets
			}
		})
		.then((d) => {
			if (!Array.isArray(d.outConL) || !d.outConL[0]) {
				throw new Error('invalid response')
			}

			const parse = profile.parseJourney(profile, opt, {
				locations: d.locations,
				lines: d.lines,
				hints: d.hints,
				warnings: d.warnings,
				polylines: opt.polylines && d.common.polyL || []
			})
			return parse(d.outConL[0])
		})
	}

	const locations = (query, opt = {}) => {
		if (!isNonEmptyString(query)) {
			throw new Error('query must be a non-empty string.')
		}
		opt = Object.assign({
			fuzzy: true, // find only exact matches?
			results: 10, // how many search results?
			stations: true,
			addresses: true,
			poi: true, // points of interest
			stationLines: false // parse & expose lines of the station?
		}, opt)

		const f = profile.formatLocationFilter(opt.stations, opt.addresses, opt.poi)
		return request(profile, userAgent, opt, {
			cfg: {polyEnc: 'GPA'},
			meth: 'LocMatch',
			req: {input: {
				loc: {
					type: f,
					name: opt.fuzzy ? query + '?' : query
				},
				maxLoc: opt.results,
				field: 'S' // todo: what is this?
			}}
		})
		.then((d) => {
			if (!d.match || !Array.isArray(d.match.locL)) return []
			const parse = profile.parseLocation
			return d.match.locL.map(loc => parse(profile, opt, {lines: d.lines}, loc))
		})
	}

	const station = (station, opt = {}) => {
		if ('object' === typeof station) station = profile.formatStation(station.id)
		else if ('string' === typeof station) station = profile.formatStation(station)
		else throw new Error('station must be an object or a string.')

		opt = Object.assign({
			stationLines: false // parse & expose lines of the station?
		}, opt)
		return request(profile, userAgent, opt, {
			meth: 'LocDetails',
			req: {
				locL: [station]
			}
		})
		.then((d) => {
			if (!d || !Array.isArray(d.locL) || !d.locL[0]) {
				// todo: proper stack trace?
				throw new Error('invalid response')
			}
			return profile.parseLocation(profile, opt, {lines: d.lines}, d.locL[0])
		})
	}

	const nearby = (location, opt = {}) => {
		validateLocation(location, 'location')

		opt = Object.assign({
			results: 8, // maximum number of results
			distance: null, // maximum walking distance in meters
			poi: false, // return points of interest?
			stations: true, // return stations?
			stationLines: false // parse & expose lines of the station?
		}, opt)

		return request(profile, userAgent, opt, {
			cfg: {polyEnc: 'GPA'},
			meth: 'LocGeoPos',
			req: {
				ring: {
					cCrd: {
						x: profile.formatCoord(location.longitude),
						y: profile.formatCoord(location.latitude)
					},
					maxDist: opt.distance || -1,
					minDist: 0
				},
				getPOIs: !!opt.poi,
				getStops: !!opt.stations,
				maxLoc: opt.results
			}
		})
		.then((d) => {
			if (!Array.isArray(d.locL)) return []
			const parse = profile.parseNearby
			return d.locL.map(loc => parse(profile, opt, d, loc))
		})
	}

	const trip = (id, lineName, opt = {}) => {
		if (!isNonEmptyString(id)) {
			throw new Error('id must be a non-empty string.')
		}
		if (!isNonEmptyString(lineName)) {
			throw new Error('lineName must be a non-empty string.')
		}
		opt = Object.assign({
			stopovers: true, // return stations on the way?
			polyline: false, // return a track shape?
			remarks: true // parse & expose hints & warnings?
		}, opt)

		return request(profile, userAgent, opt, {
			cfg: {polyEnc: 'GPA'},
			meth: 'JourneyDetails',
			req: {
				// todo: getTrainComposition
				jid: id,
				name: lineName,
				// HAFAS apparently ignores the date in the trip ID and uses the `date` field.
				// Thus, it will find a different trip if you pass the wrong date via `opt.when`.
				// date: profile.formatDate(profile, opt.when),
				getPolyline: !!opt.polyline
			}
		})
		.then((d) => {
			const parse = profile.parseJourneyLeg(profile, opt, {
				locations: d.locations,
				lines: d.lines,
				hints: d.hints,
				warnings: d.warnings,
				polylines: opt.polyline && d.common.polyL || []
			})

			const leg = { // pretend the leg is contained in a journey
				type: 'JNY',
				dep: minBy(d.journey.stopL, 'idx'),
				arr: maxBy(d.journey.stopL, 'idx'),
				jny: d.journey
			}
			return parse(d.journey, leg, !!opt.stopovers)
		})
	}

	const radar = ({north, west, south, east}, opt) => {
		if ('number' !== typeof north) throw new Error('north must be a number.')
		if ('number' !== typeof west) throw new Error('west must be a number.')
		if ('number' !== typeof south) throw new Error('south must be a number.')
		if ('number' !== typeof east) throw new Error('east must be a number.')
		if (north <= south) throw new Error('north must be larger than south.')
		if (east <= west) throw new Error('east must be larger than west.')

		opt = Object.assign({
			results: 256, // maximum number of vehicles
			duration: 30, // compute frames for the next n seconds
			// todo: what happens with `frames: 0`?
			frames: 3, // nr of frames to compute
			products: null, // optionally an object of booleans
			polylines: false // return a track shape for each vehicle?
		}, opt || {})
		opt.when = new Date(opt.when || Date.now())
		if (Number.isNaN(+opt.when)) throw new Error('opt.when is invalid')

		const durationPerStep = opt.duration / Math.max(opt.frames, 1) * 1000
		return request(profile, userAgent, opt, {
			meth: 'JourneyGeoPos',
			req: {
				maxJny: opt.results,
				onlyRT: false, // todo: does this mean "only realtime"?
				date: profile.formatDate(profile, opt.when),
				time: profile.formatTime(profile, opt.when),
				// todo: would a ring work here as well?
				rect: profile.formatRectangle(profile, north, west, south, east),
				perSize: opt.duration * 1000,
				perStep: Math.round(durationPerStep),
				ageOfReport: true, // todo: what is this?
				jnyFltrL: [
					profile.formatProductsFilter(opt.products || {})
				],
				trainPosMode: 'CALC' // todo: what is this? what about realtime?
			}
		})
		.then((d) => {
			if (!Array.isArray(d.jnyL) || d.jnyL.length === 0) return []

			const parse = profile.parseMovement(profile, opt, {
				locations: d.locations,
				lines: d.lines,
				hints: d.hints,
				warnings: d.warnings,
				polylines: opt.polyline && d.common.polyL || []
			})
			return d.jnyL.map(parse)
		})
	}

	const reachableFrom = (address, opt = {}) => {
		validateLocation(address, 'address')

		opt = Object.assign({
			when: Date.now(),
			maxTransfers: 5, // maximum of 5 transfers
			maxDuration: 20, // maximum travel duration in minutes
			products: {}
		}, opt)
		if (Number.isNaN(+opt.when)) throw new Error('opt.when is invalid')

		const refetch = () => {
			return request(profile, userAgent, opt, {
				meth: 'LocGeoReach',
				req: {
					loc: profile.formatLocation(profile, address, 'address'),
					maxDur: opt.maxDuration,
					maxChg: opt.maxTransfers,
					date: profile.formatDate(profile, opt.when),
					time: profile.formatTime(profile, opt.when),
					period: 120, // todo: what is this?
					jnyFltrL: [
						profile.formatProductsFilter(opt.products || {})
					]
				}
			})
			.then((d) => {
				if (!Array.isArray(d.posL)) {
					console.error('d', d)
					const err = new Error('invalid response')
					err.shouldRetry = true
					throw err
				}

				const byDuration = []
				let i = 0, lastDuration = NaN
				for (const pos of sortBy(d.posL, 'dur')) {
					const loc = d.locations[pos.locX]
					if (!loc) continue
					if (pos.dur !== lastDuration) {
						lastDuration = pos.dur
						i = byDuration.length
						byDuration.push({
							duration: pos.dur,
							stations: [loc]
						})
					} else {
						byDuration[i].stations.push(loc)
					}
				}
				return byDuration
			})
		}

		return pRetry(refetch, {
			retries: 3,
			factor: 2,
			minTimeout: 2 * 1000
		})
	}

	const client = {departures, arrivals, journeys, locations, station, nearby}
	if (profile.trip) client.trip = trip
	if (profile.radar) client.radar = radar
	if (profile.refreshJourney) client.refreshJourney = refreshJourney
	if (profile.reachableFrom) client.reachableFrom = reachableFrom
	Object.defineProperty(client, 'profile', {value: profile})
	return client
}

module.exports = createClient
