import {Complex, Pair, Plane, Range, Scalar, Vec2, VecN, VSpace} from "./vector.js";
import {MotionEq} from "../sims/objects/fundamental.js";

// Deprecated
export type IDiffEqSolvers = (accf: MotionEq<Vec2>, p: Vec2, v: Vec2, t: number, dt: number) => [Vec2, Vec2];

// Deprecated
export namespace DiffEqSolvers {
    export function Euler(accf: MotionEq<Vec2>, p: Vec2, v: Vec2, t: number, dt: number): [Vec2, Vec2] {

        const acc = accf(t, [0, 0], v, p);
        const newPos = Plane.VecAddV(p, Plane.VecMulC(v, dt));
        const newVel = Plane.VecAddV(v, Plane.VecMulC(acc, dt));

        return [newPos, newVel];
    }

    export function RK4(accf: MotionEq<Vec2>, p: Vec2, v: Vec2, t: number, dt: number): [Vec2, Vec2] {
        const a: Vec2 = [0, 0];

        // the combined [pos, vel]'s derivative, this is the function we want to solve
        const dzdt = (t, p, v) => {
            return [
                v,
                accf(t, a, v, p)
            ] as [Vec2, Vec2];
        }

        // run the RK4 solver, notice that all ks are [pos, vel]'s
        const k1 = dzdt(t, p, v);
        const k2 = dzdt(t + dt / 2, Plane.VecAddV(p, Plane.VecMulC(k1[0], dt / 2)), Plane.VecAddV(v, Plane.VecMulC(k1[1], dt / 2)));
        const k3 = dzdt(t + dt / 2, Plane.VecAddV(p, Plane.VecMulC(k2[0], dt / 2)), Plane.VecAddV(v, Plane.VecMulC(k2[1], dt / 2)));
        const k4 = dzdt(t + dt, Plane.VecAddV(p, Plane.VecMulC(k3[0], dt)), Plane.VecAddV(v, Plane.VecMulC(k3[1], dt)));

        // sum up the ks [pos, ] part to get the change in pos
        const totalP = Plane.VecAddV(
            Plane.VecAddV(
                k1[0],
                Plane.VecMulC(k2[0], 2)
            ),
            Plane.VecAddV(
                k4[0],
                Plane.VecMulC(k3[0], 2)
            ),
        );

        // sum up the ks [, vel] part to get the change in vel
        const totalV = Plane.VecAddV(
            Plane.VecAddV(
                k1[1],
                Plane.VecMulC(k2[1], 2)
            ),
            Plane.VecAddV(
                k4[1],
                Plane.VecMulC(k3[1], 2)
            ),
        );

        // returns the new [pos, vel] by += old [pos, vel]
        return [
            Plane.VecAddV(p, Plane.VecMulC(totalP, dt / 6)),
            Plane.VecAddV(v, Plane.VecMulC(totalV, dt / 6))
        ]
    }
}

export namespace PhysicsSolvers {
    // A function differential equation
    export type DiffEq = (
        t: number,
        p: VecN,
        v: VecN,
    ) => VecN;

    /**
     * A solver for differential equations
     *
     * @example
     * let solver;
     * const [newPos, newVel] = solver(d/dt d/dt x, p, v, t, dt);
     */
    export type Solvers = (diffeq: DiffEq, p: VecN, v: VecN, t: number, dt: number) => [VecN, VecN];


    export function RK4(diffeq: DiffEq, p: VecN, v: VecN, t: number, dt: number): [VecN, VecN] {
        // common namespace
        const Space = VSpace;

        // the combined [pos, vel]'s derivative, this is the function we want to solve
        const dzdt = (t, p, v) => {
            return [
                v,
                diffeq(t, p, v)
            ] as [VecN, VecN];
        }

        // run the RK4 solver, notice that all ks are [pos, vel]'s
        const k1 = dzdt(t, p, v);
        const k2 = dzdt(t + dt / 2,
            Space.VecAddV(
                p, Space.VecMulC(k1[0], dt / 2)
            ),
            Space.VecAddV(
                v, Space.VecMulC(k1[1], dt / 2)
            )
        );
        const k3 = dzdt(t + dt / 2, Space.VecAddV(p, Space.VecMulC(k2[0], dt / 2)), Space.VecAddV(v, Space.VecMulC(k2[1], dt / 2)));
        const k4 = dzdt(t + dt, Space.VecAddV(p, Space.VecMulC(k3[0], dt)), Space.VecAddV(v, Space.VecMulC(k3[1], dt)));

        // sum up the ks [pos, ] part to get the change in pos
        const totalP = Space.VecAddV(
            Space.VecAddV(
                k1[0],
                Space.VecMulC(k2[0], 2)
            ),
            Space.VecAddV(
                k4[0],
                Space.VecMulC(k3[0], 2)
            ),
        );

        // sum up the ks [, vel] part to get the change in vel
        const totalV = Space.VecAddV(
            Space.VecAddV(
                k1[1],
                Space.VecMulC(k2[1], 2)
            ),
            Space.VecAddV(
                k4[1],
                Space.VecMulC(k3[1], 2)
            ),
        );

        // returns the new [pos, vel] by += old [pos, vel]
        return [
            Space.VecAddV(p, Space.VecMulC(totalP, dt / 6)),
            Space.VecAddV(v, Space.VecMulC(totalV, dt / 6))
        ]
    }

