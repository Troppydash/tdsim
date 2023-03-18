// SOLVER, SYSTEM

import {TDElement} from "../../canvas/drawers/basics.js";
import {ICanvas} from "../../canvas/canvas.js";

export abstract class BaseSystem extends TDElement {
    // constants

    // the inverted mass matrix
    abstract imass: Matrix;

    // the Jacobian of the system
    abstract J(q: Vector, dq: Vector, t: number): Matrix;

    // the time derivative Jacobian of the system
    abstract dJ(q: Vector, dq: Vector, t: number): Matrix;

    // the second time derivative of the constraint vector function
    abstract ctt(q: Vector, t: number): Vector;

    abstract C(q: Vector, dq: Vector, t: number): Vector;

    abstract dC(q: Vector, dq: Vector, t: number): Vector;

    // variables
    q: Vector;
    dq: Vector;
    forces: Vector;
    private lastTime: number;

    private lastC: Vector;
    private lastDC: Vector;

    alpha: number = 0;
    beta: number = 0;

    dAlpha: number = 0;
    dBeta: number = 0;

    dt: number;
    // solving classes
    private solver = new ConstraintSolver();
    private integrator: Integrator = new RK4Integrator();

    // constructors for initial conditions
    protected constructor(
        q: number[],
        dq: number[]
    ) {
        super();
        this.q = Matrix.fromVector(q);
        this.dq = Matrix.fromVector(dq);
        this.forces = Matrix.empty(q.length);
        this.lastTime = 0;

        const C = this.C(this.q, this.dq, 0);
        this.lastC = Matrix.empty(C.rows);
        this.lastDC = Matrix.empty(C.rows);

        this.compute = this.compute.bind(this);

    }

    start(parent: ICanvas, ctx: CanvasRenderingContext2D) {
        this.dt = 1/parent.options.rate.update;
    }

    public totalError(): number {
        const t = this.lastTime;
        const errors = this.C(this.q, this.dq, t);
        let total = 0;
        for (const err of errors.data) {
            total += err;
        }

        return total;
    }

    public totalDError(): number {
        const t = this.lastTime;
        const errors = this.dC(this.q, this.dq, t);
        let total = 0;
        for (const err of errors.data) {
            total += err;
        }

        return total;
    }

    protected compute(q: Vector, dq: Vector, t: number) {
        const J = this.J(q, dq, t);
        const dJ = this.dJ(q, dq, t);
        const ctt = this.ctt(q, t);
        const feedback = this.computeFeedback(this.dt, t);
        return this.solver.solve(this.imass, J, dJ, ctt, this.forces, dq, feedback);
    }

    protected tick(t: number, dt: number) {
        this.lastTime = t;
        // compute acceleration
        this.integrator.compute(
            this.compute,
            this.q,
            this.dq,
            t,
            dt
        );
        this.forces.clear();
    }

    public addForce(force: number[]) {
        const F = Matrix.fromVector(force);
        this.forces.add(F);
    }

    protected computeFeedback(dt: number, t: number): Vector {
        const C = this.C(this.q, this.dq, t);
        const dC = this.dC(this.q, this.dq, t);

        const diffC = C.clone().subtract(this.lastC);
        const diffDC = dC.clone().subtract(this.lastDC);

        const JT = this.J(this.q, this.dq, t);
        JT.transpose();

        const Alpha = C.clone().multiplyLeft(JT).multiply(this.alpha);
        const Beta = dC.clone().multiplyLeft(JT).multiply(this.beta);
        const dAlpha = diffC.clone().multiplyLeft(JT).multiply(this.dAlpha / dt);
        const dBeta = diffDC.clone().multiplyLeft(JT).multiply(this.dBeta / dt);

        this.lastC = C.clone();
        this.lastDC = dC.clone();

        return Alpha.add(Beta).add(dAlpha).add(dBeta);
    }

    protected position() {
        return this.q.data;
    }
}

export interface Integrator {
    compute(acc: (q: Vector, dq: Vector, t: number) => Vector, q: Vector, dq: Vector, t: number, dt: number);
}

export class LeapFrogIntegrator implements Integrator {
    compute(acc: (q: Vector, dq: Vector, t: number) => Vector, q: Vector, dq: Vector, t: number, dt: number) {
        let a = acc(q, dq, t);

        a.multiply(dt / 2);
        dq.add(a);

        const halfv = dq.clone();
        halfv.multiply(dt);
        q.add(halfv);

        a = acc(q, dq, t + dt / 2);
        a.multiply(dt / 2);
        dq.add(a);
        // const a = acc(q, dq, t);
        // const ax = a.clone().multiply(dt * dt / 2);
        // const vx = dq.clone().multiply(dt);
        // const newQ = q.clone().add(vx).add(ax);
        //
        // const a2 = acc(newQ, dq, t);
        // a2.add(a).multiply(dt / 2);
        //
        // dq.add(a2);
        // q.copy(newQ);
    }
}

