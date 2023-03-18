// SOLVER, SYSTEM

import {TDElement} from "../../canvas/drawers/basics.js";

export abstract class BaseSystem extends TDElement {
    // constants
    abstract imass: Matrix;
    abstract J(q: Vector, dq: Vector, t: number): Matrix;
    abstract dJ(q: Vector, dq: Vector, t: number): Matrix;
    abstract ctt(q: Vector, t: number): Vector;

    // variables
    q: Vector;
    dq: Vector;

    forces: Vector;

    // constructors for initial conditions
    protected constructor(
        q: number[],
        dq: number[]
    ) {
        super();
        this.q = Matrix.fromVector(q);
        this.dq = Matrix.fromVector(dq);
        this.forces = Matrix.empty(q.length);
    }

    protected tick(t: number, dt: number) {

        // compute acceleration
        const solver = new ConstraintSolver();
        const J = this.J(this.q, this.dq, t);
        const dJ = this.dJ(this.q, this.dq, t);
        const ctt = this.ctt(this.q, t);
        const a = solver.solve(this.imass, J, dJ, ctt, this.forces, this.dq);

        // apply acceleration, temporary euler
        a.multiply(dt);
        this.dq.add(a);

        const v = this.dq.clone();
        v.multiply(dt);
        this.q.add(v);

        this.forces.clear();

    }

    public addForce(force: number[]) {
        const F = Matrix.fromVector(force);
        this.forces.add(F);
    }

    protected position() {
        return this.q.data;
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
     */
    public solve(
        imass: Matrix, J: Matrix, dJ: Matrix, ctt: Vector,
        forces: Vector, velocity: Vector,
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
        const JT = J.clone();
        JT.transpose();
        multipliers.multiplyLeft(JT);  // = C

        let C = multipliers;
        C.add(forces);
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
    }

    public subtract(other: Matrix) {
        for (let i = 0; i < this.data.length; ++i) {
            this.data[i] -= other.data[i];
        }

        this.checkNaN();

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

        mat.checkNaN();

        let result = [];
        for (let row = 0; row < rows; ++row) {
            result.push(mat.data[(row + 1) * cols - 1]);
        }

        return Matrix.fromVector(result);
    }

    public rref(epsilon = 0.001) {
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