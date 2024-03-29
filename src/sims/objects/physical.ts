import {DynamicGraphs} from "../algos/graphing.js";
import {BaseListElements, IBaseObject, TDBaseObject, Traceable} from "./fundamental.js";
import {Binding} from "../../canvas/binding.js";
import {Area, Direction, Plane, Range, Vec, Vec2, Vec3, VecN, Volume, VSpace} from "../../computation/vector.js";
import {ICanvas, TDCanvas} from "../../canvas/canvas.js";
import {Batched, Primitives} from "../../canvas/drawers/mechanics.js";
import {ContourMethods} from "../algos/contour.js";
import {PhysicsSolvers} from "../../computation/diffeq.js";
import {TDElement} from "../../canvas/drawers/basics.js";
import {BindHandlers, ClickHandler, CursorStyle, DragHandler} from "../../canvas/input.js";
import {ImageDrawer} from "../../canvas/drawers/wrapper.js";

const G = 5e-3;
const Mass = 1e4;

export namespace Fields {
    import Method = ContourMethods.Method;

    export interface HasPotential extends IBaseObject {
        potential(pos: Vec2): number;
    }

    export class PotentialGroup extends TDElement {
        protected potentials: number[];
        protected objects: HasPotential[];
        protected method: Method<any> = ContourMethods.ContourMarchingSquare;
        protected polling: number = -1;

        protected area: Area = {
            xRange: [0, 10],
            xStep: 0.1,
            yRange: [0, 7],
            yStep: 0.1
        }

        private frameCount: number;
        private contourData: any[];

        constructor(
            potentials: number[],
            initialObjects?: HasPotential[],
            area?: Partial<Area>,
            polling?: number,
            method?: Method<any>
        ) {
            super();

            this.potentials = potentials;

            this.objects = [];
            if (initialObjects) {
                this.objects = [...this.objects, ...initialObjects];
            }

            if (method) {
                this.method = method;
            }

            if (area) {
                this.area = {...this.area, ...area};
            }

            if (polling) {
                this.polling = polling;
            }
            this.frameCount = 0;


            this.contourData = [];

            this.potential = this.potential.bind(this);
        }

        render(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#00f';
            for (const data of this.contourData) {
                this.method.drawer(data, ctx, parent);
            }
        }

        update(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
            // compute contour
            if (this.polling === -1 && this.contourData.length > 0) {
                return;
            } else if (this.frameCount <= this.polling) {
                this.frameCount += 1;
                return;
            }

            this.frameCount = 0;
            let i = 0;
            for (const V of this.potentials) {
                this.contourData[i] = this.method.computer(
                    this.area,
                    this.potential,
                    V
                );

                i += 1;
            }

        }

        potential(pos: Vec2) {
            // sum up all the potential
            let V = 0;
            for (const object of this.objects) {
                V += object.potential(pos);
            }
            return V;
        }
    }


    class PhantomObject {
        constructor(
            public parent: HasStrength,
            public pos: VecN,
            public diffeq: PhysicsSolvers.DiffEq
        ) {

            this.diffeq = this.diffeq.bind(this);
        }

        update(t: number, dt: number) {
            // This object does not have velocity, it rather follows the acceleration vector at a constant rate
            this.pos = Plane.VecAddV(
                this.pos as Vec2,
                Plane.VecReMag(
                    this.diffeq(t, this.pos, [0, 0]) as Vec2,
                    this.parent.charge() * dt
                )
            );
        }
    }


    export interface HasStrength extends IBaseObject {
        charge(): number;

        strength(pos: Vec2): Vec2;
    }

    export class ElectricFields extends BaseListElements<HasStrength> {
        // a list of list of points
        private data: (Vec2[])[];

        // Consider making this an array that is different for each charge
        protected phantomCharges: number;

        protected accuracy: number;

        // number of ticks before update, or 1/ups, ticks is the
        protected ticks: number;
        protected delay: number;


        constructor(
            {
                initialElements = [],
                divergence = 16,
                delay = -1,
                accuracy = 0.1,
            }: {
                initialElements?: HasStrength[],
                divergence?: number,
                delay?: number,
                accuracy?: number,
            } = {}
        ) {
            super(initialElements);

            this.data = [];
            this.phantomCharges = divergence;
            this.delay = delay;
            this.ticks = 0;
            this.accuracy = accuracy;
        }

        acceleration(pos: Vec2): Vec2 {
            let acc = null;
            for (const charge of this.elements) {
                const strength = charge.strength(pos);
                if (acc === null) {
                    acc = strength;
                } else {
                    acc = Plane.VecAddV(strength, acc);
                }
            }
            return acc;
        }

        computePoints() {
            const START_RADIUS = 0.1;
            const MAX_DURATION = 10;
            const MAX_DISTANCE = 10;
            const MIN_DISTANCE = 0.1;
            const DT = this.accuracy;

            this.data = [];

            const acc = this.acceleration.bind(this);
            const diffeq = (_, p, __) => acc(p);

            const n = this.phantomCharges
            const phantoms: PhantomObject[] = [];
            // spawn n phantoms for each charge
            for (const charge of this.elements) {
                const thetaStep = 2 * Math.PI / n;
                for (let i = 0; i < n; ++i) {
                    this.data.push([]);
                    const theta = thetaStep * i;
                    const radius = START_RADIUS;
                    const location = Plane.VecAddV(Plane.VecPolar(radius, theta), charge.pos as Vec2);
                    phantoms.push(
                        new PhantomObject(
                            charge,
                            location,
                            diffeq
                        )
                    );
                }
            }

            // simulate for say 10 seconds
            const duration = MAX_DURATION;
            const dt = DT;
            for (let t = 0; t < duration; t += dt) {
                for (let i = 0; i < phantoms.length; ++i) {
                    const obj = phantoms[i];
                    if (obj === null)
                        continue;

                    const lastPos = obj.pos;
                    obj.update(t, dt);
                    if (Plane.VecDist(lastPos as Vec2, obj.pos as Vec2) < 0.1 * dt) {
                        phantoms[i] = null;
                        continue;
                    }
                    this.data[i].push(obj.pos as Vec2);


                    if (Plane.VecDist(obj.pos as Vec2, obj.parent.pos as Vec2) > MAX_DISTANCE) {
                        phantoms[i] = null;
                    } else {
                        for (const element of this.elements) {
                            if (Plane.VecDist(obj.pos as Vec2, element.pos as Vec2) < MIN_DISTANCE) {
                                phantoms[i] = null;
                                break;
                            }
                        }
                    }


                }
            }
        }

        update(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
            super.update(parent, ctx, dt);

            if (this.delay >= 0) {
                if (this.ticks > 0) {
                    this.ticks -= 1;
                    return;
                } else {
                    this.ticks = this.delay;
                }
            }


            // if (this.data.length > 0) {
            //     return;
            // }
            // do stuff
            this.computePoints();
        }


        render(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
            super.render(parent, ctx, dt);

            if (this.data.length < 1) {
                return;
            }
            // do stuff

            // draw points
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#f00';
            for (const points of this.data) {
                ctx.beginPath();
                let first = true;
                for (const p of points) {
                    if (first) {
                        ctx.moveTo(...parent.pcTodc(p));
                        first = false;
                        continue;
                    }

                    ctx.lineTo(...parent.pcTodc(p));
                }
                ctx.stroke();
            }
        }
    }


    // colormaps for fields
    export namespace ColorMap {
        // [red, green, blue]
        export type Color = Vec3;

        /**
         * Clamp and Round the unlimited color value to 0..255
         * @param color
         */
        function restrictColor(color: Color): Color {
            const restrict = (value, lower = 0, upper = 255) => Math.floor(Math.max(lower, Math.min(upper, value)));
            return [restrict(color[0]), restrict(color[1]), restrict(color[2])];
        }

