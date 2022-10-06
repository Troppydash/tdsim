import {ICanvas, TDCanvas} from "../../canvas/canvas";
import {Complex, Pair, Range, Vec2} from "../../computation/vector";
import {BaseListElements, BindableBase, BindableBindings} from "../objects/fundamental";
import {SpaceTimeSolvers} from "../../computation/diffeq";


export namespace Graphing {
    type Graphable = Pair<number>[];
    export type BaseGrapherConstructor = ConstructorParameters<typeof BaseGrapher>;

    export interface GrapherAttr extends BindableBindings {
        xrange: Vec2;
        yrange: Vec2 | null;
        bordered: boolean;
        axis: boolean;
        color: string | string[];
        skip: number;
    }

    export const BASEGRAPHER_DEFAULT: GrapherAttr = {
        xrange: [-1, 1],
        yrange: [-1, 1],
        bordered: true,
        axis: true,
        color: '#000',
        skip: 4
    };


    /**
     * Base Graphing class that graphs a set of points
     */
    export class BaseGrapher extends BindableBase {
        DEFAULT_BINDINGS: GrapherAttr = BASEGRAPHER_DEFAULT;

        // Location and Size of Graph
        protected location: Vec2;
        protected size: Vec2;
        data: Graphable[];

        // Have the data been sorted
        private dataSortations: boolean[];

        constructor(
            {
                location, size,
                bindings = {}
            }: {
                location: Vec2,
                size: Vec2,
                bindings: Partial<GrapherAttr>
            }
        ) {
            super({bindings});

            this.location = location;
            this.size = size;

            this.data = [[]];
            this.dataSortations = [false];
        }

        // Set the data at the index
        setData(data: Graphable, index: number = 0, sorted: boolean = false) {
            this.data[index] = data;
            this.dataSortations[index] = sorted;
        }

        // Add to the data at the index
        addData(data: Pair<number>, index: number = 0) {
            if (this.data[index] === undefined) {
                console.warn(`failed to add data to the ${index} index, length(data)=${this.data.length}`);
                return;
            }
            this.data[index].push(data);
        }

        // Clearing the data
        clearData() {
            this.data = [[]];
        }

        // Sort the data at the ith index
        sortRenderableData(i: number, xrange): [Graphable, boolean] {
            if (this.dataSortations[i]) {
                return [this.data[i], true];
            }

            const sortedData = this.data[i].sort((a, b) => a[0] - b[0]);

            // get rendered data
            let foundFirst = false;
            const rendered = [];
            for (const [x, y] of sortedData) {
                if (x >= xrange[0] && x <= xrange[1]) {
                    foundFirst = true;
                    rendered.push([x, y]);
                } else if (foundFirst) {
                    // break after first point outside range, because it is sorted
                    break;
                }
            }

            return [rendered, false];
        }

        // Render the data
        renderData(data: Graphable, {xrange, yrange, skip, parent, ctx}, color: string) {
            const {location, size} = this;

            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;

            const xscale = size[0] / (xrange[1] - xrange[0]);
            const yscale = size[1] / (yrange[1] - yrange[0]);
            let lastypos = 0; // this is used so that no vertical line appears for discont functions
            const delta = 0.1;
            for (let i = 0; i < data.length; i++) {
                if (skip !== 0 && data.length - i > skip && i % skip !== 0)
                    continue;

                const [x, y] = data[i];
                const xpos = location[0] + (x - xrange[0]) * xscale;
                const ypos = location[1] + (y - yrange[0]) * yscale;
                if (
                    i === 0 || (y < yrange[0]
                        || y > yrange[1])
                        || Math.abs(lastypos - ypos) > Math.abs(yrange[1] - yrange[0]) * delta
                ) {
                    ctx.moveTo(...parent.pcTodc([xpos, ypos]));
                } else {
                    ctx.lineTo(...parent.pcTodc([xpos, ypos]));
                }
                lastypos = ypos;
            }
            ctx.stroke();

            return [xscale, yscale];
        }

