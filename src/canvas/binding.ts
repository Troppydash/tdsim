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


// generates input binding for a given input type
export class Binding<T> implements Bindable {
    protected _value: T;
    protected type: BindableType;
    protected unbind: (() => void) | void;

    constructor(args: BindableConstructor<T>) {
        const {
            type,
            initial,
            bindings
        } = args;

        this._value = initial;
        this.type = type;
        this.unbind = null;

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
            return x => evalInContext({env, x}, value);
        }


        return new Binding({
            type: 'function',
            initial: initial == null ? parseFunction(input.value) : parseFunction(initial),
            bindings: (handleChange) => {
                const handle = (e: InputEvent) => {
                    const value = parseFunction((e.currentTarget as HTMLInputElement).value);
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
}


/**
 * https://stackoverflow.com/a/43306962
 * @param context
 * @param js
 */
function evalInContext(context, js) {
    let value;

    try {
        // for expressions
        value = eval('with(context) { ' + js + ' }');
    } catch (e) {
        if (e instanceof SyntaxError) {
            try {
                // for statements
                value = (new Function('with(this) { ' + js + ' }')).call(context);
            } catch (e) {
                value = null;
            }
        }
    }

    return value;
}


function debouncedListener(fn: any, delay: number) {
    let timer = null;

    return (...args) => {
        if (timer !== null) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            timer = null;
            fn(...args);
        }, delay);
    }
}