A simple automation that connects to the [Ebeco Connect API](https://www.ebeco.com/guidance/guides/ebeco-open-api) and Vattenfall electricity price API and allows you to turn off your floor heating when the price is too high.

Uses code from https://github.com/dhutchison/homebridge-ebeco

## Setup

```bash
nvm use
```

Set environment variables by creating the file `.env` and populating it with:

```bash
EBECO_USERNAME=your@email.com # The email you use in the Ebeco Connect app
EBECO_PASSWORD=your-password # The password you use in the Ebeco Connect app
EBECO_DEVICE=ThermostatName # Optional, first thermostat will be used if not set
PRICE_LIMIT=100 # In öre. Default 100
PRICE_AREA=SN3 # SN1-4
```

Start:

```bash
npm run dev
```

### Production

Set env vars, then run:

```bash
npm run start
```

### Docker

TODO