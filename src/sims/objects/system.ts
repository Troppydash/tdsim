import {TDElement} from "../../canvas/drawers/basics.js";
import {ICanvas, IElement} from "../../canvas/canvas.js";
import {DynamicGraphs, Graphing} from "../algos/graphing.js";
import {BaseSystem, Matrix, Vector} from "./constraint.js";
import {Plane, Vec2} from "../../computation/vector.js";
import {Primitives} from "../../canvas/drawers/mechanics.js";

export namespace ControlSystem {

    import BaseGrapher = Graphing.BaseGrapher;

    export interface Plant<I, O> {
        iterate(signal: I, dt?: number, t?: number): O;
    }

    export interface Controller<E, O> {
        control(error: E): O;
    }

    export class PIDController implements Controller<number, number> {
        constructor(
            private integral: number,
            private constants: [number, number, number],  // Kp, Ki, Kd
            private lastError = 0,
        ) {

        }

        control(error: number): number {
            const [Kp, Ki, Kd] = this.constants;

            // u(x) = Kp e + Ki \int e dt + Kd de/dt
            this.integral += error;
            const derivative = error - this.lastError;
            this.lastError = error;

            return Kp * error + Ki * this.integral + Kd * derivative;
        }
    }

    export class AdditivePlant implements Plant<number, number> {
        private velocity: number = 0;
        private acceleration: number = 0;

        constructor(private total: number = 0) {

        }

        iterate(signal: number): number {
            this.acceleration = signal;

            this.velocity += 0.01 * this.acceleration;
            this.total += 0.01 * this.velocity;
            return this.total;
        }
    }

    interface TestSystemOptions {
        signal: (t: number) => number;
        duration: number;
        dt: number;
    }

    export class TestSystem extends TDElement {
        private controller: Controller<number, number>;
        private plant: Plant<number, number>;
        private options: TestSystemOptions;
        private rendered = false;

        private graph: BaseGrapher;


        constructor(controller: Controller<number, number>,
                    grapher: BaseGrapher,
                    options: TestSystemOptions,
        ) {
            super();

            this.controller = controller;
            this.plant = new AdditivePlant(options.signal(0));
            this.options = options;

            this.graph = grapher;
        }

        start(parent: ICanvas, ctx: CanvasRenderingContext2D) {
            this.graph.start(parent, ctx);
        }

        update(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            if (!this.rendered) {

                const {signal, dt, duration} = this.options;

                let signals = [];
                let points = [];
                let y = signal(0);
                let t = 0;
                while (t < duration) {
                    const r = signal(t);
                    const error = r - y;
                    const u = this.controller.control(error);
                    y = this.plant.iterate(u);

                    points.push([t, y]);
                    signals.push([t, r]);

                    t += dt;
                }

                this.graph.setData(points, 0, true);
                this.graph.setData(signals, 1, true);

                this.rendered = true;
            }
        }

        render(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            this.graph.render(parent, ctx, dt);

        }

    }


    export interface Controllable<I, O> extends Plant<I, O>, IElement {
    }

    export class SingleSystemController extends TDElement {
        private error: number = 0;

        constructor(
            readonly system: Controllable<number, number>,
            readonly controller: Controller<number, number>
        ) {
            super();
        }

        start(parent: ICanvas, ctx: CanvasRenderingContext2D) {
            this.system.start(parent, ctx);
        }

        update(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            const signal = this.controller.control(this.error);
            this.error = this.system.iterate(signal, dt, parent.totalTime);
        }

        render(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            this.system.render(parent, ctx, dt);
        }

        stop(parent: ICanvas, ctx: CanvasRenderingContext2D) {
            this.system.stop(parent, ctx);
        }

    }
}

export namespace Systems {
    import EnergeticSystems = DynamicGraphs.EnergeticSystems;
    import Controllable = ControlSystem.Controllable;

    interface PendulumSettings {
        mass: number;
        length: number;
        angle: number;
        gravity: number;
    }

    export class ConstraintPendulum extends BaseSystem implements EnergeticSystems {
        imass: Matrix;

        ctt(q: Vector, t: number): Vector {
            return Matrix.fromVector([
                0
            ]);
        }

        J(q: Vector, dq: Vector, t: number): Matrix {
            return Matrix.fromArray([
                [2 * q.at(0), 2 * q.at(1)],
            ]);
        }

        dJ(q: Vector, dq: Vector, t: number): Matrix {
            return Matrix.fromArray([
                [2 * dq.at(0), 2 * dq.at(1)]
            ]);
        }

        C(q: Vector, dq: Vector, t: number): Vector {
            return null;
        }

        dC(q: Vector, dq: Vector, t: number): Vector {
            return null;
        }

        private readonly settings: PendulumSettings;