        export function colorToHex(color: Color): string {
            return '#' + color.map(c => c.toString(16).padStart(2, '0')).join('');
        }

        export function colorToNumber(color: Color): number {
            return (color[0] << 16) + (color[1] << 8) + color[2];
        }


        // takes a normalized value from 0 to 1 and returns a hex color
        export type CMap = (normVal: number) => Color;

        export function CMapInverse(cmap: CMap): CMap {
            return value => cmap(1 - value);
        }

        function intensityCMap(value: number, R, G, B): Color {
            const intensities = [R(value), G(value), B(value)];
            return restrictColor(intensities.map(i => 255 * i) as Color);
        }


        // simple red to blue
        export const RedBlue = (value: number) => {
            // linearly interpolate between red and blue, [255, 0, 0] to [0, 0, 255]
            const red = [255, 0, 0] as Color;
            const blue = [0, 0, 255] as Color;

            const diff = Volume.VecSubV3(blue, red);
            return restrictColor(Volume.VecAddV(red, Volume.VecMulC(diff, value)));
        }

        export const Rainbow = value => {
            // normal intensity functions
            const R = x => Math.exp(-(((x - 0.2) / 0.45) ** 2));
            const G = x => Math.exp(-(((x - 0.5) / 0.35) ** 2));
            const B = x => Math.exp(-(((x - 0.85) / 0.3) ** 2));
            return intensityCMap(value, R, G, B);
        }

        export const Cool = value => {
            const R = x => x;
            const G = x => -x + 1;
            const B = x => 0;
            return intensityCMap(value, R, G, B);
        }

        // https://www.desmos.com/calculator/kztaydrccw
        export const Turbo = value => {
            const R = x => 0.3 + 0.7 * Math.sin(10 * (x - 0.75)) / (10 * (x - 0.75));
            const G = x => Math.exp(-(((x - 0.45) / 0.3) ** 2));
            const B = x => (Math.exp(-(((x - 0.25) / 0.15) ** 2)) + 0.25 * Math.exp(-(((x - 0.65) / 0.25) ** 2))) / 1.0099;
            return intensityCMap(value, R, G, B);
        }

        export const DarkBlue = value => {
            const R = x => 0;
            const G = x => x;
            const B = x => x;
            return intensityCMap(value, R, G, B);
        }

        export const BlackWhite = value => {
            return [value * 255, value * 255, value * 255] as Color;
        }
    }


    export type ScalarFunction = (x: number, y: number) => number;
    export type ScalarFunctionTimeDependent = (x: number, y: number, t: number) => number;

    interface ScalarFieldOptions {
        location: Vec2;  // bottom left local coordinate
        size: Vec2;      // width and height of the graph
        density: Vec2;   // the amount of pixels in one direction
        scale: Vec2;     // compression ratio on the axis
        origin: Vec2;    // the local coordinate for the origin of the scalar function
    }

    // scalar fields
    export class ScalarField extends TDElement {
        // private worker: TDWorker;
        public readonly options: ScalarFieldOptions = {
            location: [0, 0],
            size: [10, 10],
            density: [100, 100],
            scale: [1, 1],
            origin: [0, 0]
        };

        // computed function values
        protected computed: number[][] = null;

        // colors array
        protected colored: Uint8ClampedArray;

        // bitmap image
        protected bitmap: ImageBitmap = null;

        constructor(
            private sf: ScalarFunctionTimeDependent,
            private cmap: ColorMap.CMap = ColorMap.Rainbow,
            options: Partial<ScalarFieldOptions> = {}
        ) {
            super();

            this.options = {...this.options, ...options};

            const {density} = this.options;
            this.colored = new Uint8ClampedArray(density[0] * density[1] * 4);  // x4 for RGBA
        }

        start(parent: ICanvas, ctx: CanvasRenderingContext2D) {
            // this.worker = new TDWorker();
            // this.worker.start();
        }

        update(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            this.computeValues(parent.totalTime);
        }

        render(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            if (this.computed == null || this.bitmap == null) {
                return;
            }

            // draws the bitmap
            const {location, size} = this.options;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
                this.bitmap,
                // position to draw image, adding size[1] as webgl draws anchoring top left while we use bottom left
                ...parent.localToWorld(Plane.VecAddV(location, [0, size[1]])),
                // canvas width
                parent.localToWorldScalar(size[0]),
                // canvas height
                parent.localToWorldScalar(size[1]),
            );
        }


