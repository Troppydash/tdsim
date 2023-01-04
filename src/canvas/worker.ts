export const enum RequestMethod {
    SimpleCompute = 'SimpleCompute'
}

/**
 * The request structure to the web worker
 */
export interface RequestData {
    method: RequestMethod;
    payload: any;
}

export const enum ResponseStatus {
    OK = 200,
    NO_METHOD = 400,
    ERROR = 500,
}

/**
 * The response structure from the web worker
 */
export interface ResponseData {
    status: ResponseStatus;
    payload: any;
}


/**
 * A web worker interface that allows offloading computation functions to the web worker instead of blocking the main thread
 *
 * @example
 * const worker = new TDWorker();
 * worker.start();
 * function add(a, b) { return a + b; }
 * const result = await worker.simpleCompute(add, [1, 2]);  // result = 3
 */
export class TDWorker {
    private worker: Worker = null;

    /**
     * Initiates and creates the web worker
     * @param path
     */
    public start(path: string = null) {
        if (path == null) {
            // @ts-ignore
            path = import.meta.url;
            path = path.slice(0, path.length - 3) + "_" + path.slice(path.length - 3);
        }

        this.worker = new Worker(path, {type: 'module'});
    }

    public stop() {
        if (this.worker) {
            this.worker.terminate();
        }
    }

    // creates an evalable string from a function
    private stringifyFunction(fn: any): string {
        const fnstr = fn.toString();

        // first check if it is a valid function
        if (fnstr.startsWith('function')) {
            return `(${fnstr})`;
        }

        // else assume it is a class method
        return `(function ${fn})`;
    }

    /**
     * Computes the given function supplied with the inputs **args** on the worker thread
     * @param fn
     * @param args
     */
    public async simpleCompute<I extends any[], O>(fn: (...I) => O, args: I): Promise<O> {
        // first stringify function
        const fnstr = this.stringifyFunction(fn);

        this.worker.postMessage({
            method: RequestMethod.SimpleCompute,
            payload: {
                fn: fnstr,
                args
            }
        } as RequestData);

        return new Promise((resolve, reject) => {
            this.worker.onmessage = event => {
                const response = event.data as ResponseData;
                if (Math.floor(response.status / 100) !== 2) {
                    reject(response.payload);
                } else {
                    resolve(response.payload);
                }
            }
        });
    }
}