        // Render the data
        render(parent, ctx, dt) {
            const {location, size} = this;
            let {xrange, yrange, color, skip, bordered, axis} = this.parameters;
            const [rendered, s1] = this.sortRenderableData(0, xrange);
            if (s1) {
                this.dataSortations[0] = true;
                this.data[0] = rendered;
            }

            // compute yrange if null
            if (yrange === null) {
                let min = Infinity;
                let max = -Infinity;
                for (const [x, y] of rendered) {
                    if (y < min) {
                        min = y;
                    }
                    if (y > max) {
                        max = y;
                    }
                }
                yrange = [min, max];
            }

            const [xscale, yscale] = this.renderData(
                rendered,
                {xrange, yrange, skip, parent, ctx,},
                Array.isArray(color) ? color[0] : color
            );

            // render
            for (let i = 1; i < this.data.length; ++i) {
                const [sorted, s2] = this.sortRenderableData(i, xrange);
                this.renderData(
                    sorted,
                    {xrange, yrange, skip, parent, ctx,},
                    Array.isArray(color) ? color[i] : color
                );
                if (s2) {
                    this.data[i] = sorted;
                    this.dataSortations[i] = true;
                }
            }

            ctx.strokeStyle = '#0f0';
            ctx.lineWidth = 1;
            if (bordered) {
                // draw box
                ctx.strokeRect(...parent.pcTodc([location[0], location[1] + size[1]]), parent.psTods(size[0]), parent.psTods(size[1]));
            }

            ctx.strokeStyle = '#851322';
            if (axis) {
                // draw axis
                ctx.beginPath();
                const xaxis = [
                    [location[0], location[1] - yrange[0] * yscale],
                    [location[0] + size[0], location[1] - yrange[0] * yscale]
                ];
                const yaxis = [
                    [location[0] - xrange[0] * xscale, location[1]],
                    [location[0] - xrange[0] * xscale, location[1] + size[1]]
                ];
                ctx.moveTo(...parent.pcTodc(xaxis[0]));
                ctx.lineTo(...parent.pcTodc(xaxis[1]));
                ctx.moveTo(...parent.pcTodc(yaxis[0]));
                ctx.lineTo(...parent.pcTodc(yaxis[1]));
                ctx.stroke();
            }
        }
    }

    type GraphableFunction = (x: number, p: { [key: string]: number }) => number | null;

    /**
     * Base function graphing that graphs a given function
     */
    export class FunctionGrapher extends BaseGrapher {
        protected fn: GraphableFunction;
        protected dx: number;

        constructor(fn: GraphableFunction, dx: number, ...args: BaseGrapherConstructor) {
            super(...args);

            this.fn = fn;
            this.dx = dx;
        }

        start(parent: TDCanvas, ctx: CanvasRenderingContext2D) {
            super.start(parent, ctx);

            const param = this.parameters;
            const {xrange} = param;
            // do the data
            for (let x = xrange[0]; x <= xrange[1]; x += this.dx) {
                const data = this.fn(x, param);
                if (data === null)
                    continue;
                this.addData([x, data]);
            }
        }

        render(parent, ctx, dt) {
            super.render(parent, ctx, dt);
        }
    }

    /**
     * Base function graphing with time dependence and space dependence
     */
    export class TimeFunctionGrapher extends BaseGrapher {
        protected fn: (t: number, x: number) => number;
        protected dx: number;

        constructor(fn: (t: number, x: number) => number, dx: number, ...args: BaseGrapherConstructor) {
            super(...args);

            this.fn = fn;
            this.dx = dx;
        }

        render(parent, ctx, dt) {
            super.render(parent, ctx, dt);
        }

        update(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
            const {xrange} = this.parameters;
            const t = parent.totalTime;

            const data = [];
            for (let x = xrange[0]; x <= xrange[1]; x += this.dx) {
                data.push([x, this.fn(t, x)]);
            }
            this.setData(data);
        }
    }

    /**
     * Base dynamic function graphing that is time dependent
     */
    export class ContinuousGrapher extends BaseGrapher {
        protected fn: () => number;
        private degree: number;

        constructor(fn: () => number, ...args: BaseGrapherConstructor) {
            super(...args);

            this.fn = fn;
            this.degree = 0;
        }

        update(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
            const {xrange} = this.parameters;
            const range = xrange[1] - xrange[0];

            const realTime = parent.totalTime - range * this.degree;

            // if overfill, remove all
            if (realTime > xrange[1]) {
                this.degree += 1;
                this.setData([]);
            }

            // add data
            this.addData([realTime, this.fn()]);
        }
    }
}

export namespace DynamicGraphs {
    import BaseGrapher = Graphing.BaseGrapher;
    import BASEGRAPHER_DEFAULT = Graphing.BASEGRAPHER_DEFAULT;
    import GrapherAttr = Graphing.GrapherAttr;
    import Maxwell1D = SpaceTimeSolvers.Maxwell1D;
    import BaseGrapherConstructor = Graphing.BaseGrapherConstructor;
    import ContinuousGrapher = Graphing.ContinuousGrapher;

    type Function = (x: number, p: object) => number;

    interface FunctionGrapherBindings extends GrapherAttr {
        fn: Function | null;
        dx: number;
    }

    export class FunctionGrapher extends BaseGrapher {
        DEFAULT_BINDINGS: FunctionGrapherBindings = {
            ...BASEGRAPHER_DEFAULT,
            fn: null,
            dx: 0.01,
            skip: 0
        }


        constructor(location: Vec2, size: Vec2,
                    bindings: Partial<FunctionGrapherBindings>) {
            super({location, size, bindings});
        }

        computePoints() {
            this.clearData();
            const param = this.parameters;
            const {xrange, fn, dx} = param;

            // error, no data
            if (fn === null) {
                return;
            }

            // do the data
            for (let x = xrange[0]; x <= xrange[1]; x += dx) {
                const data = fn(x, param);
                if (data === null)
                    continue;
                this.addData([x, data]);
            }

        }

