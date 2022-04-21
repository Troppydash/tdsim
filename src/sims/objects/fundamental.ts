import {Vec2, Vec3, Volume} from "../../computation/vector";
import {DiffEqSolvers, IDiffEqSolvers} from "../../computation/diffeq";
import {IElement, TDCanvas, TDElement, TDRawLine} from "../../canvas/canvas";

export class TDListElements extends TDElement {
    constructor(protected elements: IElement[]) {
        super();
    }

    addElement(element: IElement) {
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

export class TDFPSClock extends TDElement {
    protected at: Vec2;
    font: string;
    timing: number;
    color: string;

    private time: number;
    private uc: number;
    private rc: number;

    fps: number;
    ups: number;

    constructor(at: Vec2, timing = 1, font = '1.5rem sans', color = '#00ff00') {
        super();
        this.at = at;
        this.font = font;
        this.timing = timing;
        this.color = color;

        this.time = 0;
        this.uc = 0;
        this.rc = 0;

        this.fps = 0;
        this.ups = 0;
    }


    render(parent, ctx, dt) {
        this.rc += 1;

        ctx.fillStyle = this.color;
        ctx.font = this.font;
        ctx.fillText('', ...parent.pcTodc(this.at));
        ctx.fillText(`fps: ${this.fps}, ups: ${this.ups}`, ...parent.pcTodc(this.at));

        this.time += dt;
        if (this.time > this.timing) {
            this.time -= this.timing;
            this.fps = this.rc / this.timing;
            this.ups = this.uc / this.timing;

            this.rc = 0;
            this.uc = 0;
        }
    }

    update(parent, ctx, dt) {
        this.uc += 1;
    }
}

export type MotionEq<T> = (
    t: number,
    a: T,
    v: T,
    p: T,
) => T;

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
