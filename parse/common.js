'use strict'

// todo: move to separate file
const parseIcon = (i) => {
	const res = {
		type: i.res || null,
		title: i.text || null
	}
	if (i.fg) res.fgColor = i.fg
	if (i.bg) res.bgColor = i.bg
	return res
}

const parseCommonData = (profile, opt, raw) => {
	const res = Object.assign({}, raw)
	const c = raw.common || {}

	if (Array.isArray(c.opL)) {
		res.operators = c.opL.map(op => profile.parseOperator(profile, op))
	}

	res.icons = []
	if (Array.isArray(c.icoL)) res.icons = c.icoL.map(parseIcon)

	res.hints = []
	if (opt.remarks && Array.isArray(c.remL)) {
		res.hints = c.remL.map(hint => profile.parseHint(profile, hint, res.icons))
	}
	res.warnings = []
	if (opt.remarks && Array.isArray(c.himL)) {
		res.warnings = c.himL.map(w => profile.parseWarning(profile, w, res.icons))
	}

	if (Array.isArray(c.prodL)) {
		const parse = profile.parseLine(profile, opt, res)
		res.lines = c.prodL.map(parse)
	}

	if (Array.isArray(c.locL)) {
		const parse = loc => profile.parseLocation(profile, opt, res, loc)
		res.locations = c.locL.map(parse)

		for (let i = 0; i < res.locations.length; i++) {
			const raw = c.locL[i]
			const loc = res.locations[i]
			if ('number' === typeof raw.mMastLocX) {
				loc.station = Object.assign({}, d.locations[raw.mMastLocX])
				loc.station.type = 'station'
			} else if (raw.isMainMast) loc.type = 'station'
		}
	}

	res.polylines = []
	if (opt.polylines && Array.isArray(c.polyL)) res.polylines = c.polyL

	return res
}

module.exports = parseCommonData
