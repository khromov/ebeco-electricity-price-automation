import sub from 'date-fns/sub';
import add from 'date-fns/add';
import axios from 'axios';
import isNumber from 'is-number';

import type { Area } from './types/utils';

// Basically returns a date like 2022-11-28
const toSwedishLocaleDateString = (date: Date): string => {
    return date.toLocaleString('sv-SE').split(' ')[0]; // 🤷‍♀️
}

export const getCurrentPriceVattenFall = async (area: Area): Promise<Number | false> => {

    try {
        const today = new Date();

        const yesterday = sub(new Date(today), { days: 1 });
        const tomorrow = add(new Date(today), { days: 1});
    
        const todayDateIso = toSwedishLocaleDateString(today);
        const yesterdayDateIso = toSwedishLocaleDateString(yesterday);
        const tomorrowDateIso = toSwedishLocaleDateString(tomorrow);
    
        console.log(`Getting dates from Vattenfall: ${yesterdayDateIso}:${tomorrowDateIso}:${area}`);
    
        const responseVattenfall = await axios.get(`https://www.vattenfall.se/api/price/spot/pricearea/${yesterdayDateIso}/${tomorrowDateIso}/${area}`, {
            headers: {
             'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
            }
         });
    
         const hourlyData = responseVattenfall.data || {};
         const currentHour = hourlyData.find((hour: any) => todayDateIso === hour?.TimeStampDay && today.getHours() ===  new Date(hour?.TimeStamp).getHours());
         const currentPrice = currentHour?.Value || null;

         if(isNumber(currentPrice)) {
            return currentPrice;
         } else {
            console.log('Vattenfall response was malformed.');
            return false;
         }
    } catch(e) {
        console.log('Failed to fetch', e);
        return false;
    }
}

export const getCurrentPriceAftonbladet = async (area: Area): Promise<Number | false> => {
    try {
        const now = new Date();
        const todayDateIso = toSwedishLocaleDateString(now);
        const currentHour = now.getHours();
        const responseAftonbladet = await axios.get(`https://widget-data.aftonbladet.se/electricity-price/current.json`);

        console.log('Getting data from Aftonbladet for date:', todayDateIso, 'hour:', currentHour);

        const areaMap = {
            SN1: 'se1',
            SN2: 'se2',
            SN3: 'se3',
            SN4: 'se4'
        };

        const currentPrice = responseAftonbladet?.data?.data?.[todayDateIso]?.hourlyPrice?.[areaMap[area]]?.[currentHour] || null;
        if(isNumber(currentPrice)) {
            return currentPrice;
        } else {
            console.log('Aftonbladet response was malformed.');
            return false;
        }
    } catch(e) {
        console.log('Failed to fetch', e);
        return false;
    }
}