        private computeValues(time: number) {
            const {location, size, density, origin, scale} = this.options;
            const [xSize, ySize] = density;

            let maximum = Number.MIN_VALUE;
            let minimum = Number.MAX_VALUE;

            let newComputed: number[][] = [];
            for (let y = 0; y < ySize; ++y) {
                let xs = [];
                for (let x = 0; x < xSize; ++x) {
                    // implement antialiasing
                    const trueX = (location[0] + x / xSize * size[0] - origin[0]) / scale[0];
                    const trueY = (location[1] + y / ySize * size[1] - origin[1]) / scale[1];

                    const value = this.sf(trueX, trueY, time);

                    if (value > maximum) {
                        maximum = value;
                    }
                    if (value < minimum) {
                        minimum = value;
                    }
                    xs.push(value);
                }
                newComputed.push(xs);
            }

            // normalize and apply colormap
            let i = 0;
            for (const row of newComputed) {
                for (const value of row) {
                    const normalized = (value - minimum) / (maximum - minimum);
                    const color = this.cmap(normalized);

                    this.colored[i] = color[0];
                    this.colored[i + 1] = color[1];
                    this.colored[i + 2] = color[2];
                    this.colored[i + 3] = 255;  // 255 for opaque

                    i += 4;
                }
            }

            this.computed = newComputed;

            // allocate bitmap
            const imageData = new ImageData(this.colored, density[0], density[1]);
            createImageBitmap(imageData)
                .then(bitmap => {
                    this.bitmap = bitmap;
                });
        }

    }

    // scalar field, time independent
    export class ScalarFieldIndependent extends ScalarField {
        constructor(
            sf: ScalarFunction,
            cmap: ColorMap.CMap = ColorMap.Rainbow,
            options: Partial<ScalarFieldOptions> = {}
        ) {
            super(
                (x, y, t) => sf(x, y),
                cmap,
                options
            );
        }

        // only compute once
        update(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            if (this.computed != null && this.colored != null) {
                return;
            }

            super.update(parent, ctx, dt);
        }
    }


    export type VectorFunction = (vec: Vec2) => Vec2;

    export interface VectorFieldOptions {
        location: Vec2;  // bottom left local coordinate
        size: Vec2;      // width and height of the graph
        density: Vec2;   // the amount of pixels in one direction
        scale: Vec2;     // compression ratio on the axis
        origin: Vec2;    // the local coordinate for the origin of the scalar function

        cmap: ColorMap.CMap;
    }

    // Represents the vector field as a field of normalized arrows, magnitude displayed as the color from the ColorMap
    export class VectorField extends TDElement {
        public readonly options: VectorFieldOptions = {
            location: [0, 0],
            size: [10, 6],
            density: [20, 20],
            scale: [1, 1],
            origin: [0, 0],
            cmap: ColorMap.Rainbow
        }

        // array of field normalized vectors
        private scaledField: Vec2[];
        // array of field magnitudes (color mapped)
        private fieldMagnitudes: number[];
        private fieldColors: string[];

        // the smallest dx space
        private gapSize: number;

        constructor(
            public readonly f: VectorFunction,
            options: Partial<VectorFieldOptions>
        ) {
            super();

            this.options = {...this.options, ...options};
        }

        start(parent: ICanvas, ctx: CanvasRenderingContext2D) {
            // calculate this.scaledField and this.fieldColors
            this.scaledField = [];
            this.fieldMagnitudes = [];
            this.fieldColors = [];

            const {location, size, density, origin, scale} = this.options;
            const [dx, dy] = [size[0] / density[0], size[1] / density[1]];
            this.gapSize = Math.min(dx, dy);

            // use origin a
            for (const [y, _] of Range.linspace(location[1], location[1] + size[1], density[1])) {
                for (const [x, _] of Range.linspace(location[0], location[0] + size[0], density[0])) {

                    const realX = (x - origin[0]) / scale[0];
                    const realY = (y - origin[1]) / scale[1];

                    const vec = this.f([realX, realY]);
                    const magnitude = Plane.VecMag(vec);
                    const normalizedVec = Plane.VecMulC(vec, this.gapSize / magnitude);

                    this.scaledField.push(normalizedVec);
                    this.fieldMagnitudes.push(magnitude);
                }
            }

            // calculate color field
            const max = Math.max(...this.fieldMagnitudes);
            const min = Math.min(...this.fieldMagnitudes);

            for (const magnitude of this.fieldMagnitudes) {
                this.fieldColors.push(ColorMap.colorToHex(this.options.cmap((magnitude - min) / (max - min))));
            }
        }

        render(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            const {size, location, density} = this.options;

            const dx = size[0] / density[0];
            const dy = size[1] / density[1];

            for (const [y, yi] of Range.linspace(location[1], location[1] + size[1], density[1])) {
                for (const [x, xi] of Range.linspace(location[0], location[0] + size[0], density[0])) {
                    const i = yi * density[0] + xi;
                    const color = this.fieldColors[i];
                    const vec = this.scaledField[i];

                    const position: Vec2 = [x, y];

                    Primitives.DrawVectorMaths(
                        parent,
                        ctx,
                        position,
                        vec,
                        0.07 * this.gapSize,
                        0.3,
                        color
                    );
                }
            }

        }
    }


    class StreamLine {
        public trails: Vec2[];
        public trailColors: string[];
        private isDecay: boolean;
        private counter: number;

        constructor(
            public position: Vec2,
            public readonly trailLength: number = 100,
        ) {
            this.trails = [position];
            this.trailColors = [];
            this.isDecay = false;
            this.counter = 0;
        }


        update(velocity: Vec2, color: string, dt: number) {
            this.position = Plane.VecAddV(this.position, Plane.VecMulC(velocity, dt / Plane.VecMag(velocity)));

            this.trails.push(this.position);
            this.trailColors.push(color);
        }

        setDecay() {
            this.isDecay = true;
        }

        shouldDecay() {
            return this.isDecay || this.trails.length > this.trailLength;
        }

        decay(dt: number) {
            this.trails.shift();
            this.trailColors.shift();
        }

        shouldDiscard() {
            return this.isDecay && this.trails.length === 0;
        }

        render(parent: ICanvas, ctx: CanvasRenderingContext2D) {
            // if (this.trails.length <= 1) {
            //     return;
            // }
            //
            // Primitives.DrawColoredLine(
            //     parent,
            //     ctx,
            //     this.trails,
            //     this.trailColors,
            //     0.05,
            // );
        }
    }

    interface VectorStreamLinesOptions {
        spawntime: number;
        trailLength: number;
        trailWidth: number;

        maxVelocity: number;

        cmap: ColorMap.CMap;
        location: Vec2;  // bottom left local coordinate
        size: Vec2;      // width and height of the graph
        scale: Vec2;     // compression ratio on the axis
        origin: Vec2;    // the local coordinate for the origin of the scalar function

    }

    export class VectorStreamLines extends TDElement {
        options: VectorStreamLinesOptions = {
            location: [0, 0],
            size: [10, 6],
            scale: [1, 1],
            origin: [0, 0],
            cmap: ColorMap.Rainbow,
            spawntime: 0.05,
            trailLength: 100,
            trailWidth: 0.02,
            maxVelocity: 10,
        }

        streamlines: StreamLine[];
        delta: number;

        constructor(
            public readonly f: VectorFunction,
            options: Partial<VectorStreamLinesOptions>
        ) {
            super();

            this.options = {...this.options, ...options};
            this.streamlines = [];
            this.delta = this.options.spawntime;  // immediately spawn
        }

        border(): Vec<4> {
            const {location, size} = this.options;
            return [
                location[1] + size[1],
                location[1],
                location[0],
                location[0] + size[0]
            ];
        }

        localToCanvas(local: Vec2): Vec2 {
            const {origin, scale} = this.options;

            return [
                (local[0] - origin[0]) / scale[0],
                (local[1] - origin[1]) / scale[1],
            ] as Vec2;
        }

        createStreamline() {
            const {location, size, trailLength} = this.options;
            // random position
            const position: Vec2 = [
                Math.random() * size[0] + location[0],
                Math.random() * size[1] + location[1]
            ];

            this.streamlines.push(new StreamLine(position, trailLength));
        }

        update(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            const {spawntime, cmap, maxVelocity} = this.options;

            this.delta += dt;

            // check to spawn a new streamline
            while (this.delta > spawntime) {
                this.delta -= spawntime;

                this.createStreamline();
            }

            // update streamlines, remove if expired
            let newStreamlines = [];
            for (const [index, streamline] of this.streamlines.entries()) {
                if (streamline.shouldDiscard()) {
                    continue;
                }

                if (streamline.shouldDecay()) {
                    streamline.setDecay();
                    streamline.decay(dt);
                } else {
                    if (!Plane.VecInside(streamline.position, this.border())) {
                        streamline.setDecay();
                    }

                    const velocity = this.f(this.localToCanvas(streamline.position));
                    const mag = Plane.VecMag(velocity);
                    streamline.update(
                        velocity,
                        ColorMap.colorToHex(cmap(Math.min(mag, maxVelocity) / maxVelocity)),
                        dt
                    );
                }

                newStreamlines.push(streamline);
            }

            this.streamlines = newStreamlines;
        }

        render(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {

            // render all streamlines
            // for (const streamline of this.streamlines) {
            //     streamline.render(parent, ctx);
            // }


            // batch calls
            const parameters = this.streamlines.map((sl) => [
                parent,
                ctx,
                sl.trails,
                sl.trailColors,
                this.options.trailWidth
            ]);

            Batched.DrawBatched(
                Batched.DrawColoredLine,
                parameters
            );
        }

    }


    // complex hue field and winding numbers (complex solver)
    export class ComplexHueField extends TDElement {

    }


    // fluid helper
    function arrayOf<T>(length: number, item: (i: number) => T): T[] {
        return Array.from({length}).map((_, i) => item(i));
    }

    // https://stackoverflow.com/a/2450976/9341734
    function shuffle(array) {
        let currentIndex = array.length, randomIndex;

        // While there remain elements to shuffle.
        while (currentIndex != 0) {

            // Pick a remaining element.
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            // And swap it with the current element.
            const temp = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temp;
        }

        return array;
    }

    function shuffledIndex(length: number): number[] {
        let arr = [];
        let i = 0;
        while (i < length) {
            arr.push(i);
            i++;
        }
        return shuffle(arr);
    }

    function arrayMin(array: number[] | Float64Array): number {
        let curr = Number.MAX_VALUE;
        let i = 0;
        while (i < array.length) {
            if (array[i] < curr) {
                curr = array[i];
            }
            i++;
        }
        return curr;
    }

    function arrayMax(array: number[] | Float64Array): number {
        let curr = Number.MIN_VALUE;
        let i = 0;
        while (i < array.length) {
            if (array[i] > curr) {
                curr = array[i];
            }
            i++;
        }
        return curr;
    }


    // fluid simulation
    interface FluidFieldOptions {
        fieldSize: Vec2;  // number of cells [width, height]
        cellSize: number;   // cell size [width, height]
        location: Vec2;
        drawModes: FluidDrawMode[];
        debugNaN: boolean;  // truthy to call the debugger on NaN values
    }

    export enum FluidDrawMode {
        VELOCITY = 0,
        PRESSURE = 1,
        CELL = 2,
        DENSITY = 3
    }

    export enum CellType {
        FLUID = 1,
        WALL = 0
    }

    type FluidObjectIJ = (i: number, j: number) => null | Partial<{ cell: CellType, u: number, v: number, density: number }>;
    export const FluidFieldObjects: Record<string, FluidObjectIJ> = {
        walls(i, j) {
            if (i == -1 || i == this.area[0] || j == -1 || j == this.area[1]) {
                return {
                    cell: CellType.WALL,
                };
            }

            return null;
        },
        smokeBall(i, j) {
            // if (i == 0 && j == 0) {
            //     return {
            //         density: 1
            //     }
            // }
            if ((i - 15) ** 2 + (j - 25) ** 2 <= 3 ** 2) {
                return {
                    density: 1
                }
            }
            return null;
        }
    }

    interface PersistentFluidParameter {
        u: Float64Array;
        v: Float64Array;
        density: Float64Array;
        cells: Uint8Array;
    }

    type PersistentFluidObjectIJ = (param: PersistentFluidParameter) => null;

    export class FluidField extends TDElement {
        public readonly options: FluidFieldOptions = {
            fieldSize: [6, 6],
            cellSize: 0.1,
            location: [0, 0],
            drawModes: [FluidDrawMode.VELOCITY, FluidDrawMode.CELL],
            debugNaN: false
        }

        // true simulation area, excluding padding
        public readonly area: Vec2;

        // velocity field, staggered, anchored top left, indexed top left, padded
        private u: Float64Array;
        private u_buffer: Float64Array;
        private v: Float64Array;
        private v_buffer: Float64Array;

        // contains cell type information, padded
        private cells: Uint8Array;

        // density information, padded
        private density: Float64Array;
        private density_buffer: Float64Array;

        // pressure information, non-padded
        private pressure: Float64Array;

        // an array of deltas to traverse 2d grid arrays
        private delta_padded: Uint32Array;

        // color map of the pressure field
        private cmap: ColorMap.CMap = ColorMap.Rainbow;
        // color map of the density field
        private densityCmap = ColorMap.CMapInverse(ColorMap.BlackWhite);

        private drawers: {
            pressure?: ImageDrawer,
            density?: ImageDrawer
        }

        private persistentObjects: PersistentFluidObjectIJ[];

        constructor(
            options: Partial<FluidFieldOptions>
        ) {
            super();

            this.options = {...this.options, ...options};
            this.area = this.options.fieldSize;
            this.allocate();
        }

        private allocate() {
            const {fieldSize, drawModes} = this.options;

            // create velocity field
            this.u = new Float64Array(arrayOf(this.size_padded(), () => 0));
            this.u_buffer = new Float64Array(arrayOf(this.size_padded(), () => 0));
            this.v = new Float64Array(arrayOf(this.size_padded(), () => 0));
            this.v_buffer = new Float64Array(arrayOf(this.size_padded(), () => 0));
            this.cells = new Uint8Array(arrayOf(this.size_padded(), () => CellType.FLUID));

            this.pressure = new Float64Array(arrayOf(this.size(), () => 0));
            this.density = new Float64Array(arrayOf(this.size_padded(), () => 0));
            this.density_buffer = new Float64Array(arrayOf(this.size_padded(), () => 0));

            this.drawers = {};
            if (drawModes.includes(FluidDrawMode.PRESSURE)) {
                this.drawers.pressure = new ImageDrawer(this.area);
            }
            if (drawModes.includes(FluidDrawMode.DENSITY)) {
                this.drawers.density = new ImageDrawer(this.area);
            }

            this.persistentObjects = [];

            // create the delta_padded array
            let deltas = [];
            let index = 0;
            for (let j = 0; j < this.area[1]; ++j) {
                for (let i = 0; i < this.area[0]; ++i) {
                    deltas.push(this.index_padded(i, j) - index);
                    index = this.index_padded(i, j);
                }
            }
            this.delta_padded = new Uint32Array(deltas);

        }

        public addObject(object: FluidObjectIJ) {
            object = object.bind(this);

            for (let j = -1; j < this.area[1] + 1; ++j) {
                for (let i = -1; i < this.area[0] + 1; ++i) {
                    const result = object(i, j);
                    if (result == null) {
                        continue;
                    }

                    const index = this.index_padded(i, j);
                    if (result.cell != null)
                        this.cells[index] = result.cell;

                    if (result.u != null)
                        this.u[index] = result.u;

                    if (result.v != null)
                        this.v[index] = result.v;

                    if (result.density != null)
                        this.density[index] = result.density
                }
            }
        }

        public addPersistentObject(object: PersistentFluidObjectIJ) {
            this.persistentObjects.push(object);
        }

        /// getters ///

        // Returns the indexing for an unpadded grid array
        public index(i: number, j: number): number {
            return j * this.area[0] + i;
        }

        private get delta_row_padded() {
            return this.area[0] + 2;
        }

        private get delta_row() {
            return this.area[0];
        }

        // Returns the indexing of a padded grid array
        public index_padded(i: number, j: number): number {
            return ((j + 1) * (this.area[0] + 2)) + i + 1;
        }

        // Returns whether the padded index is unbounded, ie outside of the visible area
        public isIndexPaddedUnbounded(i: number, j: number): boolean {
            return i < 0 || i >= this.area[0] || j < 0 || j >= this.area[1];
        }

        private unpad(array: Float64Array): number[] {
            let output = [];

            let z = this.delta_row_padded;
            for (let j = 0; j < this.area[1]; ++j) {
                z += 1;
                for (let i = 0; i < this.area[0]; ++i) {
                    output.push(array[z])
                    z += 1;
                }
                z += 1;
            }
            return output;
        }

        // Returns the length of the unpadded grid array
        public size(): number {
            return this.area[0] * this.area[1];
        }

        // Returns the length of the padded grid array
        public size_padded(): number {
            return (this.area[0] + 2) * (this.area[1] + 2);
        }

        // Returns the canvas size of the field
        public canvasSize(): Vec2 {
            return [this.area[0] * this.options.cellSize, this.area[1] * this.options.cellSize];
        }

        /// Step one ///
        private applyForce(dt: number) {
            // apply gravity
            const g = -1;

            for (let j = 0; j < this.area[1]; ++j) {
                for (let i = 0; i < this.area[0]; ++i) {
                    this.v[this.index_padded(i, j)] += g * dt;
                }
            }
        }

        /// Step two ///


        // Deprecated, kept for education
        private divergence(i: number, j: number): number {
            const top = this.v[this.index_padded(i, j)];
            const left = this.u[this.index_padded(i, j)];
            const down = this.v[this.index_padded(i, j + 1)];
            const right = this.u[this.index_padded(i + 1, j)];
            return top - left - down + right;
        }

        // Deprecated, kept for education
        private cell(i: number, j: number): Vec<4> {
            // returns [top, left, down, right]
            return [
                this.cells[this.index_padded(i, j - 1)],
                this.cells[this.index_padded(i - 1, j)],
                this.cells[this.index_padded(i, j + 1)],
                this.cells[this.index_padded(i + 1, j)],
            ];
        }

        private forceIncompressible(dt: number) {
            // update velocity field to be non-divergent
            // let new_u = [...this.u];
            // let new_v = [...this.v];

            const O = 1.9;
            const rho = 1;
            const h = this.options.cellSize;


            const delta = this.delta_row_padded;

            let index = 0;
            let length = this.delta_padded.length;
            for (let z = 0; z < length; ++z) {
                // for (let j = 0; j < this.area[1]; ++j) {
                //     for (let i = 0; i < this.area[0]; ++i) {
                // const indices = shuffledIndex(this.area[0] * this.area[1]);
                // for (let z = 0; z < indices.length; ++z) {
                //     const k = indices[z];
                //
                //     const i = k % this.area[0];
                //     const j = (k / this.area[0]) >> 0;  // Math.floor(k / this.area[0])

                index += this.delta_padded[z];
                // caching these for performance
                // const index = this.index_padded(i, j);

                // const div = O * this.divergence(i, j);
                const div = O * (this.v[index]  // i,j
                    - this.u[index]  // i,j
                    - this.v[index + delta]  // i,j+1
                    + this.u[index + 1]);  // i+1,j


                // const cell = this.cell(i, j);
                const cell = [
                    // i,j-1
                    this.cells[index - delta],
                    // i-1,j
                    this.cells[index - 1],
                    // i,j+1
                    this.cells[index + delta],
                    // i+1,j
                    this.cells[index + 1],
                ];
                const s = cell[0] + cell[1] + cell[2] + cell[3];

                // enclosed
                if (s === 0) {
                    continue;
                }

                // [top left down right]
                // i,j
                this.v[index] -= cell[0] * div / s;
                this.u[index] += cell[1] * div / s;
                // i,j+1
                this.v[index + delta] += cell[2] * div / s;
                // i+1,j
                this.u[index + 1] -= cell[3] * div / s;


                // update pressure
                this.pressure[z] += (div / s) * (rho * h / dt);
                // }
            }
        }

        private moveDensity(dt: number) {
            // same as moveVelocity, but uses the center node instead
            const new_density = this.density_buffer;

            const delta = this.delta_row_padded;

            let index = delta;
            for (let j = 0; j < this.area[1]; ++j) {
                index += 1;
                for (let i = 0; i < this.area[0]; ++i, ++index) {
                    const velocity = [
                        // i,j + i+1,j
                        (this.u[index] + this.u[index + 1]) / 2,
                        // i,j + i,j+1
                        (this.v[index] + this.v[index + delta]) / 2,
                    ];

                    // has to be a plus because the grid j and velocity directions are flipped
                    const origin = [
                        (i + 0.5) - dt * velocity[0],
                        (j + 0.5) + dt * velocity[1]
                    ];

                    const origin_i = Math.round(origin[0]);
                    const origin_j = Math.round(origin[1]);

                    // const h = this.options.cellSize;
                    if (this.isIndexPaddedUnbounded(origin_i, origin_j)) {
                        // i,j
                        new_density[index] = 0;
                        continue;
                    }
                    // if (Math.abs(origin[0] - origin_i) < h / 10 && Math.abs(origin[1] - origin_j) < h / 10) {
                    //     new_density[this.index_padded(i, j)] = this.density[this.index_padded(origin_i, origin_j)];
                    //     continue;
                    // }

                    // distance to top left point
                    const x = origin[0] - origin_i + 0.5;
                    const y = origin[1] - origin_j + 0.5;

                    // linear interpolate
                    const origin_index = this.index_padded(origin_i, origin_j);

                    // i-1,j-1
                    const a = this.density[origin_index - 1 - delta];
                    // i,j-1
                    const b = this.density[origin_index - delta];
                    // i-1,j
                    const c = this.density[origin_index - 1];
                    // i,j
                    const d = this.density[origin_index];

                    const v1 = a + x * (b - a);
                    const v2 = c + x * (d - c);

                    // i,j
                    new_density[index] = v1 + y * (v2 - v1);
                }
                index += 1;
            }

            // copy buffer
            this.density.set(this.density_buffer);
        }

        private moveVelocity(dt: number) {
            let new_u = this.u_buffer;
            let new_v = this.v_buffer;

            const delta = this.delta_row_padded;

            let index = delta;
            for (let j = 0; j < this.area[1]; ++j) {
                index += 1;
                for (let i = 0; i < this.area[0]; ++i, ++index) {
                    // i,j
                    if (this.cells[index] !== CellType.FLUID)
                        continue;

                    // i,j
                    const v = this.v[index];
                    const u = this.u[index];

                    // implicit euler backwards integration
                    // for better stability
                    // for each component, use the velocity at the staggered node
                    // and step backwards to find the origin
                    // linearly interpolate the velocity at the origin
                    // then set the component to be the interpolated velocity component


                    // update the horizontal component
                    {
                        // with a vertical velocity estimation using averages
                        const velocity = [
                            u,
                            (
                                this.v[index - 1]  // i-1,j
                                + this.v[index]  // i,j
                                + this.v[index - 1 + delta]  // i-1,j+1
                                + this.v[index + delta]  // i,j+1
                            ) / 4
                        ];
                        // flipped sign on the y direction due to axis and velocity vector mismatch
                        const origin = [
                            (i) - dt * velocity[0],
                            (j + 0.5) + dt * velocity[1]
                        ];


                        // interpolate
                        const origin_i = Math.floor(origin[0]);
                        const origin_j = Math.round(origin[1]);

                        const origin_index = this.index_padded(origin_i, origin_j);

                        // i,j
                        if (this.isIndexPaddedUnbounded(origin_i, origin_j)) {
                            new_u[index] = 0;
                        } else {
                            const x = origin[0] - origin_i;
                            const y = origin[1] - origin_j + 0.5;

                            // i,j-1
                            const a = this.u[origin_index - delta];
                            // i+1,j-1
                            const b = this.u[origin_index + 1 - delta];
                            // i,j
                            const c = this.u[origin_index];
                            // i+1,j
                            const d = this.u[origin_index + 1];

                            const v1 = a + x * (b - a);
                            const v2 = c + x * (d - c);
                            // i,j
                            new_u[index] = v1 + y * (v2 - v1);
                        }
                    }


                    // update the vertical component
                    {
                        // with a horizontal velocity estimation using averages
                        const velocity = [
                            (
                                this.u[index - delta]  // i,j-1
                                + this.u[index + 1 - delta]  // i+1,j-1
                                + this.u[index]  // i,j
                                + this.u[index + 1]  // i+1,j
                            ) / 4,
                            v
                        ];

                        // flipped sign on the y direction due to axis and velocity vector mismatch
                        const origin = [
                            (i + 0.5) - dt * velocity[0],
                            (j) + dt * velocity[1]
                        ];

                        // interpolate
                        const origin_i = Math.round(origin[0]);
                        const origin_j = Math.floor(origin[1]);

                        if (this.isIndexPaddedUnbounded(origin_i, origin_j)) {
                            // i,j
                            new_v[index] = 0;
                        } else {
                            const origin_index = this.index_padded(origin_i, origin_j);
                            const x = origin[0] - origin_i + 0.5;
                            const y = origin[1] - origin_j;

                            // i-1,j
                            const a = this.v[origin_index - 1];
                            // i,j
                            const b = this.v[origin_index];
                            // i-1,j+1
                            const c = this.v[origin_index - 1 + delta];
                            // i,j+1
                            const d = this.v[origin_index + delta];

                            const v1 = a + x * (b - a);
                            const v2 = c + x * (d - c);

                            // i,j
                            new_v[index] = v1 + y * (v2 - v1);
                        }
                    }
                }
                index += 1;
            }

            this.u.set(this.u_buffer);
            this.v.set(this.v_buffer);
        }

        // Advance a tick in the fluid simulation
        private tick(dt: number) {
            // debugger;
            // diffusion/viscosity

            // apply forces
            // this.applyForce(dt);

            // in-compressibility condition
            const n = 4;
            for (let i = 0; i < n; ++i) {
                this.forceIncompressible(dt);
                this.debugNaN();
            }

            if (this.drawers.pressure) {
                const max = arrayMax(this.pressure);
                const min = arrayMin(this.pressure);
                let pressureColors = [];
                let i = 0;
                while (i < this.pressure.length) {
                    pressureColors.push(this.cmap((Math.min(max, this.pressure[i]) - min) / (max - min)));
                    i++;
                }
                // debugger;
                this.drawers.pressure.update(pressureColors);
            }

            // advection
            this.moveDensity(dt);
            this.debugNaN();
            this.moveVelocity(dt);
            this.debugNaN();
            if (this.drawers.density) {
                const density = this.unpad(this.density);
                const [max, min] = [1, 0];
                let densityColors = [];
                let i = 0;
                while (i < density.length) {
                    densityColors.push(this.densityCmap((Math.min(1, density[i]) - min) / (max - min)));
                    i++;
                }
                this.drawers.density.update(densityColors);
            }
        }

        private debugNaN() {
            if (!this.options.debugNaN) {
                return;
            }

            if (this.u.includes(Number.NaN)) {
                debugger;
            }

            if (this.v.includes(Number.NaN)) {
                debugger;
            }

            if (this.density.includes(Number.NaN)) {
                debugger;
            }

            if (this.pressure.includes(Number.NaN)) {
                debugger;
            }
        }

        update(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            // apply persistent objects
            for (const object of this.persistentObjects) {
                object({
                    density: this.density,
                    cells: this.cells,
                    u: this.u,
                    v: this.v
                });
            }

            // fluid simulation
            this.tick(dt);
        }

        render(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            const {location, cellSize, drawModes} = this.options;

            const h = cellSize;

            if (drawModes.includes(FluidDrawMode.PRESSURE)) {
                this.drawers.pressure.draw(
                    parent, ctx, location, this.canvasSize()
                );
            }

            if (drawModes.includes(FluidDrawMode.DENSITY)) {
                this.drawers.density.draw(
                    parent, ctx, location, this.canvasSize()
                );
            }

            if (drawModes.includes(FluidDrawMode.VELOCITY)) {
                for (let j = 0; j < this.area[1]; ++j) {
                    for (let i = 0; i < this.area[0]; ++i) {
                        const canvasPosition = [i + 0.5, this.area[1] - (j + 0.5)] as Vec2;
                        const position = Plane.VecAddV(location, Plane.VecMulC(canvasPosition, h));

                        // const position =
                        //     Plane.VecAddV(location, Plane.VecMulC([i + 0.5, j - 0.5], h));


                        let direction = [this.u[this.index_padded(i, j)], this.v[this.index_padded(i, j)]] as Vec2;
                        if (Plane.VecMag(direction) < 2 * Number.EPSILON) {
                            direction = [0, 0];
                        } else {
                            direction = Plane.VecMulC(direction, h / Plane.VecMag(direction));
                        }

                        Primitives.DrawVectorMaths(
                            parent,
                            ctx,
                            position,
                            direction,
                            0.001,
                            0.2,
                            '#000000'
                        );
                    }
                }
            }

            if (drawModes.includes(FluidDrawMode.CELL)) {
                ctx.fillStyle = '#570083';

                let index = 0;
                for (let j = -1; j < this.area[1] + 1; ++j) {
                    for (let i = -1; i < this.area[0] + 1; ++i, ++index) {
                        if (this.cells[index] == CellType.FLUID) {
                            continue;
                        }

                        const canvasPosition = [i, this.area[1] - j] as Vec2;
                        const position = Plane.VecAddV(location, Plane.VecMulC(canvasPosition, h));

                        ctx.fillRect(
                            ...parent.localToWorld(position),
                            parent.localToWorldScalar(h),
                            parent.localToWorldScalar(h),
                        );
                    }
                }
            }

        }
    }
}

