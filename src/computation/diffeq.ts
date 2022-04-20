import {MotionEq} from "../canvas/canvas";
import {Plane, Vec2} from "./vector";

export type IDiffEqSolvers = (accf: MotionEq<Vec2>, p: Vec2, v: Vec2, t: number, dt: number) => [Vec2, Vec2];

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
