import {Vec2, Vec3, VecN, Volume} from "../../computation/vector.js";
import {DiffEqSolvers, PhysicsSolvers, IDiffEqSolvers} from "../../computation/diffeq.js";
import {ICanvas, IElement, TDCanvas} from "../../canvas/canvas.js";
import {Bindable, Binding} from "../../canvas/binding.js";
import {TDElement, TDRawLine, TDText} from "../../canvas/drawers/basics.js";

// backwards compatibility
export {TDFPSClock} from "../../canvas/drawers/basics.js";


/**
 * Represents an abstract group of elements
 *
 * @example
 * export class Planets extends BaseListElements {
 *     constructor(planets: Planets) {
 *         super(planets);
 *     }
 * }
 */
export class BaseListElements<Element extends IElement = IElement> extends TDElement {
    constructor(protected elements: Element[]) {
        super();
    }

    addElement(element: Element) {
        this.elements.push(element);
    }

    render(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
        for (const element of this.elements) {
            // save
            const save = parent.save();
            element.render(parent, ctx, dt);
            // restore
            parent.restore(save);
        }
    }

    update(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
        for (const element of this.elements) {
            element.update(parent, ctx, dt);
        }
    }

    start(parent: TDCanvas, ctx: CanvasRenderingContext2D) {
        for (const element of this.elements) {
            element.start(parent, ctx);
        }
    }
}

/**
 * Represent a line
 *
 * @example
 * const line = new TDLine([0, 0], [1, 1], 1, '#ff0000');
 */
export class TDLine extends TDRawLine {
    render(parent, ctx, dt) {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width;
        ctx.beginPath();
        ctx.moveTo(...parent.pcTodc(this.from));
        ctx.lineTo(...parent.pcTodc(this.to));
        ctx.stroke();
    }
}

export class TDVector extends TDLine {
    constructor(to, ...args) {
        super([0, 0], to, ...args);
    }
}

export class TDTimer extends TDElement {
    protected at: Vec2;
    font: string;
    color: string;

    constructor(at: Vec2, font = '1.5rem sans', color = '#00ff00') {
        super();

        this.at = at;
        this.font = font;
        this.color = color;
    }

    render(parent, ctx, dt: number) {
        const time = parent.totalTime;
        // format time into 00:00
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        const millisecond = Math.floor((time % 1) * 10);
        const timeStr = `Time: ${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}:${millisecond}`;

        ctx.font = this.font;
        ctx.fillStyle = this.color;

        ctx.fillText(timeStr, ...parent.pcTodc(this.at));
    }
}

export class TDReactiveText extends TDText {
    constructor(
        private closure: (canvas: ICanvas, setText: (string) => void) => void,
        location: Vec2,
        color: string = '#000000',
        font: string = '1.5rem sans',
    ) {
        super('', location, color, font);
    }

    setText(newText: string): void {
        this.text = newText;
    }

    update(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
        this.closure(parent, this.setText.bind(this));
    }
}


// Deprecated
export type MotionEq<T> = (
    t: number,
    a: T,
    v: T,
    p: T,
) => T;

// Deprecated
export class TDObject<T = {}> extends TDElement {
    DefaultAttr: T;
    protected attr: T;

    protected pos: Vec2;
    protected vel: Vec2;
    protected acc: Vec2;
    protected accf: MotionEq<Vec2>;

    protected solver: IDiffEqSolvers;

    constructor(pos: Vec2 = [0, 0],
                accf: MotionEq<Vec2> = (t, a, v, p) => [0, 0],
                acc0: Vec2 = [0, 0],
                vel: Vec2 = [0, 0],
                solver: IDiffEqSolvers = DiffEqSolvers.RK4,
                attr: Partial<T> = {}) {
        super();

        this.setAttr(attr);

        this.solver = solver;
        this.pos = pos;
        this.vel = vel;
        this.acc = accf(0, acc0, vel, pos);
        this.accf = accf;

    }

    setAttr(attr: Partial<T>) {
        this.attr = {...this.DefaultAttr, ...attr};
    }

    update(parent, ctx, dt) {
        const time = parent.totalTime;

        // TODO: improve this using a better integration method
        // this.acc = this.accf(time, this.acc, this.vel, this.pos);
        // const newPos = Plane.VecAddV(this.pos, Plane.VecMulC(this.vel, dt));
        // const newVel = Plane.VecAddV(this.vel, Plane.VecMulC(this.acc, dt));
        //
        // this.pos = newPos;
        // this.vel = newVel;

        const [newPos, newVel] = this.solver(this.accf.bind(this), this.pos, this.vel, time, dt);
        this.pos = newPos;
        this.vel = newVel;
    }
}

// Deprecated
export class TDObject3D extends TDElement {
    protected pos: Vec3;
    protected vel: Vec3;
    protected acc: Vec3;
    protected accf: MotionEq<Vec3>;
    protected time: number;

