// https://github.com/dhutchison/homebridge-ebeco/blob/master/src/lib/ebecoApi.ts

import axios from 'axios';

import { EbecoPlatformConfig } from './types/settings';

export interface Error {
    code: number;
    message: string;
    details: string;
}

/** 
 * Interface defining the standard object which seems to wrap all the
 * API responses. 
 * 
 * This is not detailed in the swagger specification!
 */
export interface MvcAjaxResponse<T> {
    result: T;
    success: boolean;
    error?: Error;
    unAuthorizedRequest: boolean;
}

export interface LoginRequest {
    userNameOrEmailAddress: string;
    password: string;
}

/**
 * Interface defining the fields we will get back from a successful authentication request (that we care about at least). 
 */
export interface LoginResponse {

    accessToken: string;
    expireInSeconds: number;
    requiresTwoFactorVerification:	boolean;
}

/**
 * The details of a device. 
 * 
 * This is a subset of the full device returned by the API. 
 */
export interface Device {

    
    /**
     * The given name of the thermostat
     */
        displayName: string;
        /** 
         * State of thermostat (on/off) 
         */
        powerOn: boolean;
        /**
         * Program currently set on thermostat. Possible values are: Manual, Week, Timer
         */
        selectedProgram?: string;
        /**
         * State of current program. Possible values are: Standby, Active, Timer
         */
        programState?: string;
        /**
         * Temperature until next program event, or fixed when on manual program. When on Timer program, 
         * temperature is set ‘Active’ temperature (when the timer is running)
         */
        temperatureSet: number;
        /**
         * Current temperature, floor sensor.
         */
        temperatureFloor: number;
        /**
         * Current temperature, room sensor.
         */
        temperatureRoom: number;
        /**
         * If the thermostat is reporting an error or appears to be offline.
         */
        hasError: boolean;
        /**
         * Description of error.
         */
        errorMessage?: string;
        /**
         * Thermostat id
         */
        id: number;


}

/**
 * Interface containing the fields required to send a device update request. 
 */
export interface DeviceUpdateRequest {

  /**
   * Thermostat id
   */
  id: number;

  /**
   * Temperature until next program event, or fixed when on manual program. 
   * When on Timer program, temperature is ‘Active’ temperature (when the timer is running).
   */
  temperatureSet?: number;

  /**
   * Turn thermostat on or off.
   */
  powerOn?: boolean;
}

/**
 * Class exposing methods which are available in the Ebeco API.
 */
export class EbecoApi {

  constructor(
    private readonly initialConfig: EbecoPlatformConfig,
  ) {

    /* Validate the configuration */
    if (!initialConfig.username || !initialConfig.password) {
      console.warn('username & password not found in config');
      throw new Error('Not all required configuration values found. Need "username" and "password".');
    }

    if (initialConfig.apiHost === undefined) {
      initialConfig.apiHost = 'https://ebecoconnect.com';
    }

    /* Configure some defaults for axios */
    axios.defaults.baseURL = this.initialConfig.apiHost;
    axios.defaults.headers.common = {
      'Abp.TenantId': '1',
      'Content-Type': 'application/json',
    };

    /* Configure an interceptor to refresh our authentication credentials */
    axios.interceptors.response.use( (response) => {
      /* Return a successful response back to the calling service */
      return response;
    }, async (error) => {
      /* Return any error which is not due to authentication back to the calling service */
      if (error.response.status !== 401) {
        return Promise.reject(error);
      }
    
      /* Reject if we were trying to authenticate and it failed */
      if (error.config.url === '/api/TokenAuth/Authenticate') {
        return Promise.reject(error);
      }
    
      /* Login again then retry the request */
      // Try request again with new token
      try {
        const loginResponse = await this.login();
        // New request with new token
        const config = error.config;
        config.headers['Authorization'] = `Bearer ${loginResponse.accessToken}`;
        return new Promise((resolve, reject) => {
          axios.request(config).then(response => {
            resolve(response);
          }).catch((retryError) => {
            reject(retryError);
          });
        });
      } catch (authenticationError) {
        return Promise.reject(authenticationError);
      }
    });

  }

  /**
   * TODO: add documentation, return promise and handle error cases cleaner
   * 
   * @returns promise containing the access token. 
   * 
   */
  login(): Promise<LoginResponse> {

    const data: LoginRequest = {
      userNameOrEmailAddress: this.initialConfig.username!,
      password: this.initialConfig.password!,
    };
    

    const json = JSON.stringify(data);
    console.log('Sending login request with user name: %s', data.userNameOrEmailAddress);
  
    return new Promise((resolve, reject) => {
      axios.post<MvcAjaxResponse<LoginResponse>>('/api/TokenAuth/Authenticate', data)
        .then(response => {
          if(response.data.result.requiresTwoFactorVerification) {
            reject('Account requires two factor authentication');
          } else {
            this.initialConfig.accessToken = response.data.result.accessToken;
            resolve(response.data.result);
          }

        })
        .catch(err => reject(err));
    });
  }

  getUserDevices(): Promise<Device[]> {

    const config = {
      headers: {
        Authorization: `Bearer ${this.initialConfig.accessToken}`,
      },
    };

    return new Promise<Device[]>((resolve, reject) => {
      axios.get<MvcAjaxResponse<Device[]>>('/api/services/app/Devices/GetUserDevices', config)
        .then(response => {
          console.log('Loaded device list, %o device(s).', response.data?.result?.length);
          resolve(response.data.result);
        })
        .catch(err => {
          console.error('Failed to load device list: %s', err);
          reject(err);
        });
    });

  }

  /**
   * Update the state of a device. 
   * @param updatedState the device parameters to change. 
   */
  updateDeviceState(updatedState: DeviceUpdateRequest) {

    const config = {
      headers: {
        Authorization: `Bearer ${this.initialConfig.accessToken}`,
      },
    };

    return new Promise<boolean>((resolve, reject) => {
      axios.put<MvcAjaxResponse<string>>('/api/services/app/Devices/UpdateUserDevice', 
        updatedState, config)
        .then(response => {
          console.log('Sent update to device state, response: %o', response.data);
          resolve(response.data.success);
        })
        .catch(err => {
          console.log('Failed to update device state: %s');
          reject(err);
        });
    });


  }
}