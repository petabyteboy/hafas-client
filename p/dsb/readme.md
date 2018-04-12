# DSB profile for `hafas-client`

[*Danske Statsbaner (DSB)*](https://en.wikipedia.org/wiki/DSB_(railway_company)#See_also) is a Danish railway company. This profile adds *DSB*-specific customisations to `hafas-clients`.

## Usage

```js
const createClient = require('hafas-client')
const dsbProfile = require('hafas-client/p/dsb')

// create a client with DSB profile
const client = createClient(dsbProfile)
```


## Customisations

- parses *DSB*-specific products (such as *S-Tog*)
