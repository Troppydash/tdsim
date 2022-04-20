import {TDCanvas, TDElement} from "../../canvas/canvas";
import {Vec2} from "../../computation/vector";

type Pair<T> = [T, T];
type Graphable = Pair<number>[];

interface TDGrapherAttr {
    xrange: Vec2;
    yrange: Vec2 | null;
    bordered: boolean;
    axis: boolean;
    color: string;
}

export class TDGrapher extends TDElement {
    DefaultAttr: TDGrapherAttr = {
        xrange: [-1, 1],
        yrange: [-1, 1],
        bordered: true,
        axis: true,
        color: '#000'
    }

    protected attr: TDGrapherAttr;
    protected location: Vec2;
    protected size: Vec2;
    data: Graphable;

    constructor(location: Vec2, size: Vec2, data0: Graphable = [], attr: Partial<TDGrapherAttr> = {}) {
        super();

        this.attr = {...this.DefaultAttr, ...attr};


        this.location = location;
        this.size = size;
        this.data = data0;
    }

    setData(data: Graphable) {
        this.data = data;
    }

    addData(data: Pair<number>) {
        this.data.push(data);
    }

    render(parent, ctx, dt) {
        const {location, size} = this;
        let {xrange, yrange} = this.attr;
        // sort renderable data smallest to largest
        const sortedData = this.data.sort((a, b) => a[0] - b[0]);

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

        // render
        ctx.beginPath();
        ctx.strokeStyle = this.attr.color;
        ctx.lineWidth = 2;

        const xscale = size[0] / (xrange[1] - xrange[0]);
        const yscale = size[1] / (yrange[1] - yrange[0]);
        for (let i = 0; i < rendered.length; i++) {
            const [x, y] = rendered[i];
            const xpos = location[0] + (x - xrange[0]) * xscale;
            const ypos = location[1] + (y - yrange[0]) * yscale;
            if (i === 0 || (y < yrange[0] || y > yrange[1])) {
                ctx.moveTo(...parent.pcTodc([xpos, ypos]));
            } else {
                ctx.lineTo(...parent.pcTodc([xpos, ypos]));
            }
        }
        ctx.stroke();

        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 1;
        if (this.attr.bordered) {
            // draw box
            ctx.strokeRect(...parent.pcTodc([location[0], location[1] + size[1]]), parent.psTods(size[0]), parent.psTods(size[1]));
        }

        ctx.strokeStyle = '#851322';
        if (this.attr.axis) {
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


export class TDGraphFunction extends TDGrapher {
    protected fn: (x: number) => number;

    constructor(fn: (x: number) => number, dx: number, ...args: ConstructorParameters<typeof TDGrapher>) {
        super(...args);

        this.fn = fn;
        // do the data
        for (let x = this.attr.xrange[0]; x <= this.attr.xrange[1]; x += dx) {
            this.addData([x, this.fn(x)]);
        }
    }

    render(parent, ctx, dt) {
        super.render(parent, ctx, dt);
    }
}

export class TDGraphFunctionWTime extends TDGrapher {
    protected fn: (t: number, x: number) => number;
    protected dx: number;

    constructor(fn: (t: number, x: number) => number, dx: number, ...args: ConstructorParameters<typeof TDGrapher>) {
        super(...args);

        this.fn = fn;
        this.dx = dx;
    }

    render(parent, ctx, dt) {
        super.render(parent, ctx, dt);
    }

    update(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
        const t = parent.totalTime;

        const data = [];
        for (let x = this.attr.xrange[0]; x <= this.attr.xrange[1]; x += this.dx) {
            data.push([x, this.fn(t, x)]);
        }
        this.setData(data);
    }
}

export class TDContinuousGrapher extends TDGrapher {
    protected fn: () => number;

    constructor(fn: () => number, ...args: ConstructorParameters<typeof TDGrapher>) {
        super(...args);

        this.fn = fn;
    }

    update(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {

        // if overfill, remove all
        if (parent.totalTime > this.attr.xrange[1]) {
            const oldEnd = this.attr.xrange[1];
            this.attr.xrange[1] = parent.totalTime + (this.attr.xrange[1] - this.attr.xrange[0]);
            this.attr.xrange[0] = oldEnd;
            this.setData([]);
        }

        // add data
        this.addData([parent.totalTime, this.fn()]);
    }
}
