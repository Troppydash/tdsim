import {Vec2} from "../../computation/vector.js";


export class ImageDrawer {
    private colored: Uint8ClampedArray;


    constructor(
        public readonly size: Vec2,
        public readonly bitDepth: number = 4  // number of bytes for each pixel
    ) {
        this.colored = new Uint8ClampedArray(size[0] * size[1] * bitDepth);

    }

    public update() {

    }

    public draw(ctx: CanvasRenderingContext2D, location: Vec2, size: Vec2, ) {

        ctx.imageSmoothingEnabled = false;
    }

}
