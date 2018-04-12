'use strict'

module.exports = [
	{
		id: 'express-train',
		mode: 'train',
		bitmasks: [1],
		name: 'InterCityExpress',
		short: 'ICE',
		default: true
	},
	{
		id: 'national-train',
		mode: 'train',
		bitmasks: [2],
		name: 'InterCity, EuroCity, CityNightLine',
		short: 'IC/EC/CNL',
		default: true
	},
	{
		id: 'national-train-2',
		mode: 'train',
		bitmasks: [4],
		name: 'InterRegio',
		short: 'IR',
		default: true
	},
	// {
	// 	id: 'local-train',
	// 	mode: 'train',
	// 	bitmasks: [8],
	// 	name: 'RegionalExpress & RegionalBahn',
	// 	short: 'RE/RB',
	// 	default: true
	// },
	{
		id: 'suburban',
		mode: 'train',
		bitmasks: [16],
		name: 'S-Bahn',
		short: 'S',
		default: true
	},
	{
		id: 'bus',
		mode: 'bus',
		bitmasks: [32],
		name: 'Bus',
		short: 'Bus',
		default: true
	},
	{
		id: 'watercraft',
		mode: 'watercraft',
		bitmasks: [64],
		name: 'Schiff',
		short: 'Schiff',
		default: true
	},
	{
		id: 'subway',
		mode: 'train',
		bitmasks: [128],
		name: 'U-Bahn',
		short: 'U',
		default: true
	},
	{
		id: 'tram',
		mode: 'train',
		bitmasks: [256],
		name: 'Tram',
		short: 'Tram',
		default: true
	},
	{
		id: 'on-call',
		mode: null, // todo
		bitmasks: [256],
		name: 'Anrufverkehr',
		short: 'Anrufv.',
		default: true
	}
]
