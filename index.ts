import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import isNumber from 'is-number';
import { getCurrentPriceVattenFall, getCurrentPriceAftonbladet } from './lib/utils';
import type { Area } from './lib/types/utils';

dotenv.config();

import { EbecoApi } from './lib/ebecoApi';
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



const isPriceLowEnoughToRunHeating = async (): Promise<Boolean | null> => {
    
    const priceSource = process.env.PRICE_SOURCE || 'vattenfall';
    const area = process.env.PRICE_AREA || 'SN3';
    
    const priceFunction = priceSource === 'aftonbladet' ? getCurrentPriceAftonbladet : getCurrentPriceVattenFall;

    const acceptablePrice = parseInt(process.env.PRICE_LIMIT || '100');
    const currentPrice = await priceFunction(area as Area);

    console.log('Current price =', currentPrice, 'max acceptable price =', acceptablePrice);

    if(!isNumber(currentPrice)) {
        console.log('Error when fetching price.');
        return null;
    } else {
        if(currentPrice <= acceptablePrice) {
            return true;
        } else {
            console.log("Price is too high!");
            return false;
        }
    }
}

const runLogic = async() => {
    const priceAcceptable = await isPriceLowEnoughToRunHeating();
    if(typeof priceAcceptable === 'boolean') {
        try {
            await updateThermostat(priceAcceptable);
        } catch(e) {
            console.log("Error: Ebeco service was down.", e)
        }
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
