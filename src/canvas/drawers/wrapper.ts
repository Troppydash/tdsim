import {Plane, Vec2} from "../../computation/vector.js";
import {Fields} from "../../sims/objects/physical.js";
import Color = Fields.ColorMap.Color;
import {ICanvas} from "../canvas.js";

/**
 * ImageDrawer provides an API for using ImageBitmap
 *
 * @example
 * const drawer = new ImageDrawer([10, 10]);
 * drawer.update([...]);
 * drawer.render(parent, ctx, [0, 0], [4, 4]);
 */
export class ImageDrawer {
    private colored: Uint8ClampedArray;
    private bitmap: ImageBitmap;

    constructor(
        public readonly density: Vec2,
    ) {
        this.colored = new Uint8ClampedArray(density[0] * density[1] * 4);
        this.bitmap = null;
    }

    /**
     * Update the pixels of the image
     */
    public update(colors: Color[]) {
        const {density} = this;

        // assert that colors.length = size[0] * size[1]
        if (colors.length !== density[0] * density[1]) {
            console.error("ImageDrawer: failed to update colors, dimensions not matching");
            return;
        }

        for (const [index, color] of colors.entries()) {
            this.colored[4 * index] = color[0];
            this.colored[4 * index + 1] = color[1];
            this.colored[4 * index + 2] = color[2];
            this.colored[4 * index + 3] = 255;  // full opacity
        }

        // generate bitmap
        const imageData = new ImageData(this.colored, density[0], density[1])
        createImageBitmap(imageData)
            .then(bitmap => {
                this.bitmap = bitmap;
            });
    }

    /**
     * Draw the image to the canvas
     */
    public draw(parent: ICanvas, ctx: CanvasRenderingContext2D, location: Vec2, size: Vec2,) {
        if (this.bitmap == null) {
            return;
        }

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

}
