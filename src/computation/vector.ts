export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type VecN = Vec2 | Vec3 | number[];

type Tuple<TItem, TLength extends number> = [TItem, ...TItem[]] & { length: TLength };
export type Vec<N extends number> = Tuple<number, N>;

export type Scalar = number;

export type Complex = Vec2;

export type Mat2 = [
    number, number,
    number, number
];


export const enum Direction {
    UP = 1,
    DOWN = 1,
    LEFT = 1,
    RIGHT = 1
}

// https://github.com/microsoft/TypeScript/issues/26223#issuecomment-410642988
export interface Mat<R extends number = 4, C extends number = 4> {
    length: R,
    0: {
        0: number,
        length: C,
    }
}


export namespace Scalar {
    export function round(number: number, decimal: number = 2): string {
        return number.toFixed(decimal);
    }
}

export namespace Plane {
    export const Zero: Vec2 = [0, 0];

    export function VecProj(a: Vec2, b: Vec2): Vec2 {
        const normB = VecNormalize(b);
        return VecMulC(normB, VecDot(a, normB));
    }

    export function VecMag(a: Vec2): Scalar {
        return Math.sqrt(a[0] * a[0] + a[1] * a[1])
    }

    export function VecAddV(a: Vec2, b: Vec2): Vec2 {
        return [a[0] + b[0], a[1] + b[1]];
    }

    export function VecAddC(a: Vec2, b: Scalar): Vec2 {
        return [a[0] + b, a[1] + b];
    }

    export function VecMulC(a: Vec2, b: Scalar): Vec2 {
        return [a[0] * b, a[1] * b];
    }

    export function MatDet(mat: Mat2): Scalar {
        return mat[0] * mat[3] - mat[1] * mat[2];
    }

    export function MatInv(mat: Mat2): Mat2 {
        const det = MatDet(mat);
        const [a, b, c, d] = mat;
        return [
            d / det, -b / det, -c / det, a / det
        ];
    }

    export function MatVec(mat: Mat2, vec: Vec2): Vec2 {
        const [a, b, c, d] = mat;

        return [
            a * vec[0] + b * vec[1],
            c * vec[0] + d * vec[1]
        ];
    }

    export function MatRotate(rad: Scalar): Mat2 {
        return [
            Math.cos(rad), -Math.sin(rad),
            Math.sin(rad), Math.cos(rad)
        ];
    }

    export function VecSubV(a: Vec2, b: Vec2): Vec2 {
        return [a[0] - b[0], a[1] - b[1]];
    }

    /**
     * VecRotate rotates the vector counter-clockwise around the origin
     * @param rad
     * @param vec
     * @constructor
     */
    export function VecRotate(rad: Scalar, vec: Vec2): Vec2 {
        return MatVec(MatRotate(rad), vec);
    }

    export function VecNormalize(vec: Vec2): Vec2 {
        const mag = VecMag(vec);
        return [vec[0] / mag, vec[1] / mag];
    }

    export function VecNormal(vec: Vec2): Vec2 {
        return VecRotate(0.5 * Math.PI, VecNormalize(vec));
    }

    export function VecDot(a: Vec2, b: Vec2): Scalar {
        return a[0] * b[0] + a[1] * b[1];
    }

    export function VecInv(a: Vec2): Vec2 {
        return [-a[0], -a[1]];
    }

    export function VecReMag(a: Vec2, m: Scalar): Vec2 {
        const norm = VecNormalize(a);
        return VecMulC(norm, m);
    }

    export function VecDist(a: Vec2, b: Vec2): Scalar {
        return VecMag(VecSubV(b, a));
    }

    // intersection code, i have no idea how it works
    // https://stackoverflow.com/questions/9043805/test-if-two-lines-intersect-javascript-function
    export function Intersect(from1: Vec2, to1: Vec2, from2: Vec2, to2: Vec2): Vec2 | null {
        const dX = to1[0] - from1[0];
        const dY = to1[1] - from1[1];

        const determinant = dX * (to2[1] - from2[1]) - (to2[0] - from2[0]) * dY;
        if (determinant === 0) return null; // parallel lines

        const lambda = ((to2[1] - from2[1]) * (to2[0] - from1[0]) + (from2[0] - to2[0]) * (to2[1] - from1[1])) / determinant;
        const gamma = ((from1[1] - to1[1]) * (to2[0] - from1[0]) + dX * (to2[1] - from1[1])) / determinant;

        // check if there is an intersection
        if (!(0 <= lambda && lambda <= 1) || !(0 <= gamma && gamma <= 1)) return null;

        return [
            from1[0] + lambda * dX,
            from1[1] + lambda * dY,
        ];
    }


