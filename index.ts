import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import isNumber from 'is-number';
import sub from 'date-fns/sub';
import add from 'date-fns/add';

dotenv.config();

import { EbecoApi } from './lib/ebecoApi';
import axios from 'axios';
import Cron from 'croner';

if(!process.env.EBECO_USERNAME || !process.env.EBECO_PASSWORD) {
    throw new Error('EBECO_USERNAME or EBECO_PASSWORD env vars not set.')
}

const api = new EbecoApi({
    username: process.env.EBECO_USERNAME,
    password: process.env.EBECO_PASSWORD,
});

const shouldUpdatePowerOnState = (currentState: boolean, nextState: boolean) => {
    return currentState !== nextState;
}

const updateThermostat = async (newState: boolean) => {
    await api.login();
    const devices = await api.getUserDevices();
    
    let selectedDevice;
    if(Array.isArray(devices) && devices.length > 0) {
        if(process.env.EBECO_DEVICE) {
            selectedDevice = devices.find((d) => {
                return d.displayName === process.env.EBECO_DEVICE;
            })
        } else {
            selectedDevice = devices[0];
        }

        if(selectedDevice) {
            console.log('Selected device is ', selectedDevice.displayName);
            console.log("Device debug", selectedDevice);

            if(shouldUpdatePowerOnState(selectedDevice.powerOn, newState)) {
                console.log('Device needs to be updated. Setting power state to', newState);
                const success = await api.updateDeviceState({
                    id: selectedDevice.id,
                    powerOn: newState
                });

                if(success) {
                    console.log("Set completed - success!");
                } else {
                    console.error("Something went wrong!");
                }
                
            } else {
                console.log("Device already in wanted state, skipping update.");
            }
        }
    } else {
        console.error('Could not find any devices associated with account, quitting.')
    }
}

const toSwedishLocaleDateString = (date: Date): string => {
    return date.toLocaleString('sv-SE').split(' ')[0]; // 🤷‍♀️
}

const isPriceLowEnoughToRunHeating = async () => {

    const area = process.env.PRICE_AREA || 'SN3';

    const today = new Date();

    const yesterday = sub(new Date(today), { days: 1 });
    const tomorrow = add(new Date(today), { days: 1});

    const todayDateIso = toSwedishLocaleDateString(today);
    const yesterdayDateIso = toSwedishLocaleDateString(yesterday);
    const tomorrowDateIso = toSwedishLocaleDateString(tomorrow);

    console.log(`Getting dates from Vattenfall: ${yesterdayDateIso}:${tomorrowDateIso}:${area}`);

    try {
        const responseVattenfall = await axios.get(`https://www.vattenfall.se/api/price/spot/pricearea/${yesterdayDateIso}/${tomorrowDateIso}/${area}`);
        const hourlyData = responseVattenfall.data || {};
        const currentHour = hourlyData.find((hour: any) => todayDateIso === hour?.TimeStampDay && today.getHours() ===  new Date(hour?.TimeStamp).getHours());
        const currentPrice = currentHour?.Value || null;

        const acceptablePrice = parseInt(process.env.PRICE_LIMIT || '100');

        console.log('Current price =', currentPrice, 'max acceptable price =', acceptablePrice);
        if(isNumber(currentPrice)) {
            if(currentPrice <= acceptablePrice) {
                return true;
            } else {
                console.log("Price is too high!");
                return false;
            }
        } else {
            console.warn('Could not get price, aborting');
            return null;
        }
    } catch(e) { 
        console.error(`Can't fetch data from Vattenfall`, e);
    }
}

const runLogic = async() => {
    const priceAcceptable = await isPriceLowEnoughToRunHeating();
    if(typeof priceAcceptable === 'boolean') {
        await updateThermostat(priceAcceptable);
    } else {};
}

// Initial iife
(async () => {
    await runLogic();
})();

// Cron job
Cron('0 * * * *', async () => {
    console.log('Running on schedule:', new Date());
    await runLogic();
});