    constructor(pos: Vec3 = [0, 0, 0],
                accf: MotionEq<Vec3> = (t, a, v, p) => [0, 0, 0],
                acc0: Vec3 = [0, 0, 0],
                vel: Vec3 = [0, 0, 0]) {
        super();

        this.pos = pos;
        this.vel = vel;
        this.acc = acc0;
        this.accf = accf;

        this.time = 0;
    }

    update(parent, ctx, dt) {
        this.time += dt;

        const newPos = Volume.VecAddV(this.pos, Volume.VecMulC(this.vel, dt));
        this.acc = this.accf(this.time, this.acc, this.vel, this.pos);
        const newVel = Volume.VecAddV(this.vel, Volume.VecMulC(this.acc, dt));

        this.pos = newPos;
        this.vel = newVel;
    }
}


// Binding stuff
export interface BindableBindings {
    [name: string]: Bindable | any;
}

export abstract class BindableBase extends TDElement {
    protected bindings: BindableBindings;

    protected DEFAULT_BINDINGS: BindableBindings | null = null;

    protected constructor({bindings}: { bindings: BindableBindings }) {
        super();

        this.bindings = bindings;
    }

    start(parent: ICanvas, ctx: CanvasRenderingContext2D) {
        if (Object.entries(this.DEFAULT_BINDINGS).length > 0) {
            // merge
            const obj = {};
            for (const [key, value] of Object.entries({...this.DEFAULT_BINDINGS, ...this.bindings})) {
                if (!(value instanceof Binding)) {
                    obj[key] = Binding.constant(value);
                } else {
                    obj[key] = value;
                }
            }
            this.bindings = {...obj};
        }
    }


    get parameters(): any {
        let out = {};
        for (const [key, bindings] of Object.entries(this.bindings)) {
            out[key] = bindings.value;
        }
        return out;
    }

    setConstant(key: string, value: any) {
        this.bindings[key] = Binding.constant(value);
    }

    stop(parent: TDCanvas, ctx: CanvasRenderingContext2D) {
        for (const bindable of Object.values(this.bindings)) {
            bindable.stop();
        }
    }
}

export interface IBaseObject extends IElement {
    differential: PhysicsSolvers.DiffEq;
    pos: VecN;
    vel: VecN;
}

export interface TDBaseObjectConstructor {
    pos?: VecN;
    vel?: VecN;
    bindings?: BindableBindings;
    solver?: PhysicsSolvers.Solvers;
}

/**
 * The base physics object responsible for physical simulation of n-dimensions
 */
export class TDBaseObject extends BindableBase implements IBaseObject {
    public pos: VecN;
    public vel: VecN;

    protected solver: PhysicsSolvers.Solvers = PhysicsSolvers.Verlet;

    constructor(
        {
            pos = [],
            vel = [],
            bindings = {},
            solver = null
        }: TDBaseObjectConstructor
    ) {
        super({bindings});

        this.pos = pos;
        this.vel = vel;

        if (solver != null) {
            this.solver = solver;
        }
    }

    update(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
        const time = parent.totalTime;

        const self = this;
        const [newPos, newVel] = this.solver(this.differential.bind(self), this.pos, this.vel, time, dt);
        this.pos = newPos;
        this.vel = newVel;

    }

    get dimensions() {
        return Math.max(this.pos.length, this.vel.length);
    }


    /**
     * The acceleration function at time *t*
     * @param t The current time
     * @param p The current position vector
     * @param v The current velocity vector
     */
    differential(t: number, p: VecN, v: VecN): VecN {
        throw new Error("no differential equation provided, please override the 'differential()' method");
    }
}


export interface Traceable {
    location(): Vec2;
}

/**
 * Represents the trace of a physical object
 */
export class TDBaseObjectTrail extends TDElement {
    protected step: number;
    protected limit: number;
    protected trails: Vec2[];
    protected color: string;
    protected system: Traceable;

    constructor(
        {
            step = 10,
            limit = 100,
            color = '#000',
            system
        }: {
            step: number,
            limit: number,
            system: Traceable,
            color: string
        }
    ) {
        super();

        this.step = step;
        this.limit = limit;
        this.system = system;
        this.color = color;

        this.trails = [];
    }

    update(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
        const pos = this.system.location();

        // update
        const screenCoord = parent.pcTodc(pos);
        this.trails.push([screenCoord[0], screenCoord[1]]);

        if (this.trails.length > this.limit) {
            this.trails.shift();
        }
    }

    render(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
        const trails = this.trails;

        // draw trails
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < trails.length - this.step; i += this.step) {
            ctx.strokeStyle = this.color + Math.max(Math.floor((i / trails.length) * 255), 20).toString(16);
            ctx.moveTo(...trails[i]);
            ctx.lineTo(...trails[i + this.step]);
        }

        for (let i = trails.length - this.step; i < trails.length - 1; ++i) {
            ctx.strokeStyle = this.color + Math.max(Math.floor((i / trails.length) * 255), 20).toString(16);
            ctx.moveTo(...trails[i]);
            ctx.lineTo(...trails[i + 1]);
        }

        ctx.stroke();

    }
}