export namespace Mechanics {
    import EnergeticSystems = DynamicGraphs.EnergeticSystems;
    import ColorMap = Fields.ColorMap;

    export class OrbitalMotion extends TDBaseObject implements EnergeticSystems, Traceable {
        DEFAULT_BINDINGS = {
            M: Binding.constant(Mass),
            m: Binding.constant(0.1),
            G: Binding.constant(G),
            Mr: Binding.constant(0.25),
            mr: Binding.constant(0.1),
        }

        constructor(
            {
                Mpos,
                Mvel,
                mpos,
                mvel,
                bindings,
            }: {
                Mpos: Vec2,
                Mvel: Vec2,
                mpos: Vec2,
                mvel: Vec2,
                bindings
            }
        ) {
            super({
                pos: [...Mpos, ...mpos],
                vel: [...Mvel, ...mvel],
                bindings
            });
        }

        static circular(
            {
                M,
                m,
                bindings
            }: {
                M: Vec2,
                m: Vec2,
                bindings
            }
        ) {
            const r = VSpace.VecMag(VSpace.VecSubV(M, m));
            const vel = Math.sqrt(G * Mass / r);
            return new OrbitalMotion({
                Mpos: M,
                Mvel: [0, 0],
                mpos: m,
                mvel: [vel, 0],
                bindings
            })
        }

