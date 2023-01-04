import {Plane, Vec2} from "../../computation/vector.js";
import {Primitives} from "../../canvas/drawers/mechanics.js";
import {TDObject} from "./fundamental.js";
import {DynamicGraphs} from "../algos/graphing.js";
import EnergeticSystems = DynamicGraphs.EnergeticSystems;

interface TDSpinnerAttr {
    g: number;
    r: number;
    rb: number;
    m: number;
}

export class TDSpinner extends TDObject<TDSpinnerAttr> {
    DefaultAttr = {
        g: 9.81,
        r: 0.0039,
        rb: 0.0635,
        m: 0.65,
    }

    protected size: number;
    protected origin: Vec2;
    protected spinning: boolean;
    protected length: number;

    private vf: number;
    private pf: number;
    private s: number;

    constructor(x = 0, origin: Vec2, length: number, size: number, attr: Partial<TDSpinnerAttr> = {}) {
        super([x, 0]);

        this.setAttr(attr);

        this.size = size;
        this.origin = origin;
        this.spinning = false;
        this.length = length;
        this.vf = 0;
        this.pf = 0;
        this.s = 1;


        this.accf = this._accf;
    }


    _accf(t, a, v, p): Vec2 {
        const {
            g,
            r,
            rb,
            m
        } = this.attr;

        if (p[0] >= this.length && p[1] <= Math.PI) {
            // spring
            let ta = p[1];
            let dta = v[1];

            if (!this.spinning) {
                this.spinning = true;
                this.vf = v[0];
                this.pf = p[0];

                ta = 0;
                dta = v[0] / r;
                this.pos[1] = ta;
                this.vel[1] = dta;
            }

            const acc = g * Math.sin(Math.PI / 2 + ta) / r;
            // const k = r ** 2 + 0.5 * rb ** 2;

            // const acc = Math.tan(ta) * (2 * dta - 0.5 * dta ** 2) + g / k / Math.cos(ta);
            return [0, acc];
        } else {
            if (this.spinning) {
                this.spinning = false;
                this.s = this.s === 1 ? -1 : 1;

                this.pos = [this.pf, 0];
                this.vel = [-this.vf, 0];
            }

            // not spring
            const acc = g / (1 + rb ** 2 / 2 / r ** 2);
            return [acc, 0];
        }
    }


    render(parent, ctx, dt) {
        // where the ball is
        const {
            g,
            r,
            rb,
            m
        } = this.attr;

        let blob: Vec2;
        if (this.spinning) {
            // otherwise
            blob = Plane.VecAddV(this.origin, [0, -(this.length - r)]);

            let ta = this.pos[1];
            if (this.s === 1) {
                blob = Plane.VecAddV(blob, [r * Math.cos(ta), -r * Math.sin(ta)]);
            } else {
                blob = Plane.VecAddV(blob, [r * -Math.cos(ta), -r * Math.sin(ta)]);
            }
        } else {
            blob = Plane.VecAddV(this.origin, [this.s * r, -this.pos[0]]);
        }

        // const [theta, _] = this.pos;
        // const blob = tdVecAddV(this.anchor, [this.length * Math.sin(theta), -this.length * Math.cos(theta)]);

        // draw line
        // ctx.beginPath();
        // ctx.moveTo(...parent.pcTodc(this.anchor));
        // ctx.lineTo(...parent.pcTodc(blob));
        // ctx.stroke();

        // draw blob
        ctx.beginPath();
        ctx.arc(...parent.pcTodc(blob), parent.psTods(this.attr.r), 0, 2 * Math.PI);
        ctx.fill();


        // bigger blob without fill
        ctx.beginPath();
        ctx.arc(...parent.pcTodc(blob), parent.psTods(this.attr.rb), 0, 2 * Math.PI);
        ctx.stroke();
    }
}

interface TDSpringPendulumAttr {
    x0: number;
    g: number;
    k: number;
    m: number;
    dampx: number;
    dampt: number;
}

export class TDSpringPendulum extends TDObject<TDSpringPendulumAttr> implements EnergeticSystems {
    DefaultAttr = {
        x0: 2,
        g: 9.81,
        k: 30,
        m: 1,
        dampx: 0,
        dampt: 0
    };

    protected origin: Vec2;
    protected radius: number;

    constructor(p: Vec2, origin: Vec2, radius: number, attr: Partial<TDSpringPendulumAttr> = {}) {
        super(p);

        this.setAttr(attr);

        this.origin = origin;
        this.radius = radius;

        this.accf = this._accf;
    }

    _accf(_t, a, v, p): Vec2 {
        const {x0, g, k, m, dampx, dampt} = this.attr;
        const [x, t] = p;
        const [dx, dt] = v;

        const ddx = x * dt ** 2 + k / m * (x0 - x) + g * Math.cos(t) - dampx * dx;
        let ddt = -1 * (g * Math.sin(t) + 2 * dt * dx) / x - dampt * dt;
        if (Math.abs(x) < 0.1) {
            ddt = 0;
        }

        return [ddx, ddt];
    }


    render(parent, ctx, dt) {

        const {x0, g, k, m} = this.attr;
        const [x, t] = this.pos;

        // draw blob
        const blob = Plane.VecAddV(this.origin, [Math.sin(t) * x, -Math.cos(t) * x]);

        ctx.beginPath();
        ctx.arc(...parent.pcTodc(blob), parent.psTods(this.radius), 0, 2 * Math.PI);
        ctx.fill();


        // draw spring coil sine wave from origin to blob
        // const [x1, y1] = parent.pcTodc(this.origin);
        // const [x2, y2] = parent.pcTodc(blob);
        // const distance = tdVecMag(tdVecSubV(blob, this.origin));
        // const ds = tdVecReMag(tdVecSubV(blob, this.origin), 1);
        // const points = [];
        // for (let i = 0; i < distance; i += 0.1) {
        //     const [x, y] = tdVecAddV(this.origin, [Math.sin(t) * x0 * i, -Math.cos(t) * x0 * i]);
        //     points.push([parent.pcTodc(x), parent.pcTodc(y)]);
        // }

        // // add points
        // ctx.beginPath();
        // ctx.moveTo(...points[0]);
        // for (let i = 1; i < points.length; i++) {
        //     ctx.lineTo(...points[i]);
        // }
        // ctx.stroke();

        // draw spring
        const points = Primitives.drawSpring(ctx, {
            C: 0.1,
            W: 5,
            A: 0.2,
        }, this.origin, blob);
        // throw new Error('stop');

        ctx.beginPath();
        ctx.moveTo(...parent.pcTodc(points[0]));
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(...parent.pcTodc(points[i]));
        }
        ctx.stroke();


        // ctx.beginPath();
        // ctx.moveTo(...parent.pcTodc(this.origin));
        // ctx.lineTo(...parent.pcTodc(blob));
        // ctx.stroke();

    }

    kineticEnergy(): number {
        const {x0, g, k, m} = this.attr;
        const [x, t] = this.pos;
        const [dx, dt] = this.vel;

        return 0.5 * m * (dx ** 2 + x ** 2 * dt ** 2);
    }

    potentialEnergy(): number {
        const {x0, g, k, m} = this.attr;
        const [x, t] = this.pos;

        return 0.5 * k * (x0 - x) ** 2 - m * g * x * Math.cos(t) + m * g * this.origin[1];
    }
}