    export function VecPolar(radius: number, theta: number): Vec2 {
        return [
            radius * Math.cos(theta),
            radius * Math.sin(theta)
        ];
    }


    // border = [up down left right]
    export function VecInside(vec: Vec2, border: Vec<4>) : boolean {
        const [up, down, left, right] = border;
        return vec[0] >= left && vec[1] <= right && vec[1] >= down && vec[1] <= up;
    }
}

export namespace Volume {
    export function VecAddV(a: Vec3, b: Vec3): Vec3 {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    }

    export function VecMulC(a: Vec3, b: Scalar): Vec3 {
        return [a[0] * b, a[1] * b, a[2] * b];
    }


    export function VecDot3(a: Vec3, b: Vec3): Scalar {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    export function VecAddV3(a: Vec3, b: Vec3): Vec3 {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    }

    export function VecSubV3(a: Vec3, b: Vec3): Vec3 {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }

    export function VecMulC3(a: Vec3, c: Scalar): Vec3 {
        return [a[0] * c, a[1] * c, a[2] * c];
    }

    export function VecMag3(a: Vec3): Scalar {
        return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    }

    export function VecNorm3(a: Vec3): Vec3 {
        const mag = VecMag3(a);
        return [a[0] / mag, a[1] / mag, a[2] / mag];
    }

    export function VecNeg3(a: Vec3): Vec3 {
        return [-a[0], -a[1], -a[2]];
    }

    export function VecRotate3(a: Vec3, degrees: Scalar): Vec3 {
        const rad = degrees * Math.PI / 180;
        const [x, y, z] = a;
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return [
            x * c + y * s,
            -x * s + y * c,
            z
        ];
    }

    export function VecScale3(a: Vec3, c: Scalar): Vec3 {
        if (VecMag3(a) < 0.001) return [0, 0, 0];
        return VecMulC3(VecNorm3(a), c);
    }
}

export namespace VSpace {
    export function VecAddV(a: VecN, b: VecN): VecN {
        return a.map((v, i) => v + b[i]);
    }

    export function VecSubV(a: VecN, b: VecN): VecN {
        return a.map((v, i) => v - b[i]);
    }

    export function VecAddC(a: VecN, c: Scalar): VecN {
        return a.map(v => v + c);
    }

    export function VecSubC(a: VecN, c: Scalar): VecN {
        return a.map(v => v - c);
    }

    export function VecMulC(a: VecN, b: Scalar): VecN {
        return a.map(v => v * b);
    }

    export function VecDivC(a: VecN, b: Scalar): VecN {
        return a.map(v => v / b);
    }

    export function VecDot(a: VecN, b: VecN): Scalar {
        return a.reduce((acc, v, i) => acc + v * b[i], 0);
    }

    export function VecMag(a: VecN): Scalar {
        return Math.sqrt(a.reduce((acc, v) => acc + v * v, 0));
    }

    export function VecNormalize(a: VecN): VecN {
        const mag = VecMag(a);
        if (mag < Number.EPSILON) return [0, 0, 0];
        return a.map(v => v / mag);
    }

}

export namespace Complex {
    export function Add(c1: Complex, c2: Complex): Complex {
        return Plane.VecAddV(c1, c2);
    }

    export function Sub(c1: Complex, c2: Complex): Complex {
        return Plane.VecSubV(c1, c2);
    }

    export function Mul(c1: Complex, c2: Complex): Complex {
        return [c1[0] * c2[0] - c1[1] * c2[1], c1[0] * c2[1] + c1[1] * c2[0]];
    }

    export function Inv(c: Complex): Complex {
        const numer = Conj(c);
        const deno = Mul(c, numer);
        return [
            numer[0] / deno[0],
            numer[1] / deno[0]
        ];
    }


    export function Div(c1: Complex, c2: Complex): Complex {
        return Mul(c1, Inv(c2));
    }

    export function Conj(c: Complex): Complex {
        return [c[0], -c[1]];
    }

    export function Neg(c: Complex): Complex {
        return [-c[0], -c[1]];
    }

    export function Pow(c: Complex, n: number): Complex {
        let [mag, ang] = ToPolar(c);
        ang *= n;
        return Complex.FromPolar(mag, ang);
    }

    export function Mag(c: Complex): number {
        return Plane.VecMag(c);
    }

    export function Ang(c: Complex): number {
        return Math.atan2(c[1], c[0]);
    }

    export function FromRect(x: number, y: number = 0): Complex {
        return [x, y];
    }

