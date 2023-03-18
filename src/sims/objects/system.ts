import {Bindable, Binding} from "../../canvas/binding.js";
import {TDElement} from "../../canvas/drawers/basics.js";
import {ICanvas} from "../../canvas/canvas.js";
import {Graphing} from "../algos/graphing.js";

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

export namespace PracticalCS {
    // compute the cart thingy
}