export class RK4Integrator implements Integrator {
    compute(acc: (q: Vector, dq: Vector, t: number) => Vector, q: Vector, dq: Vector, t: number, dt: number) {
        const dzdt = (q, dq, t) => {
            return [
                dq,
                acc(q, dq, t)
            ] as [Vector, Vector];
        }

        const k1 = dzdt(q, dq.clone(), t);
        const k2 = dzdt(
            q.clone().add(k1[0].clone().multiply(dt / 2)),
            dq.clone().add(k1[1].clone().multiply(dt / 2)),
            t + dt / 2,
        );
        const k3 = dzdt(
            q.clone().add(k2[0].clone().multiply(dt / 2)),
            dq.clone().add(k2[1].clone().multiply(dt / 2)),
            t + dt / 2,
        );
        const k4 = dzdt(
            q.clone().add(k3[0].clone().multiply(dt)),
            dq.clone().add(k3[1].clone().multiply(dt)),
            t + dt,
        )

        const totalQ = k1[0].add(k2[0].multiply(2)).add(k3[0].multiply(2)).add(k4[0]);
        const totalDq = k1[1].add(k2[1].multiply(2)).add(k3[1].multiply(2)).add(k4[1]);

        q.add(totalQ.multiply(dt / 6));
        dq.add(totalDq.multiply(dt / 6));
    }
}

export class ConstraintSolver {
    /**
     *
     * @param imass The inverted mass matrix (diagonal)
     * @param J The Jacobian of the constraint function
     * @param dJ The time derivative of the Jacobian
     * @param ctt The second time derivative of the constraint function evaluated at (q, t)
     * @param forces Outside net forces
     * @param velocity The velocity vector
     * @param feedback Feedback Vector
     */
    public solve(
        imass: Matrix, J: Matrix, dJ: Matrix, ctt: Vector,
        forces: Vector, velocity: Vector, feedback: Vector,
    ): Vector {
        // solving for the lagrange multipliers in
        // (-JWJ^T) x = JW Q + dJ dq + ctt
        // debugger;

        let lhs = J.clone();
        lhs.transpose();
        lhs.multiplyLeft(imass);
        lhs.multiplyLeft(J);
        lhs.negate();

        let rhs = ctt.clone();

        let dq = velocity.clone();
        dq.multiplyLeft(dJ);

        let Q = forces.clone();
        Q.multiplyLeft(imass);
        Q.multiplyLeft(J);

        rhs.add(dq);
        rhs.add(Q);

        const multipliers = lhs.solve(rhs);

        // now solve for acceleration

        // C = J^T x
        const JT = J.clone();
        JT.transpose();
        multipliers.multiplyLeft(JT);  // = C

        // a = W (C + Q + Feedback)
        let C = multipliers;
        C.add(forces);
        // add feedback
        C.add(feedback);
        C.multiplyLeft(imass);

        return C;
    }
}

export type Vector = Matrix;

export class Matrix {
    data: number[];
    rows: number;
    cols: number;

    constructor(data: number[], rows: number, cols: number) {
        this.data = data;
        this.rows = rows;
        this.cols = cols;
    }

    private checkNaN() {
        for (const a of this.data) {
            if (Number.isNaN(a)) {
                throw "NaN encountered";
            }
        }
    }


    static fromArray(elements: number[][]) {
        const rows = elements.length;
        const cols = elements[0].length;
        let flatten = [];
        for (const row of elements) {
            for (const col of row) {
                flatten.push(col);
            }
        }
        return new Matrix(flatten, rows, cols);
    }

    static fromVector(elements: number[]) {
        const rows = elements.length;
        const cols = 1;
        return new Matrix(elements, rows, cols);
    }

    static empty(rows: number, cols: number = 1) {
        let data = [];
        for (let i = 0; i < rows * cols; ++i) {
            data.push(0);
        }
        return new Matrix(data, rows, cols);
    }


    public add(other: Matrix) {
        for (let i = 0; i < this.data.length; ++i) {
            this.data[i] += other.data[i];
        }

        this.checkNaN();
        return this;
    }

    public subtract(other: Matrix) {
        for (let i = 0; i < this.data.length; ++i) {
            this.data[i] -= other.data[i];
        }

        this.checkNaN();
        return this;
    }

    public negate() {
        for (let i = 0; i < this.data.length; ++i) {
            this.data[i] = -this.data[i];
        }

        this.checkNaN();

    }

    public multiply(k: number) {
        for (let i = 0; i < this.data.length; ++i) {
            this.data[i] *= k;
        }
        this.checkNaN();
        return this;
    }

    public divide(k: number) {
        for (let i = 0; i < this.data.length; ++i) {
            this.data[i] /= k;
        }
        this.checkNaN();
        return this;
    }

    // perform other * this
    // hopefully this is correct
    public multiplyLeft(other: Matrix) {
        const rows = other.rows;
        const cols = this.cols;

        let result = [];
        for (let row = 0; row < rows; ++row) {
            for (let col = 0; col < cols; ++col) {
                let sum = 0;
                let otherIndex = row * other.cols;
                let thisIndex = col;
                for (let k = 0; k < this.rows; ++k) {
                    sum += other.data[otherIndex] * this.data[thisIndex];
                    otherIndex += 1;
                    thisIndex += this.cols;
                }

                result.push(sum);
            }
        }

        this.data = result;
        this.rows = rows;
        this.cols = cols;

        this.checkNaN();

        return this;
    }