        start(parent: TDCanvas, ctx: CanvasRenderingContext2D) {
            super.start(parent, ctx);


            this.computePoints()
            parent.wakeUp(1);  // allow for computing

            this.registerBindings(parent);
        }

        registerBindings(canvas: TDCanvas) {
            // bind for change listening
            for (const value of Object.values(this.bindings)) {
                if (value.listen) {
                    value.listen('change', () => {
                        this.computePoints();
                        canvas.wakeUp(1);
                    });
                }
            }
        }
    }


    export class SpaceTimeGrapher extends BaseGrapher {
        protected diffEq: SpaceTimeSolvers.FirstOrderEq;
        protected solver: SpaceTimeSolvers.IFirstOrderSolver = SpaceTimeSolvers.FirstOrderSolver;
        protected magnitude: number;

        private points: Complex[];
        private range: Range;

        constructor(
            {
                location,
                size,
                bindings = {},
                type = 'real',

                diffEq,
                range = new Range(0, 10),
                points,
                magnitude = 5
            }: {
                location: Vec2,
                size: Vec2,
                diffEq: SpaceTimeSolvers.FirstOrderEq,
                bindings,
                type: 'real' | 'imag' | 'both',
                range: Range,
                points: Complex[],
                magnitude: number
            }
        ) {
            super({location, size, bindings});

            this.diffEq = diffEq;
            this.range = range;
            this.points = points;
            this.magnitude = magnitude;
        }

        computePoints(dt: number, t: number) {
            // toggle between forward and reverse sweep
            const dx = this.range.step;
            const maxDT = dx / this.magnitude;

            while (dt > maxDT) {
                this.points = this.solver(this.diffEq, this.points, this.range, maxDT);
                dt -= maxDT;
            }

            this.points = this.solver(this.diffEq, this.points, this.range, dt);
        }

        update(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            super.update(parent, ctx, dt);

            // compute points
            this.computePoints(dt, parent.totalTime);

            // create data
            let data = [];
            for (const [x, i] of this.range) {
                data.push([x, this.points[i][0]]);
            }
            this.setData(data);

        }
    }


    type SourceFunction = (t: number) => number;

    export class MaxwellGrapher extends BaseGrapher {
        protected range: Range;

        private points: number[];
        private Bfield: number[] | null;

        private dt: number;
        private sources: Pair<number, SourceFunction>[] = [];

        private lastE: [number, number];

        constructor(
            {
                location,
                size,
                bindings = {},
                range = new Range(0, 10),
                points,
                bfield = null,
                dt = 1 / 120
            }: {
                location: Vec2,
                size: Vec2,
                diffEq: SpaceTimeSolvers.FirstOrderEq,
                bindings,
                range: Range,
                points: number[],
                bfield: number[],
                dt: number
            }
        ) {
            super({location, size, bindings});

            this.range = range;
            this.points = points;
            this.Bfield = bfield;
            this.lastE = [0, 0];

            this.dt = dt;
        }

        addSource(at: number, source: SourceFunction) {
            this.sources.push([at, source]);
        }

        start(parent: TDCanvas, ctx: CanvasRenderingContext2D) {
            super.start(parent, ctx);

            // compute first Bfield
            if (this.Bfield === null) {
                this.Bfield = this.range.ofConstant(0);
            }
        }

        computePoints(dt: number, t: number) {
            const sources = this.sources.map(source => [
                source[0],
                source[1](t)
            ] as Pair<number>)
            // function modify this.points
            const newLastE = [this.points[1], this.points[this.points.length - 2]] as [number, number];
            Maxwell1D(this.points, this.Bfield, this.range, this.dt, sources, false, this.lastE[0], this.lastE[1]);
            this.lastE = newLastE;
        }

        update(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
            super.update(parent, ctx, dt);

            // compute points
            this.computePoints(dt, parent.totalTime);


            // create data
            let data = [];
            let bfield = [];
            // performance
            // for (const [x, i] of this.range.iter) {
            let i = 0, len = this.range.size;
            while (i < len) {
                data.push([this.range.values[i], this.points[i]]);
                bfield.push([this.range.values[i], this.Bfield[i]]);
                ++i;
            }
            this.setData(data, undefined, true);
            this.setData(bfield, 1, true);
        }
    }


    export interface EnergeticSystems {
        kineticEnergy(): number;

        potentialEnergy(): number;
    }

    export class EnergeticSystemGrapher extends BaseListElements {
        protected system: EnergeticSystems;

        constructor(system: EnergeticSystems, values: string[], colors: string[], ...args: BaseGrapherConstructor) {
            const elements = [];
            for (let i = 0; i < values.length; ++i) {
                const value = values[i];
                const color = colors[i];

                const modifiedArgs = [
                    {
                        ...args[0],
                        bindings: {
                            ...args[0].bindings,
                            color
                        }
                    }
                ] as BaseGrapherConstructor

                elements.push(
                    new ContinuousGrapher(
                        system[value].bind(system),
                        ...modifiedArgs
                    )
                );
            }

            super(elements);

            this.system = system;
        }
    }
}
