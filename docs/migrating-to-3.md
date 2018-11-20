# Migrating to `hafas-client@3`

## New `User-Agent` parameter

Pass an additional `User-Agent` string into `createClient`:

```js
const createClient = require('hafas-client')
const dbProfile = require('hafas-client/p/db')

const client = createClient(dbProfile, 'my-awesome-program')
```

Pick a name that describes your program and – if possible – the website/repo of it.

## If you use the `journeyLeg()` method…

…change the `journeyLeg(id, lineName)` call to `trip(id, lineName)`. c8ff217

## If you use the `journeys()` or `trip()` methods…

- …instead of `journey.departure`, use `journey.legs[0].departure`. 005f3f8
- …instead of `journey.arrival`, use `journey.legs[last].arrival`. 005f3f8
- …rename `opt.passedStations` to `opt.stopovers`. ebe4fa6
- …rename `leg.journeyId` to `leg.id`. 2e6aefe
- …rename `leg.passed` to `leg.stopovers`. 6611f26
- …rename `leg.stopovers[].station` to `leg.stopovers[].stop`. 3e672ee

## If you use the `journeys()` method and `opt.when`…

…use `opt.departure` instead. Use `opt.arrival` to get journeys arriving before the specified date+time. This replaces the `opt.when` & `opt.whenRepresents` options from `hafas-client@2`. c82ad23

## If you use the `journeys()` and `opt.polylines` or `trip()` and `opt.polyline`…

…`leg.polyline` will be [parsed for you now](https://github.com/public-transport/hafas-client/blob/f6c824eecb459181ea90ddf41bf1a1e8b64539ec/docs/journey-leg.md#polyline-option).

## If you use the `departures()` method…

…rename `departure.journeyId` to `departure.tripId`. 2e6aefe

## If you use the `location()` method…

…change the `location(id)` call to `station(id)`. 665bed9

## If you use the `radar()` method…

- …change the `radar(north, west, south, east)` call to `radar({north, west, south, east})`. 40b559f
- …rename `movement.journeyId` to `movement.tripId`. 2e6aefe

## If you use `hafas-client` with a custom profile…

- …write your profile in [the new format](writing-a-profile.md). Then, you can pass it into `hafas-client` just like before. #32/b7c1ee3
- …rename the `profile.journeyLeg` flag to `profile.trip`. 8de4447

## If you use `hafas-client` with custom parse functions…

…change the following parsers to the `parse…(profile, opt, data)` signature. 8881d8a/b6fbaa5

- `parseDeparture`
- `parseJourney`
- `parseJourneyLeg`
- `parseLine`
- `parseMovement`
- `parseLocation`
- `parseNearby`
- `parsePolyline`
- `parseStopover`

## If you use `station.lines` array anywhere…

…add the `stationLines: true` option to the method call, e.g. `hafas.departures('123', {stationLines: true}). cabe5fa
