import {Plane, Scalar, Vec2} from "../computation/vector.js";
import {mergeDeep} from "../lib/merge.js";
import {TDRawLine, TDText} from "./drawers/basics.js";
import {TDFPSClock} from "./drawers/basics.js";
import {GetObservable, Observable, Subscriber, TDObservable} from "./observable.js";
import {Cursor, CursorStyler} from "./input.js";


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
    attachments: {
        axis: boolean;
        labels: boolean;
        counter: boolean;
    }
    coord: boolean;  // deprecated
    battery: {
        hibernation: boolean;
        newTicks: number;
    }
}

export interface CanvasInputs {
    // null if not on canvas, [x, y] if on canvas
    cursor: Observable<null | [number, number]>;

    // null if not dragging, [x, y] during dragging
    drag: Observable<null | [number, number]>;

    // position of the last click (ie mousedown), null if no clicks
    click: Observable<null | [number, number]>;
}

export interface ICanvas {
    readonly element: HTMLCanvasElement;
    readonly inputs: CanvasInputs;
    readonly ctx: CanvasRenderingContext2D;
    readonly options: CanvasOptions;
    readonly cursor: CursorStyler;

    readonly totalTime: number;

    // backwards compat, deprecated
    pcTodc(pc: Vec2): Vec2;

    psTods(ps: number): number;

    start(): void;

    stop(): void;

    render(newTime: number, reset?: boolean): void;

    localToWorld(local: Vec2): Vec2;

    localToWorldScalar(local: number): number;

    worldToLocal(world: Vec2): Vec2;

    worldToLocalScalar(world: number): number;

    addElement(element: IElement, name?: string, layer?: number);

    drawableArea(): Vec2;

    anchor(): Vec2;

    borders(): { up: Vec2, down: Vec2, left: Vec2, right: Vec2 };

    wakeUp(duration: number);

    input(type: keyof CanvasInputs): GetObservable<CanvasInputs[keyof CanvasInputs]>;
}