    export function Verlet(diffeq: DiffEq, p: VecN, v: VecN, t: number, dt: number): [VecN, VecN] {
        const Space = VSpace;

        const at = diffeq(t, p, v);
        const hv = Space.VecAddV(v, Space.VecMulC(at, 0.5 * dt));
        const np = Space.VecAddV(p, Space.VecMulC(hv, dt));
        const atdt = diffeq(t + dt, np, v);
        const nv = Space.VecAddV(hv, Space.VecMulC(atdt, 0.5 * dt));
        return [np, nv];
    }
}

/**
 * Solvers for equations of function f(q, t),
 * where q is a n-vector and t is a scalar.
 *
 * Of form:
 * `0 = A + B * fq(q, t) + C * ft(q, t) + D * fqq(q, t) + E * ftt(q, t) + F * fqt(q, t) + ...`
 */
export namespace SpaceTimeSolvers {
    /**
     * `D * ft(x, t) + C * fq(q, t) + B * f(q, t) + A = 0`
     */
    export type FirstOrderEq = [Complex, Complex, Complex, Complex];

    export type IFirstOrderSolver = typeof FirstOrderSolver;

    // basic first order
    export function FirstOrderSolver(equation: FirstOrderEq, xs: Complex[], dx: Range, dt: number): Complex[] {
        const [D, C, B, A] = equation;
        const {Add, Mul, Sub, Div, Neg} = Complex;
        const FR = Complex.FromRect;

        let newXs = [...xs];
        for (const [x, i] of dx) {
            // check for stencils that can be used
            let fq;
            if (i === 0) {
                // use euler for first point
                fq = Div(Sub(xs[i + 1], xs[i]), Complex.FromRect(dx.step));
            } else if (i === dx.size - 1) {
                // use euler for last point
                fq = Div(Sub(xs[i], xs[i - 1]), Complex.FromRect(dx.step));
            } else if (i === dx.size - 2 || i === 1) {
                // if 1st,2nd point, use the 2 point method
                fq = Div(Sub(xs[i + 1], newXs[i - 1]), Complex.FromRect(2 * dx.step));
            } else {
                // using five-point stencil derivatives
                // https://en.wikipedia.org/wiki/Five-point_stencil
                fq = Div(
                    Add(
                        Sub(Mul(FR(8), newXs[i + 1]), newXs[i + 2]),
                        Sub(newXs[i - 2], Mul(FR(8), newXs[i - 1])),
                    ),
                    FR(12 * dx.step)
                )
            }

            const f = xs[i];
            // D * (f(x, t + dt) - f(x, t)) / dt = -C * (f(x + dx, t) - f(x, t)) / dx - B * f(x, t) - A
            // f(x, t + dt) = f(x, t) + dt / D * (C * fx(x, t) + B * f(x, t) + A)
            newXs[i] = Add(f, Mul(Complex.FromRect(dt), Neg(Div(Add(Add(Mul(C, fq), Mul(B, f)), A), D))));
        }

        return newXs;
    }


    /**
     * Finite Difference Time Domain method
     *
     * Used to solve Maxwell's equations of form:
     * dE/dt = ∇xB
     * dB/dt = -∇xE
     */

    // assuming constant dt
    export function Maxwell1D(
        Es: number[], Bs: number[],
        space: Range, dt: number,
        sources: Pair<number>[] = [],
        BFieldOnly: boolean = false,
        lastEx: number = 0,
        lastEKx: number = 0,
    ): [number[], number[]] {
        // reminder that the B field positions are shifted to the right by half a dx, time shifted down half a dt
        const dx = space.step;

        // update E fields
        // E(x, t+1/2) = E(x, t-1/2) + dt / dx * (B(x-1/2, t) - B(x+1/2, t))
        // performance
        // for (const [x, i] of space.iter) {
        let i = 1;
        let len = space.iter.length;
        while (i < len) {
            // skip the first B field
            Es[i] += dt / dx * (Bs[i - 1] - Bs[i]);
            ++i;
        }

        for (const [percent, amp] of sources) {
            Es[Math.floor(percent * Es.length)] = amp;
        }

        // open boundary
        Es[len - 1] = lastEKx;
        Es[0] = lastEx;

        // update B fields
        // B(x+1/2, t+1) = B(x+1/2, t) + dt / dx * (E(t+1/2, x) - E(t+1/2, x+1))
        // for (const [x, i] of space.iter) {
        i = 0;
        while (i < len - 1) {
            Bs[i] += dt / dx * (Es[i] - Es[i + 1]);
            ++i;
        }

        return [
            Es,
            Bs
        ]
    }
}
