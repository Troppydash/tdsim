import {Mat2, Plane, Vec2} from "../../computation/vector";
import {TDElement} from "../../canvas/canvas";
import {Primitives} from "../../canvas/drawers/mechanics";
import {EnergeticSystems} from "../algos/graphing";
import {TDObject} from "./fundamental";

export class TDBall extends TDObject {
    protected size: number;

    constructor(size: number, pos: Vec2, g: number = 9.81) {
        super(pos, () => [0, -g]);

        this.size = size;
    }

    render(parent, ctx, dt) {
        ctx.beginPath();
        ctx.arc(...parent.pcTodc(this.pos), parent.psTods(this.size), 0, 2 * Math.PI);
        ctx.fill();
    }
}

export class TDOsillator extends TDObject {
    protected init: Vec2;
    protected size: number;
    protected mass: number
    protected k: number
    protected damp: number

    constructor(offset, mass, size, pos, k = 10, damp = 0.1) {
        super(Plane.VecAddV(offset, pos));

        this.init = pos;
        this.size = size;
        this.mass = mass;
        this.k = k;
        this.damp = damp;

        this.accf = this._accf;
    }

    _accf(t, a, v, p): Vec2 {
        const k = this.k;
        const c = this.damp;
        return [(-k * (p[0] - this.init[0]) - c * v[0]) / this.mass, 0];
    }

    render(parent, ctx, dt) {
        // draw spring
        const start = this.init;
        const end = this.pos;
        const points = Primitives.drawSpring(ctx, {
            C: 0.1,
            W: 5,
            A: 0.2,
        }, start, end);
        ctx.beginPath();
        ctx.moveTo(...parent.pcTodc(points[0]));
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(...parent.pcTodc(points[i]));
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(...parent.pcTodc(this.pos), parent.psTods(this.size), 0, 2 * Math.PI);
        ctx.fill();
    }
}

export class TDPendulum extends TDObject {
    protected anchor: Vec2;
    protected length: number;
    protected size: number;
    protected damp: number;

    constructor(angle: number, anchor: Vec2, length: number, size: number, damp = 0.2) {
        super([angle, 0]);

        this.anchor = anchor;
        this.length = length;
        this.size = size;
        this.damp = damp;

        this.accf = this._accf;
    }

    _accf(t, a, v, p): Vec2 {
        return [-9.81 / this.length * Math.sin(p[0]) - this.damp * v[0], 0];
    }


    render(parent, ctx, dt) {
        // where the ball is
        const [theta, _] = this.pos;
        const blob = Plane.VecAddV(this.anchor, [this.length * Math.sin(theta), -this.length * Math.cos(theta)]);

        // draw line
        ctx.beginPath();
        ctx.moveTo(...parent.pcTodc(this.anchor));
        ctx.lineTo(...parent.pcTodc(blob));
        ctx.stroke();

        // draw blob
        ctx.beginPath();
        ctx.arc(...parent.pcTodc(blob), parent.psTods(this.size), 0, 2 * Math.PI);
        ctx.fill();
    }
}

export class TDDoublePendulum extends TDObject implements EnergeticSystems {
    protected anchor: Vec2;
    protected length1: number;
    protected length2: number;
    protected mass1: number;
    protected mass2: number;
    protected size: number;
    protected color: string;
    protected damp1: number;
    protected damp2: number;

    protected g: number = 9.81;

    constructor(angle1: number, angle2: number,
                vel0: Vec2,
                anchor: Vec2,
                length1: number, length2: number,
                mass1: number, mass2: number,
                size: number,
                color: string,
                damp1 = 0.4, damp2 = 0.4) {
        super([angle1, angle2], () => [0, 0], [0, 0], vel0);

        this.anchor = anchor;
        this.length1 = length1;
        this.length2 = length2;
        this.mass1 = mass1;
        this.mass2 = mass2;
        this.size = size;
        this.color = color;
        this.damp1 = damp1;
        this.damp2 = damp2;

        this.accf = this._accf;
    }