/**
 * The main JS canvas rendering class
 *
 * @example
 * const canvas = new TDCanvas(button, {});
 * canvas.addElement(..., "firstElement");
 */
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
        attachments: {
            axis: false,
            labels: false,
            counter: false
        },
        coord: false,  // deprecated
        battery: {
            hibernation: false,
            newTicks: 2
        }
    }

    public readonly element: HTMLCanvasElement;
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

    /// input system ///
    public readonly inputs: CanvasInputs = {
        cursor: new TDObservable(null),
        drag: new TDObservable(null),
        click: new TDObservable(null),
    }
    private inputStartDrag: Vec2 | null = null;
    private inputsHandler: Record<string, any>;

    public readonly cursor: CursorStyler;

    constructor(element, options: Partial<CanvasOptions> = {}) {
        this.element = element;

        this.ctx = element.getContext('2d');
        this.options = mergeDeep(TDCanvas.defaultOptions, options) as CanvasOptions;
        this.elements = [];

        this.inputsHandler = {};

        this.time = 0;
        this.dt = 0;
        this.udt = 1 / this.options.rate.update;
        this.totalTime = 0;


        // resize canvas
        const {size, region} = this.options;

        element.width = size.width;
        element.height = size.height;

        // coords
        if (this.options.attachments.axis || this.options.coord) {
            this.addAxis();
        }

        if (this.options.attachments.counter) {
            this.addCounter();
        }

        // battery saving
        this.hibernation = this.options.battery.hibernation;
        this.ticks = 0;
        if (this.hibernation) {
            // add 10 ticks for initial rendering
            this.ticks = this.options.battery.newTicks;
        }

        // cursor styles
        this.cursor = new Cursor(this.element);
    }

    /**
     * Adds lines that highlights the x and y axis
     * @protected
     */
    private addAxis() {
        const {size, region} = this.options;

        const xY = region.top * size.height;
        const yX = (1 - region.right) * size.width;

        const [up, down, left, right] = [
            [yX, 0],
            [yX, size.height],
            [0, xY],
            [size.width, xY],
        ] as Vec2[];

        const xline = new TDRawLine(left, right);
        const yline = new TDRawLine(up, down);

        this.addElement(xline, '@xline', 0);
        this.addElement(yline, '@yline', 0);

        // add labels, the displacement for each label uses some magic numbers
        if (this.options.attachments.labels) {
            const scale = region.scale;
            const borders = this.borders();

            const upText = new TDText(
                `${Scalar.round(borders.up[1], 1)}`,
                Plane.VecAddV(borders.up, [5 / scale, -25 / scale])
            );
            const downText = new TDText(
                `${Scalar.round(borders.down[1], 1)}`,
                Plane.VecAddV(borders.down, [5 / scale, 10 / scale])
            );

            const leftText = new TDText(
                `${Scalar.round(borders.left[0], 1)}`,
                Plane.VecAddV(borders.left, [5 / scale, -25 / scale])
            );
            const rightText = new TDText(
                `${Scalar.round(borders.right[0], 1)}`,
                Plane.VecAddV(borders.right, [-40 / scale, -25 / scale])
            );

            this.addElement(upText, '@upText', 0);
            this.addElement(downText, '@downText', 0);
            this.addElement(leftText, '@leftText', 0);
            this.addElement(rightText, '@rightText', 0);
        }
    }

    /**
     * Adds a fps counter on the bottom left of the canvas
     * @private
     */
    private addCounter() {
        // uses a magic number 10 as the padding of the fps counter
        const scale = this.options.region.scale;
        const counter = new TDFPSClock(
            Plane.VecAddV(this.anchor(), [10 / scale, 10 / scale])
        );
        this.addElement(counter, '@counter', 0);
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
        if (this.elements.length <= layer) {
            // create layers til the new layer
            for (let l = this.elements.length; l <= layer; ++l) {
                this.elements.push({});
            }
        }

        if (name == null || name.length === 0) {
            name = 'untitled';
        }

        // if the name already exists
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
            this.addAxis();
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
    private update(dt) {
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

        return [dx, -dy];
    }

    public worldToLocal(world: Vec2): Vec2 {
        return this.dcTopc(world) as Vec2;
    }

    public worldToLocalScalar(world: number): number {
        return world / this.options.region.scale;
    }

    /**
     * Registers all the mouse inputs
     */
    private registerInputs() {
        // this could be moved into the constructor, thoughts?
        const computePosition = (event) => {
            const {clientX, clientY} = event;
            const {left, top} = this.element.getBoundingClientRect();
            return [clientX - left, clientY - top] as Vec2;
        };

        this.inputsHandler = {
            mousemove: event => {
                const position = this.worldToLocal(computePosition(event));
                this.inputs.cursor.update(position);

                // update drag only when it is pressed
                if (this.inputs.drag.value() !== null) {
                    this.inputs.drag.update(position);
                }
            },
            mouseleave: event => {
                this.inputs.cursor.update(null);

                // force mouseup when mouse exits the canvas
                if (this.inputs.drag !== null) {
                    this.inputsHandler.mouseup(event);
                }
            },
            mousedown: event => {
                const position = this.worldToLocal(computePosition(event));
                this.inputs.drag.update(position);
                this.inputStartDrag = position;
            },
            mouseup: event => {
                const position = this.worldToLocal(computePosition(event));

                this.inputs.drag.update(null);

                if (this.inputStartDrag === null) {
                    return;
                }

                // https://stackoverflow.com/a/59741870/9341734
                const delta = 0.01;  // sensitivity
                const diff = Plane.VecDist(position, this.inputStartDrag);

                // a click if the mouse has not moved
                if (diff < delta) {
                    this.inputs.click.update(position);
                }

                this.inputStartDrag = null;
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
    }

    /**
     * @deprecated, please use the (canvas.input) property directly
     *
     * Returns the input status of a given type. This function is maintained for backwards compatibility only
     * @param type
     */
    public input(type: keyof CanvasInputs): GetObservable<CanvasInputs[keyof CanvasInputs]> {
        switch (type) {
            case 'cursor': {
                return this.inputs.cursor.value();
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
            -size.width / region.scale * (1 - region.right),
            -size.height / region.scale * (1 - region.top),
        ]
    }

    /**
     * Returns an object containing the local coordinates of the up, down, left, and right borders.
     */
    public borders(): {
        up: Vec2;
        down: Vec2;
        left: Vec2;
        right: Vec2;
    } {
        const anchor = this.anchor();
        const size = this.drawableArea();
        return {
            up: [0, anchor[1] + size[1]],
            down: [0, anchor[1]],
            left: [anchor[0], 0],
            right: [anchor[0] + size[0], 0],
        };
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


