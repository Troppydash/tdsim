import {Plane, Vec2} from "../../computation/vector";

// Primitives
export namespace Primitives {
    interface SpringAttr {
        A: number; // Amplitude
        W: number; // Windings
        C: number; // Tightness
    }
    export function drawSpring(
        ctx: CanvasRenderingContext2D,
        attr: SpringAttr,
        start: Vec2, end: Vec2
    ) {
        const { A, W, C } = attr;
        const towards = Plane.VecSubV(end, start);
        const d = Plane.VecMag(towards);
        const ang = Math.atan2(towards[1], towards[0]);

        // compute points
        let points = [];
        for (let t = 0; t < 1; t += 0.001) {
            const y = A * Math.sin(2 * Math.PI * (W + 0.5) * t);
            const x = d * (t - C * Math.cos(2 * Math.PI * (W + 0.5) * t) + C) / (2 * C + 1);
            points.push([x, y]);
        }

        // console.log(points)

        // rotate & translate all
        points = points.map(point => {
            return Plane.VecRotate(ang, point);
        }).map(point => {
            return Plane.VecAddV(point, start);
        });

        // draw
        return points;
    }

}