        differential(t: number, p: VecN, v: VecN): VecN {

            const {M, m, G} = this.parameters;

            const Mpos = [p[0], p[1]];
            const mpos = [p[2], p[3]];

            const r = VSpace.VecMag(VSpace.VecSubV(mpos, Mpos));

            // large mass acceleration,
            // notice the r * r * r is because vecsubv is not normalized
            const AM = VSpace.VecMulC(VSpace.VecSubV(mpos, Mpos), G * m / (r * r * r));
            const Am = VSpace.VecMulC(VSpace.VecSubV(Mpos, mpos), G * M / (r * r * r));
            return [...AM, ...Am];
        }

        render(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
            const {Mr, mr} = this.parameters;

            const Mpos = this.pos.slice(0, 2);
            const mpos = this.pos.slice(2, 4);

            const radius = VSpace.VecMag(VSpace.VecSubV(Mpos, mpos));
            // drawHollowCircle(ctx, parent.pcTodc(Mpos) as any, parent.psTods(radius), '#000000');

            Primitives.drawCircle(ctx, parent.pcTodc(Mpos as Vec2) as any, parent.psTods(Mr), '#000000');
            Primitives.drawCircle(ctx, parent.pcTodc(mpos as Vec2) as any, parent.psTods(mr), '#ff0000');
        }

