import {Plane, Vec2} from "../../computation/vector.js";
import {ICanvas} from "../canvas.js";

/**
 * Primitives contains
 */
export namespace Primitives {
    interface SpringAttr {
        A: number; // Amplitude
        W: number; // Windings
        C: number; // Tightness
    }

    export function ComputeSpring(
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

    export function DrawPoints(parent: ICanvas, ctx: CanvasRenderingContext2D, points: Vec2[]) {
        ctx.beginPath();
        ctx.moveTo(...parent.pcTodc(points[0]));
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(...parent.pcTodc(points[i]));
        }
        ctx.stroke();
    }


    export function drawSpring(
        ctx: CanvasRenderingContext2D,
        attr: SpringAttr,
        start: Vec2, end: Vec2
    ) {
        return ComputeSpring(attr, start, end);
    }


    export function drawHollowCircle(
        ctx: CanvasRenderingContext2D,
        at: Vec2,
        radius: number,
        thickness: number,
        color: string
    ) {
        ctx.beginPath();
        ctx.arc(at[0], at[1], radius, 0, 2 * Math.PI);
        ctx.fillStyle = "transparent";
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness
        ctx.stroke();
    }

    export function drawCircle(
        ctx: CanvasRenderingContext2D,
        at: Vec2,
        radius: number,
        color: string
    ) {
        ctx.beginPath();
        ctx.arc(...at, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
    }

    export function DrawHollowCircle(
        parent: ICanvas,
        ctx: CanvasRenderingContext2D,
        at: Vec2,
        radius: number,
        thickness: number,
        color: string,
    ) {
        drawHollowCircle(ctx, parent.localToWorld(at), parent.localToWorldScalar(radius), parent.localToWorldScalar(thickness), color);
    }

    export function DrawCircle(
        parent: ICanvas, ctx: CanvasRenderingContext2D,
        at: Vec2,
        radius: number,
        color: string = '#000'
    ) {
        ctx.fillStyle = color;

        ctx.beginPath();
        ctx.arc(...parent.localToWorld(at), parent.localToWorldScalar(radius), 0, 2 * Math.PI);
        ctx.fill();
    }

    export function DrawLine(
        parent: ICanvas,
        ctx: CanvasRenderingContext2D,
        from: Vec2,
        to: Vec2,
        lineWidth: number,
        color: string
    ) {
        ctx.beginPath();
        ctx.moveTo(...parent.localToWorld(from));
        ctx.lineTo(...parent.localToWorld(to));

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }

    export function DrawDashedLine(
        parent: ICanvas,
        ctx: CanvasRenderingContext2D,
        from: Vec2,
        to: Vec2,
        lineWidth: number,
        color: string,
        segments: Vec2,
    )  {
        ctx.beginPath();
        ctx.setLineDash(segments.map(parent.localToWorldScalar.bind(parent)));
        ctx.moveTo(...parent.localToWorld(from));
        ctx.lineTo(...parent.localToWorld(to));

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        ctx.setLineDash([]);
    }


    export function DrawColoredLine(
        parent: ICanvas,
        ctx: CanvasRenderingContext2D,
        points: Vec2[],
        color: string[],
        lineWidth: number,
    ) {
        ctx.lineWidth = parent.localToWorldScalar(lineWidth);

        ctx.beginPath();
        ctx.moveTo(...parent.localToWorld(points[0]));
        for (const [index, point] of points.slice(1).entries()) {
            ctx.strokeStyle = color[index];
            ctx.lineTo(...parent.localToWorld(point));
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(...parent.localToWorld(point))
        }

        ctx.stroke();
    }

    export function drawVector(
        ctx: CanvasRenderingContext2D,
        start: Vec2,
        end: Vec2,
        lineWidth: number,
        headWidth: number,
        color: string
    ) {
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;

        // find the vector from end to start, scaled to headWidth
        const dir = Plane.VecReMag(Plane.VecSubV(start, end), headWidth);
        const base = Plane.VecAddV(end, dir);

        // draw arrow from start to end
        ctx.beginPath();
        ctx.moveTo(...start);
        ctx.lineTo(...base);
        ctx.stroke();

        const normal = Plane.VecMulC(Plane.VecRotate(0.5 * Math.PI, dir), 1/2);
        const left = Plane.VecAddV(base, normal);
        const right = Plane.VecSubV(base, normal);

        // draw arrow head
        ctx.moveTo(...end);
        ctx.lineTo(...left);
        ctx.lineTo(...right);
        ctx.lineTo(...end);
        ctx.fill();
    }

    export function DrawVector(
        parent: ICanvas,
        ctx: CanvasRenderingContext2D,
        start: Vec2,
        end: Vec2,
        lineWidth: number,
        headWidth: number,
        color: string
    ) {
        drawVector(
            ctx,
            parent.localToWorld(start),
            parent.localToWorld(end),
            parent.localToWorldScalar(lineWidth),
            parent.localToWorldScalar(headWidth),
            color
        );
    }

    export function DrawVectorMaths(
        parent: ICanvas,
        ctx: CanvasRenderingContext2D,
        origin: Vec2,
        direction: Vec2,
        lineWidth: number,
        headProportion: number,
        color: string
    ) {
        const headWidth = Plane.VecMag(direction) * headProportion;

        drawVector(
            ctx,
            parent.localToWorld(origin),
            parent.localToWorld(Plane.VecAddV(origin, direction)),
            parent.localToWorldScalar(lineWidth),
            parent.localToWorldScalar(headWidth),
            color
        );
    }
}
