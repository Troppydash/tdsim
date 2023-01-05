import {DynamicGraphs, Graphing} from "../algos/graphing.js";
import {IBaseObject, TDBaseObject, BaseListElements, Traceable} from "./fundamental.js";
import {Binding} from "../../canvas/binding.js";
import {Area, Plane, Vec2, Vec3, VecN, Volume, VSpace} from "../../computation/vector.js";
import {ICanvas, TDCanvas} from "../../canvas/canvas.js";
import {Primitives} from "../../canvas/drawers/mechanics.js";
import drawCircle = Primitives.drawCircle;
import {ContourMethods} from "../algos/contour.js";
import {PhysicsSolvers} from "../../computation/diffeq.js";
import {TDElement} from "../../canvas/drawers/basics.js";
import {TDWorker} from "../../canvas/worker.js";

const G = 5e-3;
const Mass = 1e4;

export namespace Mechanics {
    import EnergeticSystems = DynamicGraphs.EnergeticSystems;

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

            drawCircle(ctx, parent.pcTodc(Mpos as Vec2) as any, parent.psTods(Mr), '#000000');
            drawCircle(ctx, parent.pcTodc(mpos as Vec2) as any, parent.psTods(mr), '#ff0000');
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

            drawCircle(ctx, parent.pcTodc(pos as Vec2) as Vec2, parent.psTods(radius), '#000');
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
            const R = x => 0.3 + 0.7 * Math.sin(10*(x-0.75)) / (10 * (x-0.75));
            const G = x => Math.exp(-(((x - 0.45) / 0.3) ** 2));
            const B = x => (Math.exp(-(((x-0.25)/0.15) ** 2)) + 0.25 * Math.exp(-(((x-0.65)/0.25)**2))) / 1.0099;
            return intensityCMap(value, R, G, B);
        }

        export const DarkBlue = value => {
            const R = x => 0;
            const G = x => x;
            const B = x => x;
            return intensityCMap(value, R, G, B);
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
                    this.colored[i+1] = color[1];
                    this.colored[i+2] = color[2];
                    this.colored[i+3] = 255;  // 255 for opaque

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

}