        supplyEnergy(percent: number) {
            const mv = [this.vel[2], this.vel[3]];
            const energy = 0.5 * this.parameters.m * VSpace.VecMag(mv) ** 2;
            const newEnergy = energy * (1 + percent);
            const newVel = VSpace.VecMulC(VSpace.VecNormalize(mv), Math.sqrt(2 * newEnergy / this.parameters.m));
            this.vel[2] = newVel[0];
            this.vel[3] = newVel[1];
        }

        reorbit() {
            const {M, m, G} = this.parameters;

            const Mpos = this.pos.slice(0, 2);
            const mpos = this.pos.slice(2, 4);
            const r = VSpace.VecMag(VSpace.VecSubV(Mpos, mpos));
            const vel = Math.sqrt(G * Mass / r);

            const mvel = [this.vel[2], this.vel[3]];

            const newVel = VSpace.VecMulC(VSpace.VecNormalize(mvel), vel);
            this.vel[2] = newVel[0];
            this.vel[3] = newVel[1];
        }

        kineticEnergy(): number {
            const mv = [this.vel[2], this.vel[3]];
            return 0.5 * this.parameters.m * VSpace.VecMag(mv) ** 2;
        }

        potentialEnergy(): number {
            const {M, m, G} = this.parameters;
            const r = VSpace.VecMag(VSpace.VecSubV(this.pos.slice(2, 4), this.pos.slice(0, 2)));
            const p = -G * M * m / r;
            return p;
        }