    _accf(t, a, v, p): Vec2 {
        const g = this.g;
        const m1 = this.mass1;
        const m2 = this.mass2;
        const l1 = this.length1;
        const l2 = this.length2;
        const [v1, v2] = v;
        const [p1, p2] = p;

        const A = (m1 + m2) * l1;
        const B = m2 * l2 * Math.cos(p1 - p2);
        const C = m2 * l2 * v2 * v2 * Math.sin(p1 - p2) + (m1 + m2) * g * Math.sin(p1);

        const D = m2 * l2;
        const E = m2 * l1 * Math.cos(p1 - p2);
        const F = m2 * g * Math.sin(p2) - m2 * l1 * v1 * v1 * Math.sin(p1 - p2);

        const d1 = this.damp1 * v[0];
        const d2 = this.damp2 * v[1];

        const mat: Mat2 = [E, D, A, B];
        const vec: Vec2 = [-F, -C];

        return Plane.VecAddV(Plane.MatVec(Plane.MatInv(mat), vec), [-d1, -d2]);
    }

    render(parent, ctx, dt) {
        const [t1, t2] = this.pos;
        const blob1 = Plane.VecAddV(this.anchor, [this.length1 * Math.sin(t1), -this.length1 * Math.cos(t1)]);
        const blob2 = Plane.VecAddV(blob1, [this.length2 * Math.sin(t2), -this.length2 * Math.cos(t2)]);

        ctx.lineWidth = 4;
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;
        // draw blob1
        ctx.beginPath();
        ctx.moveTo(...parent.pcTodc(this.anchor));
        ctx.lineTo(...parent.pcTodc(blob1));
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(...parent.pcTodc(blob1), parent.psTods(this.size), 0, 2 * Math.PI);
        ctx.fill();

        // draw blob2
        ctx.beginPath();
        ctx.moveTo(...parent.pcTodc(blob1));
        ctx.lineTo(...parent.pcTodc(blob2));
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(...parent.pcTodc(blob2), parent.psTods(this.size), 0, 2 * Math.PI);
        ctx.fill();
    }

    kineticEnergy(): number {
        const {mass1, mass2, length1, length2} = this;
        const [t1, t2] = this.pos;
        const [v1, v2] = this.vel;

        return 0.5 * mass1 * length1 ** 2 * v1 ** 2 + 0.5 * mass2 * (
            length1 ** 2 * v1 ** 2 + length2 ** 2 * v2 ** 2
            + 2 * length1 * length2 * v1 * v2 * Math.cos(t1 - t2)
        );
    }

    potentialEnergy(): number {
        const {mass1, mass2, length1, length2} = this;
        const [t1, t2] = this.pos;

        // the last term is a constant
        return -((mass1 + mass2) * this.g * length1 * Math.cos(t1)
            + mass2 * this.g * length2 * Math.cos(t2))
            + (mass1 + mass2) * this.g * this.anchor[1];
    }
}

export class TDDoublePendulumTrail extends TDDoublePendulum {
    protected step: number;
    protected trail: number;
    protected trails: Vec2[];

    constructor(trail: number, step: number, ...args: ConstructorParameters<typeof TDDoublePendulum>) {
        super(...args);

        this.step = step;
        this.trail = trail;
        this.trails = [];
    }


    render(parent, ctx, dt) {
        const [t1, t2] = this.pos;
        const blob1 = Plane.VecAddV(this.anchor, [this.length1 * Math.sin(t1), -this.length1 * Math.cos(t1)]);
        const blob2 = Plane.VecAddV(blob1, [this.length2 * Math.sin(t2), -this.length2 * Math.cos(t2)]);

        // update
        this.trails.push(parent.pcTodc(blob2));
        if (this.trails.length > this.trail) {
            this.trails.shift();
        }

        // draw trails
        ctx.lineWidth = 2;
        for (let i = 0; i < this.trails.length - this.step; i += this.step) {
            ctx.beginPath();
            ctx.strokeStyle = this.color + Math.max(Math.floor((i / this.trails.length) * 255), 20).toString(16);
            ctx.moveTo(...this.trails[i]);
            ctx.lineTo(...this.trails[i + this.step]);
            ctx.stroke();
        }


        // draw stems
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.moveTo(...parent.pcTodc(this.anchor));
        ctx.lineTo(...parent.pcTodc(blob1));
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(...parent.pcTodc(blob1));
        ctx.lineTo(...parent.pcTodc(blob2));
        ctx.stroke();
    }
}

export class TDBox extends TDElement {
    protected anchor: Vec2;
    protected points: Vec2[];
    protected normals: Vec2[];
    protected edges: [Vec2, Vec2][];