        constructor(
            settings: PendulumSettings
        ) {
            const {angle, length, mass} = settings;
            // default velocity, position
            const q = [
                Math.sin(angle) * length,
                -Math.cos(angle) * length
            ];
            const dq = [0, 0];
            super(q, dq);

            // compute imass
            this.imass = Matrix.fromArray([
                [1 / mass, 0],
                [0, 1 / mass],
            ]);

            this.settings = settings;
        }

        kineticEnergy(): number {
            const [x, y] = this.dq.data;
            const v = x ** 2 + y ** 2;
            return 0.5 * this.settings.mass * v;
        }

        potentialEnergy(): number {
            return this.q.data[1] * this.settings.mass * this.settings.gravity;
        }

        totalEnergy() {
            return this.kineticEnergy() + this.potentialEnergy();
        }

        update(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            const {gravity, mass} = this.settings;
            this.addForce([0, -gravity * mass]);
            this.tick(parent.totalTime, dt);
        }

        render(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            // render line from anchor to position
            const anchor = [6, 6] as Vec2;
            const position = this.position() as Vec2;

            const ball = Plane.VecAddV(anchor, position);

            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(...parent.localToWorld(anchor));
            ctx.lineTo(...parent.localToWorld(ball));
            ctx.stroke();
            ctx.closePath();

            Primitives.DrawHollowCircle(parent, ctx, ball, 0.75, 0.05, '#000');
        }

    }

    export class DoublePendulum extends BaseSystem implements EnergeticSystems {
        imass: Matrix;

        feedback = [-0.05, -0.1, -0.33, -0.05];

        J(q: Vector, dq: Vector, t: number): Matrix {
            const [x1, y1, x2, y2] = q.data;
            return Matrix.fromArray([
                [2 * x1, 2 * y1, 0, 0],
                [2 * (x1 - x2), 2 * (y1 - y2), -2 * (x1 - x2), -2 * (y1 - y2)]
            ]);
        }

        ctt(q: Vector, t: number): Vector {
            return Matrix.fromVector([
                0, 0
            ]);
        }

        dJ(q: Vector, dq: Vector, t: number): Matrix {
            const [x1, y1, x2, y2] = dq.data;
            return Matrix.fromArray([
                [2 * x1, 2 * y1, 0, 0],
                [2 * (x1 - x2), 2 * (y1 - y2), -2 * (x1 - x2), -2 * (y1 - y2)]
            ]);
        }

        C(q: Vector, dq: Vector, t: number): Vector {
            const [l1, l2] = [Math.sqrt(2), Math.sqrt(2)];
            const [x1, y1, x2, y2] = q.data;

            return Matrix.fromVector([
                x1 ** 2 + y1 ** 2 - l1 ** 2,
                (x1 - x2) ** 2 + (y1 - y2) ** 2 - l2 ** 2
            ]);
        }

        dC(q: Vector, dq: Vector, t: number): Vector {
            const [x1, y1, x2, y2] = q.data;
            const [dx1, dy1, dx2, dy2] = dq.data;

            return Matrix.fromVector([
                2 * x1 * dx1 + 2 * y1 * dy1,
                2 * (x1 - x2) * dx1 + 2 * (y1 - y2) * dy1 - 2 * (x1 - x2) * dx2 - 2 * (y1 - y2) * dy2
            ]);
        }

        kineticEnergy(): number {
            const [dx1, dy1, dx2, dy2] = this.dq.data;

            return 0.5 * 1 * (dx1 * dx1 + dy1 * dy1) + 0.5 * 1 * (dx2 * dx2 + dy2 * dy2);
        }

        potentialEnergy(): number {
            const [x1, y1, x2, y2] = this.q.data;

            return 1 * 9.81 * y1 + 1 * 9.81 * y2;
        }

        totalEnergy(): number {
            return this.kineticEnergy() + this.potentialEnergy();
        }

        constructor() {
            super([1, 1, 2, 2], [0, 0, 0, 0]);
            this.imass = Matrix.fromArray([
                [1, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 0, 1, 0],
                [0, 0, 0, 1],
            ]);
        }

        update(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            this.addForce([0, -9.81, 0, -9.81]);
            this.tick(parent.totalTime, dt);
        }

        render(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            const anchor = [6, 6] as Vec2;
            const [x1, y1, x2, y2] = this.q.data;

            const b1 = Plane.VecAddV(anchor, [x1, y1]);
            const b2 = Plane.VecAddV(anchor, [x2, y2]);

            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(...parent.localToWorld(anchor));
            ctx.lineTo(...parent.localToWorld(b1));
            ctx.lineTo(...parent.localToWorld(b2));
            ctx.stroke();
            ctx.closePath();

            Primitives.DrawCircle(parent, ctx, b1, 0.25, '#000');
            Primitives.DrawCircle(parent, ctx, b2, 0.25, '#000');

        }
    }


    interface InvertedPendulumSettings {
        location: Vec2;
    }