        totalEnergy() {
            return this.kineticEnergy() + this.potentialEnergy();
        }

        location(): Vec2 {
            return [
                this.pos[2], this.pos[3]
            ];
        }

    }

    export class Oscillator extends TDBaseObject implements EnergeticSystems {
        DEFAULT_BINDINGS = {
            mass: Binding.constant(1),
            omega: Binding.constant(1),
            size: Binding.constant(0.25)
        }

        solver = PhysicsSolvers.Verlet;

        force: (t: number) => Vec2;
        xe: Vec2;
        location: Vec2;

        constructor(
            {
                location,
                xe = [0, 0],
                xi = [0, 0],
                vi = [0, 0],
                force = (_) => [0, 0],
                bindings
            }: {
                location: Vec2,
                xe: Vec2,
                xi: Vec2,
                vi: Vec2,
                force: (t: number) => Vec2
                bindings
            }
        ) {
            super({
                pos: xi,
                vel: vi,
                bindings,
            });

            this.location = location;
            this.xe = xe;
            this.force = force;
        }

        differential(t: number, p: VecN, v: VecN): VecN {
            const {mass, omega} = this.parameters;
            const pos = this.pos;
            const F = this.force(t);

            return [
                (F[0] - omega ** 2 * pos[0]) / mass,
                (F[1] - omega ** 2 * pos[1]) / mass,
            ]
        }


        kineticEnergy(): number {
            const velocity = Math.sqrt(this.vel[0] * this.vel[0] + this.vel[1] * this.vel[1]);
            return 0.5 * this.parameters.mass * velocity * velocity;
        }

        potentialEnergy(): number {
            // using this to graph displacement
            return Math.sqrt(this.pos[0] ** 2 + this.pos[1] ** 2);
        }


        render(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            const {size} = this.parameters;

            const location = this.location;
            const start = Plane.VecAddV(this.xe, location);
            const end = Plane.VecAddV(this.pos as Vec2, location);


            const points = Primitives.ComputeSpring({
                C: 0.1,
                W: 5,
                A: 0.2,
            }, start, end as Vec2);

            // draw spring
            Primitives.DrawPoints(parent, ctx, points);

            // draw ball
            Primitives.DrawCircle(parent, ctx, end, size);
        }
    }


    export interface ClothOptions {
        dampening: number;
        elasticity: number;
        bodyRadius: number;
        stringWidth: number;
        gravity: number;
        interactive: boolean;
        stress: boolean;
    }

    /**
     * A cloth simulation from scratch
     */
    export class Cloth extends TDElement {
        options: ClothOptions = {
            dampening: 4,
            elasticity: 300,
            bodyRadius: 0.07,
            stringWidth: 3,
            gravity: 9,
            interactive: true,
            stress: true,
        }

        cmap: ColorMap.CMap = ColorMap.CMapInverse(ColorMap.Rainbow);

        stringEquilibriumLengths: number[] = [];
        bodyVelocities: Vec2[] = [];
        connectionLookup: ([number, number][])[] = [];

        // interactive variables
        focusHandler: DragHandler;
        clickHandler: ClickHandler;

        draggedBody: number = null;  // null if the drag did not find a body
        wasBodyFixed: boolean = false;
        startDrag: Vec2 = null;

        constructor(
            private bodies: Vec2[] = [],
            private connections: [number, number][] = [],
            private fixed: number[] = [],
            options: Partial<ClothOptions> = {}
        ) {
            super();

            this.bodyVelocities = Array.from({length: bodies.length}).map(_ => [0, 0]);
            this.options = {...this.options, ...options};

            // binding handlers
            BindHandlers<Cloth>(
                this,
                ["handleDragStart", "handleDragEnd", "handleDragDuring", "handleClick"]
            );
        }


        /// static constructors ///
        static chain(
            points: Vec2[],
            locks: number[] = [],
            options: Partial<ClothOptions> = {}
        ) {
            let connections = [];
            for (let i = 0; i < points.length - 1; ++i) {
                connections.push([i, i + 1]);
            }

            return new Cloth(
                points,
                connections,
                [0, points.length - 1, ...locks],
                options
            );
        }


        /**
         * Create a curtain shaped cloth with top row of alternating fixed points
         * @param width
         * @param height
         * @param options
         */
        static curtain(
            width: Range,
            height: Range,
            options: Partial<ClothOptions> = {}
        ) {
            let bodies = [];
            let connections = [];
            let fixed = [];

            // first generate the bodies
            for (const [row, rindex] of height) {
                for (const [col, cindex] of width) {
                    const body = [col, row];

                    bodies.push(body);

                    if (rindex == 0 && cindex % 2 == 0) {
                        // fix the body
                        fixed.push(bodies.length - 1);
                    }
                }
            }

            // then generate the conditions
            for (const [row, rindex] of height) {
                for (const [col, cindex] of width) {
                    const rightConnection = [rindex * width.size + cindex, rindex * width.size + cindex + 1];
                    const downConnection = [rindex * width.size + cindex, (rindex + 1) * width.size + cindex];

                    if (rindex !== height.lastIndex) {
                        connections.push(downConnection);
                    }

                    if (cindex !== width.lastIndex) {
                        connections.push(rightConnection);
                    }
                }
            }

            return new Cloth(bodies, connections, fixed, options);
        }

        render(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            const {bodyRadius, stringWidth, stress} = this.options;

            // find max stretch
            let maxStretch = -1;
            if (stress) {
                for (const [index, connection] of this.connections.entries()) {
                    const [fromIndex, toIndex] = connection;
                    const from = this.bodies[fromIndex];
                    const to = this.bodies[toIndex];

                    const stretch = Math.abs(Plane.VecDist(from, to) - this.stringEquilibriumLengths[index]);
                    maxStretch = Math.max(maxStretch, stretch);
                }
            }

            // draw connections
            for (const [index, connection] of this.connections.entries()) {
                const [fromIndex, toIndex] = connection;
                const from = this.bodies[fromIndex];
                const to = this.bodies[toIndex];

                let color = '#000000';
                if (stress) {
                    const stretch = Math.abs(Plane.VecDist(from, to) - this.stringEquilibriumLengths[index]);
                    const stretchNormalized = Math.min(maxStretch, stretch) / maxStretch;
                    color = ColorMap.colorToHex(this.cmap(stretchNormalized));
                }

                Primitives.DrawLine(parent, ctx, from, to, stringWidth, color);
            }


            // draw circle bodies, last
            for (const [index, body] of this.bodies.entries()) {
                if (this.fixed.includes(index)) {
                    Primitives.DrawCircle(parent, ctx, body, bodyRadius, '#000000');
                } else {
                    Primitives.DrawHollowCircle(parent, ctx, body, bodyRadius, 0.02, '#000000');
                }
            }

            // render a cutting line
            const cursor = parent.inputs.cursor.value();
            if (this.draggedBody == null && this.startDrag != null && cursor != null) {
                Primitives.DrawDashedLine(
                    parent, ctx,
                    this.startDrag, cursor,
                    2,
                    '#000000',
                    [0.2, 0.07],
                );
            }
        }

        handleDragStart(position: Vec2) {
            // this is for cutting
            this.startDrag = position;


            // select the body
            const body = this.findBody(position);
            if (body == -1) {
                return;
            }

            // cache the fixed state of the body & set the body to be fixed when dragging
            this.wasBodyFixed = this.fixed.includes(body);
            if (!this.wasBodyFixed) {
                this.fixed.push(body);
            }

            this.draggedBody = body;
        }

