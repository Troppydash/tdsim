import {Vec2} from "../../computation/vector.js";
import {ICanvas, IElement} from "../canvas.js";

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

export class TDText extends TDElement {
    constructor(
        public text: string,
        protected location: Vec2,
        protected color: string = '#000000',
        protected font: string = '1.5rem sans',
    ) {
        super();
    }

    render(parent: ICanvas, ctx: CanvasRenderingContext2D, dt: number) {
        ctx.font = this.font;
        ctx.fillStyle = this.color;

        ctx.fillText(this.text, ...parent.localToWorld(this.location));
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
