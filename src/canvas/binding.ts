type BindableType = "text" | "number" | "const";

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
            bindings: () => {}
        });
    }

    static slider(slider: HTMLInputElement, scale: number = 100, initial?: number) {
        return new Binding({
            type: 'number',
            initial: initial == null ?  parseFloat(slider.value) / scale : initial / scale,
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
}