    // solve linear system: this * x = b for x
    public solve(b: Vector): Vector {
        const rows = this.rows;
        const cols = this.cols + 1;

        const operating = [];
        for (let row = 0; row < this.rows; ++row) {
            for (let col = 0; col < this.cols; ++col) {
                operating.push(this.data[row * this.cols + col]);
            }
            operating.push(b.data[row]);
        }
        const mat = new Matrix(operating, rows, cols);
        mat.rref();

        let result = [];
        for (let row = 0; row < rows; ++row) {
            result.push(mat.data[(row + 1) * cols - 1]);
        }

        return Matrix.fromVector(result);
    }

    public rref(epsilon = 2 * Number.EPSILON) {
        // compute the rref form of the matrix
        let operating = [...this.data];
        let pivot = 0;
        for (let row = 0; row < this.rows && pivot < this.cols; ++row, ++pivot) {
            // find a pivot column

            let pivotIndex = row * this.cols + pivot;
            while (Math.abs(operating[pivotIndex]) < epsilon && pivot < this.cols) {
                // check if all below columns are zero
                let found = false;
                let index = pivotIndex;
                for (let r = row + 1; r < this.rows; ++r) {
                    index += this.cols;
                    const is_zero = Math.abs(operating[index]) < epsilon;
                    if (!is_zero) {
                        // swap rows
                        const amount = this.cols - pivot;
                        const source = operating.slice(index, index + amount);
                        for (let i = 0; i < amount; ++i) {
                            operating[index + i] = operating[pivotIndex + i];
                            operating[pivotIndex + i] = source[i];
                        }
                        found = true;
                        break;
                    }
                }

                if (found) {
                    break;
                }
                // otherwise, try next col
                pivot += 1;
                pivotIndex += 1;
            }

            // normalize pivot
            const k = 1 / operating[pivotIndex];
            const amount = this.cols - pivot;
            for (let i = 0; i < amount; ++i) {
                operating[pivotIndex + i] *= k;
            }

            // use the pivot to zero all top, bottom rows

            // top rows - k * pivot row, bottom rows - k * pivot rot
            for (let j = 0; j < this.rows; ++j) {
                if (j == row)
                    continue;

                const k = operating[j * this.cols + pivot];
                if (Math.abs(k) < epsilon)
                    continue;

                for (let col = 0; col < this.cols; ++col) {
                    operating[j * this.cols + col] -= k * operating[row * this.cols + col];
                }
            }

        }

        this.data = operating;

        this.checkNaN();
    }

    public transpose() {
        let transposed = [];

        for (let col = 0; col < this.cols; ++col) {
            for (let row = 0; row < this.rows; ++row) {
                transposed.push(this.data[col + this.cols * row]);
            }
        }

        const rows = this.rows;
        this.rows = this.cols;
        this.cols = rows;
        this.data = transposed;

        this.checkNaN();
    }

    public display() {
        let type = 'Matrix';
        if (this.cols == 1) {
            type = 'Vector';
        } else if (this.rows == 1) {
            type = 'Row Vector'
        }

        let text = `A ${this.rows}x${this.cols} ${type}\n`;
        for (let i = 0; i < this.data.length; ++i) {
            text += this.data[i];

            const col = i % this.cols;
            if (col == this.cols - 1) {
                text += '\n';
            } else {
                text += ' ';
            }
        }
        return text;
    }

    public clone(): Matrix {
        return new Matrix([...this.data], this.rows, this.cols);
    }

    public clear() {
        for (let i = 0; i < this.rows * this.cols; ++i) {
            this.data[i] = 0;
        }
    }

    public at(row: number, col: number = 0) {
        return this.data[row * this.cols + col];
    }

    public copy(other: Matrix) {
        this.data = [...other.data];
        this.rows = other.rows;
        this.cols = other.cols;
    }
}

// const mat = Matrix.fromArray([[1, 2, 4], [3, 4, 3]]);
// const mat2 = Matrix.fromArray([[1, 0, 0], [0, 0, 0]]);
// console.log(mat.display());
// mat.negate();
// console.log(mat.display());
// mat.transpose();
// console.log(mat.display())
// const m1 = Matrix.fromArray([[2, 1, 2], [1, 2, 4], [4, 5, 2]]);
// // const v = Matrix.fromVector([2, -1]);
// const m2 = Matrix.fromArray([[1, 2, 2], [4, -1, 3], [5, 7, 1]]);
// m2.multiplyLeft(m1);
// console.log(m2.display());
//
// const mat = Matrix.fromArray(
//     [
//         [1, 2, 0],
//         [2, 0, 1],
//         [3, 6, 1]
//     ]
// )
// console.log(mat.display());
// mat.rref();
// console.log(mat.display());
// console.log(mat.solve([1,1,1]))
// const m1 = Matrix.fromArray([[1], [2]]);
// const m2 = Matrix.fromArray([[1, 2]]);
// m1.multiplyLeft(m2);
// console.log(m1.display())