    export function FromPolar(mag: number, ang: number): Complex {
        return [mag * Math.cos(ang), mag * Math.sin(ang)];
    }

    export function ToPolar(z: Complex): [number, number] {
        return [Math.sqrt(z[0] * z[0] + z[1] * z[1]), Math.atan2(z[1], z[0])];
    }

    export function RootsOfUnity(n: number): Complex[] {
        let output = [];
        const dtheta = 2 * Math.PI / n;
        for (let ang = 0; ang < 2 * Math.PI; ang += dtheta) {
            output.push(Complex.FromPolar(1, ang));
        }
        return output;
    }

    export function RootOfUnity(n: number): Complex {
        const dtheta = 2 * Math.PI / n;
        return Complex.FromPolar(1, dtheta);
    }


    // https://stackoverflow.com/a/72906124/9341734
    function round_number(number, decimal_places) {
        const places = 10 ** decimal_places;
        const res = Math.round(number * places) / places;
        return (res)
    }

    export function ToString(c: Complex, prec: number = 2): string {
        if (Math.abs(c[1]) < Math.pow(10, -prec)) {
            return `(${round_number(c[0], prec)})`;
        }
        if (Math.abs(c[0]) < Math.pow(10, -prec)) {
            return `(${round_number(c[1], prec)}i)`;
        }
        return `(${round_number(c[0], prec)} + ${round_number(c[1], prec)}i)`;
    }
}

export class Range {
    private _size: number;
    private _iter: Pair<number>[];
    private _values: number[];
    private _keys: number[];


    private constructor(
        range: number[],
    ) {
        this._size = range.length;

        // generate iter
        this._iter = [];
        this._keys = [];
        this._values = [];
        for (let i = 0; i < range.length; ++i) {
            const x = range[i];
            this._iter.push([x, i]);
            this._values.push(x);
            this._keys.push(i);
        }
    }

    /**
     * Create a range from 0 to the upper number, stepping
     *
     * @example
     * const range = Range.of(10, 1);
     *
     * @param lower
     * @param upper
     * @param step
     */
    static of(lower: number, upper: number, step: number = 1): Range {
        let range = [];
        for (let x = lower; x < upper; x += step) {
            range.push(x);
        }

        return new Range(range);
    }


    static from(list: any[], step: number = 1): Range {
        return Range.of(list.length, step);
    }

    static linspace(lower: number, upper: number, items: number): Range {
        const dx = (upper-lower) / (items-1);
        let range = [];
        for (let i = 0; i < items; ++i) {
            range.push(lower + dx * i);
        }
        return new Range(range);
    }

    /**
     * Uses the range as the indices for the supplied array
     *
     * @example
     * const range = new Range(0, 10, 1);
     * range.shuffle();
     *
     * let arr;
     * arr = range.index(arr);
     *
     * @param list
     */
    index<T>(list: T[]): T[] {
        let newList = [];
        const indexes = this._values;
        for (const key of indexes) {
            newList.push(list[key]);
        }
        return newList;
    }

    /**
     * Returns the first element of the range
     */
    get first() {
        return this._values[0];
    }

    /**
     * Returns the last element of the range
     */
    get last() {
        return this._values[this._values.length - 1];
    }

    get step() {
        return this._values[1] - this._values[0];
    }

    get firstIndex() {
        return 0;
    }

    get lastIndex() {
        return this._size - 1;
    }

    get size() {
        return this._size;
    }

    * [Symbol.iterator]() {
        yield* this._iter;
    }

    get iter() {
        return this._iter;
    }

    get values() {
        return this._values;
    }

    get keys() {
        return this._keys;
    }

    public slice(start: number, end: number) {
        return this._values.slice(start, end);
    }

    public reverse(): Range {
        const reversed = [...this._values];
        reversed.reverse();
        return new Range(reversed);
    }

    public shuffle(): Range {
        const shuffled = [...this._values]
            .map(index => ({
                index,
                sort: Math.random()
            }))
            .sort((a, b) => a.sort - b.sort)
            .map(({index}) => index);
        return new Range(shuffled);
    }

    map<T>(fn: (ele: number, index: number) => T): T[] {
        let result = [];
        for (const [element, index] of this) {
            result.push(fn(element, index));
        }
        return result;
    }

    /**
     * Returns the array with each element mapped to a constant
     * @param c
     */
    ofConstant<T>(c: T): T[] {
        return this.map(() => c);
    }
}

export type Line = [number, number, number, number];
export type Area = {
    xRange: Vec2
    xStep: number,
    yRange: Vec2,
    yStep: number,
};

export type Pair<T, K = T> = [T, K];