    export class InvertedPendulum extends BaseSystem implements Controllable<number, number> {
        imass: Matrix;

        C(q: Vector, dq: Vector, t: number): Vector {
            const [x, x1, y1] = q.data;
            const l = this.length;
            return Matrix.fromVector([
                (x1 - x) ** 2 + y1 ** 2 - l ** 2
            ]);
        }

        dC(q: Vector, dq: Vector, t: number): Vector {
            const [x, x1, y1] = q.data;
            const [dx, dx1, dy1] = dq.data;
            return Matrix.fromVector([
                -2 * (x1 - x) * dx + 2 * (x1 - x) * dx1 + 2 * y1 * dy1
            ]);
        }

        J(q: Vector, dq: Vector, t: number): Matrix {
            const [x, x1, y1] = q.data;
            return Matrix.fromArray([
                [-2 * (x1 - x), 2 * (x1 - x), 2 * y1]
            ]);
        }

        dJ(q: Vector, dq: Vector, t: number): Matrix {
            const [dx, dx1, dy1] = dq.data;
            return Matrix.fromArray([
                [-2 * (dx1 - dx), 2 * (dx1 - dx), 2 * dy1]
            ]);
        }

        ctt(q: Vector, t: number): Vector {
            return Matrix.fromVector([
                0
            ]);
        }

        private gravity: number;
        private mass: [number, number];
        private length: number;
        private origin: number;
        readonly settings: InvertedPendulumSettings;

        private compensate: number = 0;

        private userForce: number = 0;
        private userBallForce: number = 0;

        constructor(
            gravity: number,
            mass: [number, number],
            position: [number, number, number],  // x, x1, y1
            velocity: [number, number, number],
            settings: InvertedPendulumSettings
        ) {
            super(position, velocity);

            this.gravity = gravity;
            this.mass = mass;
            const [x, x1, y1] = position;
            this.length = Math.sqrt((x1 - x) ** 2 + y1 ** 2);
            this.imass = Matrix.fromDiagonal([1 / mass[0], 1 / mass[1], 1 / mass[1]]);
            this.origin = position[0];

            this.settings = settings;
        }

        start(parent: ICanvas, ctx: CanvasRenderingContext2D) {
            parent.inputs.keyboard.subscribe((newValue, oldValue) => {
                if (newValue.includes('a')) {
                    this.userForce = -20;
                } else if (newValue.includes('d')) {
                    this.userForce = 20;
                } else {
                    this.userForce = 0;
                }

                if (newValue.includes('q')) {
                    this.userBallForce = -3;
                } else if (newValue.includes('e')) {
                    this.userBallForce = 3;
                } else {
                    this.userBallForce = 0;
                }
            });
        }

        iterate(signal: number, dt: number, t: number): number {
            // compute user force
            this.compensate = signal * this.mass[0];
            this.addForce([this.compensate + this.userForce * this.mass[0], this.userBallForce * this.mass[1], -this.gravity * this.mass[1]]);
            this.tick(t, dt);

            // error
            // compute angle
            const [x, x1, y1] = this.q.data;
            return Math.atan2(x1 - x, Math.max(0, y1)) + 0.05*(x-this.origin);
        }

        totalError(): number {
            const [x, x1, y1] = this.q.data;
            return Math.atan2(x1 - x, Math.max(0, y1));
        }

        update(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            this.addForce([0, 0, -9.81]);
            this.tick(parent.totalTime, dt);
        }

        render(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            const [x, x1, y1] = this.q.data;

            const origin = Plane.VecAddV([x, 0], this.settings.location);
            const ball = Plane.VecAddV([x1, y1], this.settings.location);

            // draw cart
            Primitives.DrawRect(parent, ctx, origin, [1, 0.5], 0.03, '#000');
            Primitives.DrawHollowCircle(parent, ctx, Plane.VecAddV(origin, [-0.35, -0.25]), 0.1, 0.03, '#000');
            Primitives.DrawHollowCircle(parent, ctx, Plane.VecAddV(origin, [+0.35, -0.25]), 0.1, 0.03, '#000');

            // draw line
            Primitives.DrawLine(parent, ctx, origin, ball, 1, '#000');

            Primitives.DrawCircle(parent, ctx, ball, 0.25, '#000');

            Primitives.DrawVectorMaths(
                parent,
                ctx,
                origin,
               [this.compensate, 0],
                0.15,
                0.2,
                '#ff0000'
            )

            Primitives.DrawVectorMaths(
                parent,
                ctx,
                origin,
                [this.userForce, 0],
                0.15,
                0.2,
                '#00ff00'
            )

            Primitives.DrawVectorMaths(
                parent,
                ctx,
                ball,
                [this.userBallForce, 0],
                0.15,
                0.2,
                '#00ff00'
            )

        }

    }
}