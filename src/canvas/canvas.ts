import {Plane, Vec2, Vec3, Volume} from "../computation/vector";
import {DiffEqSolvers, IDiffEqSolvers} from "../computation/diffeq";

// todo: make this all methods
interface ICanvas {
    element: HTMLCanvasElement;
    inputs: object;
    ctx: CanvasRenderingContext2D;
    options: ICanvasOptions;
}

export interface ICanvasOptions {
    rate: {
        update: number;
        speed: number;
    };
    size: {
        width: number;
        height: number;
    };
    region: {
        scale: number;
        top: number;
        right: number;
    }
    coord: boolean;
}

interface ICanvasInputs {
    hover?: [number, number];
}

export class TDCanvas implements ICanvas {
    static defaultOptions: ICanvasOptions = {
        rate: {
            update: 240,
            speed: 1
        },
        size: {
            width: 1000,
            height: 700,
        },
        region: {
            scale: 100,
            top: 0.5,
            right: 0.5
        },
        coord: false
    }

    public element: HTMLCanvasElement;
    public inputs: ICanvasInputs;
    public ctx: CanvasRenderingContext2D;
    public options: ICanvasOptions;
    public elements: IElement[][];  // layered elements

    protected time: number;
    protected dt: number;
    protected udt: number;
    totalTime: number;

    constructor(element, options: Partial<ICanvasOptions> = {}) {
        options = {...TDCanvas.defaultOptions, ...options};

        this.element = element;
        this.inputs = {};

        this.ctx = element.getContext('2d');
        this.options = options as ICanvasOptions;
        this.elements = [];

        this.time = 0;
        this.dt = 0;
        this.udt = 1 / this.options.rate.update;
        this.totalTime = 0;


        // resize canvas
        const {size, region} = this.options;

        element.width = size.width;
        element.height = size.height;

        // coords
        if (this.options.coord) {
            this.addCoord();
        }
    }

    protected addCoord() {
        const {size, region} = this.options;

        const xY = region.top * size.height;
        const xline = new TDRawLine([0, xY], [size.width, xY]);

        const yX = (1 - region.right) * size.width;
        const yline = new TDRawLine([yX, 0], [yX, size.height]);

        this.addElement(xline, 0);
        this.addElement(yline, 0);
    }

    start() {
        for (let i = 0; i < this.elements.length; ++i) {
            for (const element of this.elements[i]) {
                element.start(this, this.ctx);
            }
        }

        this.registerInputs();
    }

    addElement(element: IElement, layer = 0) {
        if (!this.elements[layer]) {
            this.elements[layer] = [];
        }

        this.elements[layer].push(element);
    }

    clearElements() {
        this.elements = [];

        if (this.options.coord) {
            this.addCoord();
        }
    }

    save() {
        return {
            fill: this.ctx.fillStyle,
            stroke: this.ctx.strokeStyle,
            font: this.ctx.font,
            width: this.ctx.lineWidth,
        }
    }

    restore(save) {
        this.ctx.fillStyle = save.fill;
        this.ctx.strokeStyle = save.stroke;
        this.ctx.font = save.font;
        this.ctx.lineWidth = save.width;
    }

    render(newTime, reset = false) {
        if (reset) {
            this.time = newTime;
        }
        // calculate dt
        const dt = (newTime - this.time) / 1000;
        this.time = newTime;
        this.totalTime += dt;

        this.dt += dt;
        while (this.dt > (this.udt / this.options.rate.speed)) {
            this.update(this.udt);
            this.dt -= this.udt / this.options.rate.speed;
        }

        // clear canvas
        this.ctx.clearRect(0, 0, this.options.size.width, this.options.size.height);

        // call renders
        for (let i = 0; i < this.elements.length; ++i) {
            for (const element of this.elements[i]) {
                const save = this.save();
                element.render(this, this.ctx, dt);
                this.restore(save);
            }
        }

    }

    update(dt) {
        // call updates
        for (let i = 0; i < this.elements.length; ++i) {
            for (const element of this.elements[i]) {
                element.update(this, this.ctx, dt);
            }
        }
    }

    pcTodc(pc) {
        const {size, region} = this.options;
        const [x, y] = pc;

        // get x
        const rightPX = (1 - region.right) * size.width;
        const dx = rightPX + x * region.scale;

        // get y
        const upPX = region.top * size.height;
        const dy = upPX - y * region.scale;

        return [dx, dy];
    }

    psTods(ps) {
        return ps * this.options.region.scale;
    }

    dcTopc(dc) {
        const {size, region} = this.options;
        const [x, y] = dc;

        // get x
        const leftPX = (1 - region.right) * size.width;
        const dx = (x - leftPX) / region.scale;

        const upPX = region.top * size.height;
        const dy = (y - upPX) / region.scale;

        return [dx, dy];
    }

    registerInputs() {
        this.inputs.hover = null;
        this.element.addEventListener('mousemove', event => {
            const {clientX, clientY} = event;
            const {left, top} = this.element.getBoundingClientRect();
            this.inputs.hover = [clientX - left, clientY - top];
        })

        this.element.addEventListener('mouseleave', event => {
            this.inputs.hover = null;
        })
    }

    input(type: 'hover', options): any {
        switch (type) {
            case 'hover': {
                return this.inputs.hover;
            }
        }
    }
}


interface IElement {
    render(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number): void;

    update(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number): void;

    start(parent: TDCanvas, ctx: CanvasRenderingContext2D): void;
}

export class TDElement implements IElement {
    render(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
    }

    update(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
    }

    start(parent: TDCanvas, ctx: CanvasRenderingContext2D) {
    }
}

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


class TDRawLine extends TDElement {
    protected from: Vec2;
    protected to: Vec2;
    width: number;
    color: string;

    constructor(from: Vec2, to: Vec2, width = 2, color = '#000000') {
        super();

        this.from = from;
        this.to = to;
        this.width = width;
        this.color = color;
    }

    render(parent, ctx, dt) {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width;
        ctx.beginPath();
        ctx.moveTo(...this.from);
        ctx.lineTo(...this.to);
        ctx.stroke();
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
