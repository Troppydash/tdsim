type BindableType = "text" | "number" | "const";

interface BindableConstructor<T> {
    type: BindableType;
    initial: T;
    bindings: (handleChange: (newValue: T) => void) => void;
}

export interface Bindable {
    value(): any;

}

// generates input binding for a given input type
export class Binding<T> implements Bindable {
    protected _value: T;
    protected type: BindableType;

    constructor(args: BindableConstructor<T>) {
        const {
            type,
            initial,
            bindings
        } = args;

        this._value = initial;
        this.type = type;

        if (this.type !== 'const') {
            bindings(this.handleChange);
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
}
