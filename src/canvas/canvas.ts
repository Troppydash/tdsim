import {Plane, Vec2, Vec3, Volume} from "../computation/vector";
import {DiffEqSolvers, IDiffEqSolvers} from "../computation/diffeq";

// todo: make this all methods
export interface ICanvas {
    element: HTMLCanvasElement;
    inputs: object;
    ctx: CanvasRenderingContext2D;
    options: ICanvasOptions;

    pcTodc(pc: Vec2): Vec2;
    addElement(element: IElement, name?: string, layer?: number);
    drawableArea(): Vec2;
    anchor(): Vec2;

    wakeUp(duration: number);
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
    battery: {
        hibernation: boolean;
        newTicks: number;
    }
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
        coord: false,
        battery: {
            hibernation: false,
            newTicks: 2
        }
    }

    public element: HTMLCanvasElement;
    public inputs: ICanvasInputs;
    public ctx: CanvasRenderingContext2D;
    public options: ICanvasOptions;
    public elements: { [key: string]: IElement }[];  // layered elements

    protected time: number;
    protected dt: number;
    protected udt: number;
    totalTime: number;

    // ticks = 0 means no rendering
    protected hibernation: boolean;
    protected ticks: number;

    // CONSTANTS


    constructor(element, options: Partial<ICanvasOptions> = {}) {
        // TODO: deep merge
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

        // battery saving
        this.hibernation = this.options.battery.hibernation;
        this.ticks = 0;
        if (this.hibernation) {
            // add 10 ticks for initial rendering
            this.ticks = this.options.battery.newTicks;
        }
    }

    protected addCoord() {
        const {size, region} = this.options;

        const xY = region.top * size.height;
        const xline = new TDRawLine([0, xY], [size.width, xY]);

        const yX = (1 - region.right) * size.width;
        const yline = new TDRawLine([yX, 0], [yX, size.height]);

        this.addElement(xline, 'xline', 0);
        this.addElement(yline, 'yline', 0);
    }

    start() {
        for (let i = 0; i < this.elements.length; ++i) {
            for (const element of Object.values(this.elements[i])) {
                element.start(this, this.ctx);
            }
        }

        this.registerInputs();
    }

    addElement(element: IElement, name: string = null, layer = 0) {
        if (!this.elements[layer]) {
            this.elements[layer] = {};
        }

        if (name === null || name.length === 0) {
            name = 'untitled';
        }

        if (this.elements[layer][name]) {
            // generate a unique name
            let newName = name;
            let i = 0;
            while (this.elements[layer][newName]) {
                newName += `(${i})`;
                i += 1;
            }

            name = newName;
        }

        this.elements[layer][name] = element;
        this.wakeUp();
    }

    clearElements() {
        this.elements = [];

        if (this.options.coord) {
            this.addCoord();
        }

        this.wakeUp();
    }

    removeElement(name: string, layer = 0) {
        if (this.elements[layer][name]) {
            this.elements[layer][name].stop(this, this.ctx);
            delete this.elements[layer][name];
            this.elements[layer][name] = null;
        }

        this.wakeUp();
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
        // if we are hibernating
        if (this.hibernation) {
            // console.log("ticks=",this.ticks);
            if (this.ticks > 0) {
                this.ticks -= 1;
            } else {
                return;
            }
        }


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
            for (const element of Object.values(this.elements[i])) {
                const save = this.save();
                element.render(this, this.ctx, dt);
                this.restore(save);
            }
        }

    }

    update(dt) {
        if (this.hibernation && this.ticks <= 0) {
            return;
        }

        // call updates
        for (let i = 0; i < this.elements.length; ++i) {
            for (const element of Object.values(this.elements[i])) {
                element.update(this, this.ctx, dt);
            }
        }
    }

    /**
     * Returns the screen coordinates of a given world coordinate
     * @param pc The world coordinate
     * @returns {number[]} The screen coordinates
     */
    pcTodc(pc: Vec2): Vec2 {
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

    /**
     * Returns the screen scalar of a world scalar
     * @param ps The world scalar
     * @returns {number} The screen scalar
     */
    psTods(ps) {
        return ps * this.options.region.scale;
    }

    /**
     * Returns the world coordinates of a given screen coordinate
     * @param dc The screen coordinate
     * @returns {number[]} The world coordinates
     */
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

    drawableArea(): Vec2 {
        const {size, region} = this.options;
        return [
            size.width / region.scale,
            size.height / region.scale
        ];
    }

    /**
     * Retrieves the coordinate of the bottom left
     */
    anchor(): Vec2 {
        const {size, region} = this.options;

        return [
            size.width / region.scale * (1-region.right),
            size.height / region.scale * (1-region.top),
        ]
    }

    wakeUp(duration: number = this.options.battery.newTicks) {
        if (this.hibernation) {
            this.ticks += duration;
        }
    }
}


export interface IElement {
    render(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number): void;

    update(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number): void;

    start(parent: TDCanvas, ctx: CanvasRenderingContext2D): void;

    stop(parent: TDCanvas, ctx: CanvasRenderingContext2D): void;
}

export class TDElement implements IElement {
    render(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
    }

    update(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
    }

    start(parent: TDCanvas, ctx: CanvasRenderingContext2D) {
    }

    stop(parent: TDCanvas, ctx: CanvasRenderingContext2D) {
    }
}

export class TDRawLine extends TDElement {
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
