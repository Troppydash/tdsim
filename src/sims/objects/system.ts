import {Bindable, Binding} from "../../canvas/binding.js";
import {TDElement} from "../../canvas/drawers/basics.js";
import {ICanvas} from "../../canvas/canvas.js";
import {DynamicGraphs, Graphing} from "../algos/graphing.js";
import {BaseSystem, Matrix, Vector} from "./constraint.js";
import {Plane, Vec2} from "../../computation/vector.js";
import {Primitives} from "../../canvas/drawers/mechanics.js";

export namespace ControlSystem {

    import BaseGrapher = Graphing.BaseGrapher;

    export interface Plant<I, O> {
        iterate(signal: I): O;
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
}

export namespace Systems {
    import EnergeticSystems = DynamicGraphs.EnergeticSystems;

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
                [1/mass, 0],
                [0, 1/mass],
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
            const { gravity, mass} = this.settings;
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
}