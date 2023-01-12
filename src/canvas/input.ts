import {Observable, SubscriberType} from "./observable.js";
import {CanvasInputs} from "./canvas.js";
import {Vec2} from "../computation/vector.js";

interface HandlerCallback {
    (): void;
}

/**
 * Input handlers make subscribing to canvas inputs easier by providing a unified api and dedicated callback systems
 *
 * @example
 * const handler = new Handler(input);
 * handler.register(callback1, callback2, ...);
 * handler.remove();
 */
export interface Handler<T extends Observable<any>> {
    readonly input: T;

    register(...methods: HandlerCallback[]);

    remove();
}

/**
 * Handler for the canvas click observable
 */
export class ClickHandler implements Handler<CanvasInputs['click']> {
    private id;

    constructor(
        public readonly input: CanvasInputs['click']
    ) {
    }

    register(onClick: (Vec2) => void) {
        this.id = this.input.subscribe(
            (newValue, oldValue) => {
                onClick(newValue);
            }
        )
    }

    remove() {
        this.input.unsubscribe(this.id);
    }

}

/**
 * Handler for the canvas drag observable
 */
export class DragHandler implements Handler<CanvasInputs['drag']> {
    private id;

    constructor(
        public readonly input: CanvasInputs['drag']
    ) {
    }

    register(
        startDrag? : (Vec2) => void,
        duringDrag? : (Vec2) => void,
        endDrag? : (Vec2) => void,
    ) {
        this.id = this.input.subscribe((newValue, oldValue) => {
            if (newValue !== null && oldValue !== null) {
                duringDrag && duringDrag(newValue);
            } else if (newValue !== null && oldValue === null) {
                startDrag && startDrag(newValue);
            } else if (newValue === null && oldValue !== null) {
                endDrag && endDrag(oldValue);
            }
        });
    }

    remove() {
        this.input.unsubscribe(this.id);
    }

}

// https://stackoverflow.com/a/53931837/9341734
// TODO: Fix that this only works with public methods
type OnlyClassMethods<T> = {
    [K in keyof T]: T[K] extends Function ? K : never
}[keyof T]

/**
 * Method to bind the respective handler callbacks as class methods with the class
 *
 * @example
 * class PhysicsObject {
 *     constructor() {
 *           BindHandlers(this, ['handleDragStart', 'handleDragEnd', ...]);
 *     }
 *
 *     handleDragStart() {}
 *     handleDragEnd() {}
 * }
 * @param obj
 * @param handlers
 */
export function BindHandlers<T>(obj: T, handlers: (OnlyClassMethods<T>)[]) {
    for (const handle of handlers) {
        obj[handle] = (obj[handle] as any).bind(obj);
    }
}