    constructor(pos: Vec2, width: number, height: number, rot: number) {
        super();

        // positions
        this.anchor = pos;
        const hw = width / 2;
        const hh = height / 2;

        const tl: Vec2 = [-hw, hh];
        const tr: Vec2 = [hw, hh];
        const bl: Vec2 = [-hw, -hh];
        const br: Vec2 = [hw, -hh];
        const points: Vec2[] = [tl, tr, br, bl];
        this.points = points.map(point => Plane.VecAddV(Plane.VecRotate(rot, point), this.anchor));

        this.calcNormals();
    }

    calcNormals() {
        // top, right, bottom, left
        this.normals = [];
        this.edges = [];
        for (let i = 0; i < 4; ++i) {
            const p1 = this.points[(i + 1) % 4];
            const p2 = this.points[i];
            this.edges.push([p1, p2]);
            this.normals.push(Plane.VecNormal(Plane.VecSubV(p1, p2)));
        }
    }

    rotateAround(point, rad) {
        const center = Plane.VecAddV(this.anchor, point);

        const newPoints = this.points.map(p => {
            let rel = Plane.VecSubV(p, center);
            rel = Plane.VecRotate(rad, rel);
            return Plane.VecAddV(rel, center);
        });

        const newAnchor = Plane.VecRotate(rad, Plane.VecInv(point));
        this.anchor = Plane.VecAddV(newAnchor, Plane.VecAddV(this.anchor, point));
        this.points = newPoints;

        this.calcNormals();
    }
}

export class TDLight extends TDElement {
    protected init: Vec2;
    protected speed: number;
    protected length: number;
    protected objects: TDGlass[];

    protected pos: Vec2;
    protected vel: Vec2;
    protected distance: number;

    protected sections: (Vec2 | null)[];
    protected intensities: number[];
    protected multiplier: number;

    constructor(pos: Vec2, vel: Vec2, length: number) {
        super();

        this.init = pos;
        this.speed = Plane.VecMag(vel);
        this.length = length;
        this.objects = [];

        this.pos = pos;
        this.vel = vel;
        this.distance = 0;

        this.sections = [null];
        this.intensities = [1];
        this.multiplier = 1;
    }

    start(parent, ctx) {
        this.sections[0] = parent.pcTodc(this.init);
    }

    addGlass(glass: TDGlass) {
        this.objects.push(glass);
    }

    update(parent, ctx, dt) {
        if (this.distance > this.length) {
            return;
        }

        const dv = Plane.VecMulC(this.vel, dt);
        const s = Plane.VecMag(dv);
        const newPos = Plane.VecAddV(this.pos, dv);


        // check for intersection
        let handled = false;
        for (const obj of this.objects) {
            const res = obj.intersect(this.pos, newPos);
            if (res) { // if does intersect
                const [normal, point] = res;
                // check if entering or exiting
                const dp = Plane.VecDot(dv, normal);

                // first move to intersect
                const init = Plane.VecMag(Plane.VecSubV(point, this.pos));
                // this.distance += init;
                // let n = this.distance;

                // add entries
                this.sections.push(parent.pcTodc(point));
                this.nextIntensity(init);
                // this.intensities.push(this.multiplier * Math.min(1, 1 / n / n))

                const isRight = Plane.VecDot(Plane.VecRotate(0.5 * Math.PI, normal), dv) > 0;

                let remain;
                // if entering
                if (dp < 0) {
                    // angle of incidence
                    const ti = Math.acos(Plane.VecDot(Plane.VecInv(dv), normal) / (Plane.VecMag(dv) * Plane.VecMag(normal)));
                    const tr = Math.asin(Math.sin(ti) / obj.index);

                    // move rest
                    remain = s - init;
                    this.vel = Plane.VecMulC(Plane.VecRotate(isRight ? -tr : tr, Plane.VecInv(normal)), this.speed);
                    const rv = Plane.VecMulC(this.vel, remain);
                    this.pos = Plane.VecAddV(point, rv);

                    this.multiplier *= fresnel(ti, 1, obj.index);
                } else {
                    // angle of incidence
                    const ti = Math.acos(Plane.VecDot(dv, normal) / (Plane.VecMag(dv) * Plane.VecMag(normal)));
                    const tr = Math.asin(Math.sin(ti) * obj.index);
                    if (isNaN(tr)) {
                        // total internal reflection
                        this.distance = 0;
                        return;
                    }

                    // move rest
                    remain = s - init;
                    this.vel = Plane.VecMulC(Plane.VecRotate(isRight ? tr : -tr, normal), this.speed);
                    const rv = Plane.VecMulC(this.vel, remain);
                    this.pos = Plane.VecAddV(point, rv);

                    this.multiplier *= fresnel(ti, obj.index, 1);
                }

                // add entries
                // this.distance += remain;
                // n = this.distance;

                this.sections.push(parent.pcTodc(this.pos));
                this.nextIntensity(remain);

                // this.intensities.push(this.multiplier * Math.min(1, 1 / n / n))

                handled = true;
                break;
            }
        }

        if (!handled) {
            // this.distance += s;
            // const n = this.distance;

            this.sections.push(parent.pcTodc(newPos));
            // this.intensities.push(this.multiplier * Math.min(1, 1 / n / n));
            this.nextIntensity(s);
            this.pos = newPos;
        }
    }

