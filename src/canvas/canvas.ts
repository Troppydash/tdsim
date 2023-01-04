import {Vec2} from "../computation/vector";
import {mergeDeep} from "../lib/merge";


export interface ICanvas {
    element: HTMLCanvasElement;
    inputs: object;
    ctx: CanvasRenderingContext2D;
    options: CanvasOptions;

    totalTime: number;

    // backwards compat
    pcTodc(pc: Vec2): Vec2;
    psTods(ps: number): number;

    localToWorld(local: Vec2): Vec2;
    localToWorldScalar(local: number): number;

    addElement(element: IElement, name?: string, layer?: number);
    drawableArea(): Vec2;
    anchor(): Vec2;

    wakeUp(duration: number);
}

export interface CanvasOptions {
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

interface CanvasInputs {
    hover?: [number, number];
}

export class TDCanvas implements ICanvas {
    static defaultOptions: CanvasOptions = {
        rate: {
            update: 120,
            speed: 1
        },
        size: {
            width: 1000,
            height: 700,
        },
        region: {
            scale: 50,
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
    public inputs: CanvasInputs;
    public inputsHandler: { [key: string]: (event: any) => void };
    public ctx: CanvasRenderingContext2D;
    public options: CanvasOptions;
    public elements: { [key: string]: IElement }[];  // layered elements

    protected time: number;
    protected dt: number;
    protected udt: number;
    totalTime: number;

    // ticks = 0 means no rendering
    protected hibernation: boolean;
    protected ticks: number;


    constructor(element, options: Partial<CanvasOptions> = {}) {
        this.element = element;
        this.inputs = {};
        this.inputsHandler = {};

        this.ctx = element.getContext('2d');
        this.options = mergeDeep(TDCanvas.defaultOptions, options) as CanvasOptions;
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

    /**
     * Adds lines that highlights the x and y axis
     * @protected
     */
    protected addCoord() {
        const {size, region} = this.options;

        const xY = region.top * size.height;
        const xline = new TDRawLine([0, xY], [size.width, xY]);

        const yX = (1 - region.right) * size.width;
        const yline = new TDRawLine([yX, 0], [yX, size.height]);

        this.addElement(xline, 'xline', 0);
        this.addElement(yline, 'yline', 0);
    }


    /**
     * Starts the canvas by calling start on its elements and registers all inputs
     */
    public start() {
        for (let i = 0; i < this.elements.length; ++i) {
            for (const element of Object.values(this.elements[i])) {
                element.start(this, this.ctx);
            }
        }

        this.registerInputs();
    }

    /**
     * Ends the canvas by calling stop on its elements and unregisters all inputs
     */
    public stop() {
        for (const layer of this.elements) {
            for (const element of Object.values(layer)) {
                element.stop(this, this.ctx);
            }
        }

        this.unregisterInputs();
    }

    /**
     * Appends an element to the render list
     * @param element The element object
     * @param name The alias of the element, automatically generated otherwise
     * @param layer The layer to add the element
     */
    public addElement(element: IElement, name: string = null, layer = 0) {
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

    /**
     * Removes all elements from the render list
     */
    public clearElements() {
        this.elements = [];

        if (this.options.coord) {
            this.addCoord();
        }

        this.wakeUp();
    }

    /**
     * Removes a specific element from the render list
     * @param name The name for the element
     * @param layer The layer of the element
     */
    public removeElement(name: string, layer = 0) {
        if (this.elements[layer][name]) {
            this.elements[layer][name].stop(this, this.ctx);
            delete this.elements[layer][name];
            this.elements[layer][name] = null;
        }

        this.wakeUp();
    }

    /**
     * Saves the opengl state of the canvas
     */
    public save() {
        return {
            fill: this.ctx.fillStyle,
            stroke: this.ctx.strokeStyle,
            font: this.ctx.font,
            width: this.ctx.lineWidth,
        }
    }

    /**
     * Restores the opengl state of the canvas
     * @param save
     */
    public restore(save) {
        this.ctx.fillStyle = save.fill;
        this.ctx.strokeStyle = save.stroke;
        this.ctx.font = save.font;
        this.ctx.lineWidth = save.width;
    }

    /**
     * Renders a frame of the canvas
     * @param newTime The new unix timestamp
     * @param reset Whether to reset the current timestamp, as in unpausing
     */
    public render(newTime, reset = false) {
        // if we are hibernating
        if (this.hibernation && this.ticks <= 0) {
            return;
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

    /**
     * Physics update
     * @param dt The change in time
     */
    public update(dt) {
        if (this.hibernation) {
            if (this.ticks > 0) {
                this.ticks -= 1;
            } else {
                return;
            }
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
    public pcTodc(pc: Vec2): Vec2 {
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

    public localToWorld(local: Vec2): Vec2 {
        return this.pcTodc(local);
    }

    /**
     * Returns the screen scalar of a world scalar
     * @param ps The world scalar
     * @returns {number} The screen scalar
     */
    public psTods(ps) {
        return ps * this.options.region.scale;
    }

    public localToWorldScalar(local: number): number {
        return this.psTods(local);
    }

    /**
     * Returns the world coordinates of a given screen coordinate
     * @param dc The screen coordinate
     * @returns {number[]} The world coordinates
     */
    public dcTopc(dc) {
        const {size, region} = this.options;
        const [x, y] = dc;

        // get x
        const leftPX = (1 - region.right) * size.width;
        const dx = (x - leftPX) / region.scale;

        const upPX = region.top * size.height;
        const dy = (y - upPX) / region.scale;

        return [dx, dy];
    }

    /**
     * Registers all the mouse inputs
     */
    private registerInputs() {
        this.inputs.hover = null;
        this.inputsHandler = {
            mousemove(event) {
                const {clientX, clientY} = event;
                const {left, top} = this.element.getBoundingClientRect();
                this.inputs.hover = [clientX - left, clientY - top];
            },
            mouseleave(event) {
                this.inputs.hover = null;
            }
        }

        // binds all input handlers
        for (const name of Object.keys(this.inputsHandler)) {
            this.inputsHandler[name] = this.inputsHandler[name].bind(this);
        }

        // add listeners
        for (const [key, value] of Object.entries(this.inputsHandler)) {
            this.element.addEventListener(key, value);
        }
    }

    /**
     * Unregisters all inputs
     */
    private unregisterInputs() {
        for (const [key, value] of Object.entries(this.inputsHandler)) {
            this.element.removeEventListener(key, value);
        }
        this.inputsHandler = {};
        this.inputs.hover = null;
    }

    /**
     * Returns the input status of a given type
     * @param type
     * @param options
     */
    public input(type: 'hover', options): any {
        switch (type) {
            case 'hover': {
                return this.inputs.hover;
            }
        }
    }


    /**
     * Returns the size of the local drawable area
     */
    public drawableArea(): Vec2 {
        const {size, region} = this.options;
        return [
            size.width / region.scale,
            size.height / region.scale
        ];
    }

    /**
     * Retrieves the coordinate of the bottom left
     */
    public anchor(): Vec2 {
        const {size, region} = this.options;

        return [
            -size.width / region.scale * (1-region.right),
            -size.height / region.scale * (1-region.top),
        ]
    }

    /**
     * Wakeup to render for the next *duration* amount
     * @param duration
     */
    public wakeUp(duration: number = this.options.battery.newTicks) {
        if (this.hibernation) {
            this.ticks += duration;
        }
    }
}


export interface IElement {
    render(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number): void;

    update(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number): void;

    start(parent: ICanvas, ctx: CanvasRenderingContext2D): void;

    stop(parent: ICanvas, ctx: CanvasRenderingContext2D): void;
}

export class TDElement implements IElement {
    render(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
    }

    update(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
    }

    start(parent: ICanvas, ctx: CanvasRenderingContext2D) {
    }

    stop(parent: ICanvas, ctx: CanvasRenderingContext2D) {
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
