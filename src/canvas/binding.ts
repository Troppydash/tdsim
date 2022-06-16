import {evalInContext} from "../lib/eval";

type BindableType = "text" | "number" | "const" | "function";

interface BindableConstructor<T> {
    type: BindableType;
    initial: T;
    bindings: (handleChange: (newValue: T) => void) => (void | (() => void));
}

export interface Bindable {
    value(): any;

    stop(): void;
}

type Listener = (self: Binding<any>) => void;

// generates input binding for a given input type
export class Binding<T> implements Bindable {
    protected _value: T;
    protected type: BindableType;
    protected unbind: (() => void) | void;
    protected listeners: { [event: string]: Listener[] };

    constructor(args: BindableConstructor<T>) {
        const {
            type,
            initial,
            bindings
        } = args;

        this._value = initial;
        this.type = type;
        this.unbind = null;
        this.listeners = {
            'change': []
        };

        if (this.type !== 'const') {
            this.unbind = bindings(this.handleChange.bind(this));
        }
    }

    stop() {
        if (this.unbind) {
            this.unbind();
        }
    }

    handleChange(newValue: T) {
        this._value = newValue;
        for (const listener of this.listeners.change) {
            listener(this);
        }
    }

    listen(event: 'change', callback: (self: Binding<T>) => void) {
        this.listeners[event].push(callback);
    }

    get value() {
        return this._value as any;
    }


    static constant(value: any) {
        return new Binding({
            type: 'const',
            initial: value,
            bindings: () => {
            }
        });
    }

    static slider(slider: HTMLInputElement, scale: number = 100, initial?: number) {
        return new Binding({
            type: 'number',
            initial: initial == null ? parseFloat(slider.value) / scale : initial / scale,
            bindings: (handleChange) => {
                const handle = (e: InputEvent) => {
                    const value = parseFloat((e.currentTarget as HTMLInputElement).value);
                    if (!isNaN(value)) {
                        handleChange(value / scale);
                    }
                }
                slider.addEventListener('change', handle);

                return () => {
                    slider.removeEventListener('change', handle);
                }
            }
        })
    }

    static function(
        input: HTMLInputElement,
        env: { [key: string]: any } = {'Math': Math},
        debounce: number = 1000,
        initial?: string,
    ) {
        const parseFunction = (value: string) => {
            return (x, args) => evalInContext(value, {...env, x, ...args});
        }


        return new Binding({
            type: 'function',
            initial: initial == null ? parseFunction(input.value) : parseFunction(initial),
            bindings: (handleChange) => {
                const handle = (e: InputEvent) => {
                    const value = parseFunction((e.target as HTMLInputElement).value);
                    handleChange(value);
                }

                const debounced = debouncedListener(handle, debounce);
                input.addEventListener('change', debounced);

                return () => {
                    input.removeEventListener('change', debounced);
                }
            }
        })
    }

    static range(
        range: HTMLElement
    ) {

    }
}


function debouncedListener(fn: any, delay: number) {
    let timer = null;

    return (...args) => {
        if (timer !== null) {
            clearTimeout(timer);
        }
        timer = setTimeout(((a) => () => {
            timer = null;
            fn(...a);
        })(args), delay);
    }
}