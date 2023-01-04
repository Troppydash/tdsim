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
