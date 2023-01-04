import {Complex, Pair, Range} from "../../computation/vector";
import FromRect = Complex.FromRect;

export namespace Polynomial {
    export type Coefficients = Complex[];
    export type Points = Complex[];
    export type Poly = Coefficients;


    export function FFT(coeffs: Coefficients, n: number = coeffs.length): Points {
        // base case
        if (n === 1) {
            return coeffs;
        }

        // generate the nth roots of unity
        const w = Complex.RootOfUnity(n);

        // console.log('root', roots)
        // evens
        const evens = (new Range(0, n - 1, 2)).index(coeffs);
        const p_evens = FFT(evens);

        const odds = (new Range(1, n - 1, 2)).index(coeffs);
        const p_odds = FFT(odds);

        let output1 = [];
        let output2 = [];
        for (let i = 0; i < n/2; ++i) {
            output1.push(Complex.Add(p_evens[i], Complex.Mul(Complex.Pow(w, i), p_odds[i])));
            output2.push(Complex.Sub(p_evens[i], Complex.Mul(Complex.Pow(w, i), p_odds[i])));
        }

        return [...output1, ...output2];
    }

    export function IFFT(points: Points, n: number = points.length): Coefficients {
        // base case
        if (n === 1) {
            return points;
        }

        // generate the nth roots of unity
        const w = Complex.Inv(Complex.RootOfUnity(n));

        // console.log('root', roots)
        // evens
        const evens = (new Range(0, n - 1, 2)).index(points);
        const p_evens = IFFT(evens);

        const odds = (new Range(1, n - 1, 2)).index(points);
        const p_odds = IFFT(odds);

        let output1 = [];
        let output2 = [];
        for (let i = 0; i < n/2; ++i) {
            output1.push(Complex.Add(p_evens[i], Complex.Mul(Complex.Pow(w, i), p_odds[i])));
            output2.push(Complex.Sub(p_evens[i], Complex.Mul(Complex.Pow(w, i), p_odds[i])));
        }

        return [...output1, ...output2];
    }

    export function ToString(poly: Poly): string {
        return poly.map((c, i) => `${Complex.ToString(c)}x^${i}`).join(' + ')
    }

    export function Mul(p1: Poly, p2: Poly): Poly {
        // if (p2.length > p1.length) {
        //     const temp = p2;
        //     p2 = p1;
        //     p1 = temp;
        // }
        //
        // // p1 is the longest polynomial
        // while (p2.length < p1.length) {
        //     p2.push(Complex.FromRect(0));
        // }

        // round to the nearest 2^n
        let order = 2 ** Math.ceil(Math.log2((p1.length-1) + (p2.length-1)+1));
        while (p1.length < order) {
            p1.push(Complex.FromRect(0));
        }
        while (p2.length < order) {
            p2.push(Complex.FromRect(0));
        }

        const points1 = FFT(p1);
        const points2 = FFT(p2);
        // multiply points
        let points = [];
        for (let i = 0; i < points1.length; ++i) {
            points.push(Complex.Mul(points1[i], points2[i]));
        }

        return IFFT(points).map(p => Complex.Div(p, Complex.FromRect(points.length)));
    }

    export function FromReal(...coef: number[]): Poly {
        return coef.map(c => Complex.FromRect(c));
    }
}


// const p1 = Polynomial.FromReal(2, 2, 2, 2);
// const p2 = Polynomial.FromReal(1, 1);

// console.log(Polynomial.ToString(p1));
// console.log(Polynomial.ToString(p2));
// console.log(Polynomial.ToString(Polynomial.Mul(p1, p2)))
// const p1 = Polynomial.FromReal(2, 1);
// console.log(Polynomial.IFFT(Polynomial.FFT(p1)))
// console.log(Polynomial.FFT([FromRect(1), FromRect(1), FromRect(1), FromRect(1)]).map(Complex.ToString));