        handleDragDuring(position: Vec2) {
            if (this.draggedBody == null)
                return;

            // when dragging
            // update the position of this.body
            this.bodies[this.draggedBody] = position;
        }

        handleDragEnd(position: Vec2) {
            // reset startDrag
            const startDrag = this.startDrag;
            this.startDrag = null;

            if (this.draggedBody == null) {
                // cut strings if find any

                const newStringLength = [];
                const newConnections = [];
                for (const [index, connection] of [...this.connections].entries()) {
                    const [b1, b2] = connection;
                    const body1 = this.bodies[b1];
                    const body2 = this.bodies[b2];

                    if (!Plane.Intersect(startDrag, position, body1, body2)) {
                        newConnections.push(connection);
                        newStringLength.push(this.stringEquilibriumLengths[index]);
                    }
                }

                this.connections = newConnections;
                this.stringEquilibriumLengths = newStringLength;

                // recompute cache
                this.cacheConnections();

                return;
            }

            // when stopped dragging
            // remove its fixed attribute if it did not have one
            if (!this.wasBodyFixed) {
                this.fixed = this.fixed.filter(body => body !== this.draggedBody);
            }
            this.draggedBody = null;
        }

        handleClick(position: Vec2) {
            // select body
            const body = this.bodies.findIndex((a) => {
                return Plane.VecDist(position, a) < this.options.bodyRadius * 2;
            });
            if (body == -1) {
                return;
            }

            // toggle the fix on the body
            if (this.fixed.includes(body)) {
                this.fixed = this.fixed.filter(b => b !== body);
            } else {
                this.fixed.push(body);
            }
        }


        /**
         * Computes array and the connectionLookup dictionary
         * @private
         */
        private cacheConnections() {
            // then cache the connection lookups
            let connectionLookup = [];
            for (let i = 0; i < this.bodies.length; ++i) {
                const lookup = [];
                for (let j = 0; j < this.connections.length; ++j) {
                    const [p1, p2] = this.connections[j];
                    if (p1 === i) {
                        lookup.push([p2, j]);
                    }
                    if (p2 === i) {
                        lookup.push([p1, j]);
                    }
                }
                connectionLookup.push(lookup);
            }
            this.connectionLookup = connectionLookup;
        }

        private findBody(position: Vec2): number {
            return this.bodies.findIndex((a) => {
                return Plane.VecDist(position, a) < this.options.bodyRadius * 2;
            });
        }

        start(parent: ICanvas, ctx: CanvasRenderingContext2D) {
            // first compute the equilibrium length of the strings
            let stringEquilibriumLengths = [];
            for (const connection of this.connections) {
                const p1 = this.bodies[connection[0]];
                const p2 = this.bodies[connection[1]];

                stringEquilibriumLengths.push(Plane.VecDist(p1, p2));
            }

            this.stringEquilibriumLengths = stringEquilibriumLengths;

            this.cacheConnections();

            // handle the interactivity
            if (this.options.interactive) {
                this.focusHandler = new DragHandler(parent.inputs.drag);
                this.focusHandler.register(this.handleDragStart, this.handleDragDuring, this.handleDragEnd);
                this.clickHandler = new ClickHandler(parent.inputs.click);
                this.clickHandler.register(this.handleClick);
            }
        }

        update(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            const {elasticity, gravity, dampening} = this.options;

            // randomize order to improve stability
            // https://stackoverflow.com/a/46545530/9341734
            const order = this.bodies
                .map((_, i) => ({i, sort: Math.random()}))
                .sort((a, b) => a.sort - b.sort)
                .map(({i}) => i);


            // calculate all the forces on none fixed points
            for (const i of order) {
                const body = this.bodies[i];

                // skip if the body is fixed
                if (this.fixed.includes(i)) {
                    continue;
                }

                // compute the force vector from all the connections to this node
                let totalForce = [0, 0] as Vec2;

                // add gravity
                totalForce = Plane.VecAddV(totalForce, [0, -gravity]);

                // all the connections
                let stringForce = [0, 0] as Vec2;
                const connections = this.connectionLookup[i];
                for (const [otherIndex, connectionIndex] of connections) {
                    const other = this.bodies[otherIndex];

                    // hooke's law, F = -k(x-x0)
                    const x0 = this.stringEquilibriumLengths[connectionIndex];
                    const x = Plane.VecSubV(body, other);
                    const length = Plane.VecMag(x);
                    const force = Plane.VecMulC(x, -elasticity * (length - x0) / length);
                    stringForce = Plane.VecAddV(stringForce, force);
                }


                // and damping to string forces, only when it is connected
                const vel = this.bodyVelocities[i];
                if (connections.length > 0) {
                    stringForce = Plane.VecAddV(
                        stringForce,
                        Plane.VecMulC(vel, -dampening)
                    );
                }

                totalForce = Plane.VecAddV(totalForce, stringForce);

                // apply force, verlet algorithm
                // https://en.wikipedia.org/wiki/Verlet_integration
                const halfVel = Plane.VecAddV(vel, Plane.VecMulC(totalForce, dt / 2));
                const newPos = Plane.VecAddV(
                    body,
                    Plane.VecMulC(halfVel, dt)
                );
                const newVel = Plane.VecAddV(
                    halfVel,
                    Plane.VecMulC(totalForce, dt / 2)
                );

                this.bodies[i] = newPos;
                this.bodyVelocities[i] = newVel;
            }


            // change cursor, this might not need to be this fast
            if (this.startDrag == null) {
                const position = parent.inputs.cursor.value();
                if (position !== null) {
                    const body = this.findBody(position);
                    if (body == -1) {
                        parent.cursor.changeStyle(CursorStyle.DEFAULT);
                    } else {
                        parent.cursor.changeStyle(CursorStyle.POINTER);
                    }
                }
            }
        }

        stop(parent: ICanvas, ctx: CanvasRenderingContext2D) {
            if (this.options.interactive) {
                this.focusHandler.remove();
                this.clickHandler.remove();
            }
        }
    }
}

export namespace Electricity {

    import HasPotential = Fields.HasPotential;
    import HasStrength = Fields.HasStrength;

    /**
     *  A singular charge
     */
    export class Charge extends TDBaseObject implements HasPotential, HasStrength {
        DEFAULT_BINDINGS = {
            k: Binding.constant(1),
            charge: Binding.constant(1),
            radius: Binding.constant(0.15)
        }

        constructor(
            {
                p0,
                v0,
                bindings
            }: {
                p0: Vec2,
                v0: Vec2,
                bindings
            }
        ) {
            super({
                pos: p0,
                vel: v0,
                bindings
            });
        }


        render(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
            const {pos} = this;
            const {radius} = this.parameters;

            Primitives.drawCircle(ctx, parent.pcTodc(pos as Vec2) as Vec2, parent.psTods(radius), '#000');
        }

        differential(t: number, p: VecN, v: VecN): VecN {
            return [0, 0];
        }

        potential(pos: Vec2): number {
            const {k, charge} = this.parameters;
            const distance = Math.sqrt((this.pos[0] - pos[0]) ** 2 + (this.pos[1] - pos[1]) ** 2);
            return k * charge / distance;
        }

        charge(): number {
            return this.parameters.charge > 0 ? 1 : -1;
        }

        strength(pos: Vec2): Vec2 {
            const {k, charge} = this.parameters;
            const r = Plane.VecSubV(pos, this.pos as Vec2);
            return Plane.VecMulC(r, k * charge / Plane.VecMag(r) ** 3);
        }
    }
}

