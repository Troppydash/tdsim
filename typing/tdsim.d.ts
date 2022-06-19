// @ts-ignore
import * as module from './types/entry';

export = module
export as namespace tdsim
declare global {
    interface Window {
        tdsim: typeof module;
    }
}