    nextIntensity(d) {
        const li = this.intensities[0];
        this.distance += d;
        this.intensities.push(li / this.distance ** 2 * this.multiplier);
        console.log(d);
    }

    render(parent, ctx, dt) {
        for (const obj of this.objects) {
            obj.render(parent, ctx, dt);
        }

        ctx.lineWidth = 4;

        const hover = parent.input('hover');
        let tooltip = false;

        // skip the first, because of placeholder
        for (let i = 1; i < this.sections.length; ++i) {
            const pos = this.sections[i - 1];
            const intensity = this.intensities[i - 1];
            ctx.strokeStyle = '#ff0000';

            if (!tooltip && hover && Plane.VecDist(pos, hover) <= 2) {
                ctx.font = '1.25rem sans';
                ctx.fillText(`I: ${this.intensities[i - 1]}`, ...Plane.VecAddV(pos, [parent.psTods(0.05), parent.psTods(0.05)]));
                ctx.strokeStyle = '#00ff00';

                tooltip = true;
            }

            ctx.beginPath();
            ctx.moveTo(...pos);
            ctx.lineTo(...this.sections[i]);
            ctx.stroke();
        }
    }
}

export class TDLightBox extends TDBox {
    protected light: TDLight;

    constructor(pos, rot, size, strength = 10, speed = 1) {
        const width = 0.25 * size;
        const height = 0.5 * size;

        const vel = Plane.VecRotate(rot, [0, -1]);
        const offset = Plane.VecReMag(Plane.VecInv(vel), height / 2);

        super(Plane.VecAddV(pos, offset), width, height, rot);


        // create light
        this.light = new TDLight(pos, Plane.VecMulC(vel, speed), strength);
    }

    start(parent, ctx) {
        this.light.start(parent, ctx);
    }

    render(parent, ctx, dt) {
        const save = parent.save();
        this.light.render(parent, ctx, dt);
        parent.restore(save);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.beginPath();
        ctx.moveTo(...parent.pcTodc(this.points[3]));
        for (const point of this.points) {
            ctx.lineTo(...parent.pcTodc(point));
        }
        ctx.fill()
    }

    update(parent, ctx, dt) {
        this.light.update(parent, ctx, dt);
    }

    addGlass(glass) {
        this.light.addGlass(glass);
    }
}

export class TDGlass extends TDBox {
    index: number;

    constructor(n, ...args: ConstructorParameters<typeof TDBox>) {
        super(...args);
        this.index = n;
    }

    intersect(pos, newPos) {
        for (let i = 0; i < this.edges.length; ++i) {
            const [p1, p2] = this.edges[i];
            const point = Plane.Intersect(p1, p2, pos, newPos);
            if (point) {
                return [this.normals[i], point];
            }
        }
        return null;
    }

    render(parent, ctx, dt) {
        ctx.beginPath();
        ctx.moveTo(...parent.pcTodc(this.points[3]));
        for (const point of this.points) {
            ctx.lineTo(...parent.pcTodc(point));
        }
        ctx.stroke();
    }
}

function fresnel(ti, n1, n2) {
    const tr = Math.asin(n1 / n2 * Math.sin(ti));

    const ts = 1 - ((n1 * Math.cos(ti) - n2 * Math.cos(tr)) / (n1 * Math.cos(ti) + n2 * Math.cos(tr))) ** 2;
    const tp = 1 - ((n1 * Math.cos(tr) - n2 * Math.cos(ti)) / (n1 * Math.cos(tr) + n2 * Math.cos(ti))) ** 2;

    return 0.5 * (ts + tp);
}
