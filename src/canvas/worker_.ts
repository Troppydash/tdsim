// import {RequestData, RequestMethod, ResponseData, ResponseStatus} from "./worker.js";

function makeResponse(status: number, payload: any) {
    return {
        status,
        payload
    }
}

onmessage = function (event) {
    const data = event.data;
    switch (data.method) {
        case 'SimpleCompute': {
            const {fn, args} = data.payload;
            try {
                const result = eval(fn)(...args);
                postMessage(makeResponse(200, result));
            } catch (e) {
                postMessage(makeResponse(500, e));
            }

            break;
        }
        default: {
            postMessage(makeResponse(400, null));
            break;
        }
    }
}
