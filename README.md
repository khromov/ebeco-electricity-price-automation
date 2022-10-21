A simple automation that connects to the [Ebeco Connect API](https://www.ebeco.com/guidance/guides/ebeco-open-api) and Vattenfall electricity price API and allows you to turn off your floor heating when the price is too high.

Uses code from https://github.com/dhutchison/homebridge-ebeco

## Example

Example of running this application via the [Docker image](https://github.com/khromov/ebeco-electricity-price-automation/pkgs/container/ebeco-electricity-price-automation%2Febeco-electricity-price-automation). The logic runs on a hourly schedule.

![ebeco](https://user-images.githubusercontent.com/1207507/197240888-4b469770-6443-4c07-96cc-b60526f85f4a.png)


## Setup

```bash
nvm use
```

Set environment variables by creating the file `.env` and populating it with:

```bash
EBECO_USERNAME=your@email.com # The email you use in the Ebeco Connect app
EBECO_PASSWORD=your-password # The password you use in the Ebeco Connect app
EBECO_DEVICE=ThermostatName # Optional, first thermostat will be used if not set
PRICE_LIMIT=100 # In öre. Default 100. Note that this price is without VAT and other fees.
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

```
docker run --env EBECO_USERNAME=your@email.com --env EBECO_PASSWORD=your-password --env PRICE_LIMIT=100 --env PRICE_AREA=SN3 ghcr.io/khromov/ebeco-electricity-price-automation/ebeco-electricity-price-automation:latest
```
