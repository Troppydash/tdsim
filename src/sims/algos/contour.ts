// IMPLEMENTS THE CONTOUR DRAWING OF A SCALAR MAP ALGORITHM

// MARCHING SQUARES or BRUTE-FORCE BILINEAR SCALING
import {Area, Line, Vec2} from "../../computation/vector.js";
import {ICanvas} from "../../canvas/canvas.js";

export namespace ContourMethods {
    export type Method<T> = {
        computer: Computer<T>,
        drawer: Drawer<T>
    };

    type Computer<Data> = (
        area: Area,
        potential: (pos: Vec2) => number,
        offset?: number,
        error?: number | null,
    ) => Data;

    type Drawer<Data> = (
        data: Data,
        ctx: CanvasRenderingContext2D,
        canvas: ICanvas
    ) => void;


    // MarchingSquareMap, start from top left, always positive, left to right then up to down
    // TODO: TOO LAZY TO MAKE THIS ROTATIONALLY INVARIANT
    const TOP_LEFT = [0, 0.5, 0.5, 0];
    const TOP_RIGHT = [0.5, 0, 1, 0.5];
    const BOTTOM_LEFT = [0, 0.5, 0.5, 1];
    const BOTTOM_RIGHT = [0.5, 1, 1, 0.5];
    const VERT = [0.5, 0, 0.5, 1];
    const HORI = [0, 0.5, 1, 0.5];
    const CONTOUR_MARCHING_SQUARES = {
        0b0000: [],
        0b1111: [],

        0b1000: [TOP_LEFT],
        0b0100: [TOP_RIGHT],
        0b0010: [BOTTOM_LEFT],
        0b0001: [BOTTOM_RIGHT],

        0b1100: [HORI],
        0b1010: [VERT],
        0b1001: [TOP_RIGHT, BOTTOM_LEFT],
        0b0110: [TOP_LEFT, BOTTOM_RIGHT],
        0b0101: [VERT],
        0b0011: [HORI],

        0b1110: [BOTTOM_RIGHT],
        0b1101: [BOTTOM_LEFT],
        0b1011: [TOP_RIGHT],
        0b0111: [TOP_LEFT]
    };

    /**
     * Implements the 2D marching squares algorithm
     * @param area The Contour Area
     * @param potential The potential function, draw when
     * @param offset
     * @param error The error boundary, known as epsilon
     * @constructor
     */
    function ContourMarchingSquaresComputer(
        area: {
            xRange: Vec2
            xStep: number,
            yRange: Vec2,
            yStep: number,
        },
        potential: (pos: Vec2) => number,
        offset: number = 0,
        error: number | null = 0,
    ): Line[] {
        let output = [];

        // caching
        let row = [];
        // fill first row
        for (let x = area.xRange[0]; x <= area.xRange[1]; x += area.xStep) {
            row.push(potential([x, area.yRange[1]]) > offset ? 1 : 0);
        }


        // loop through all coords
        for (let y = area.yRange[1] - area.yStep; y >= area.yRange[0]; y -= area.yStep) {
            let prev = area.xRange[0];
            let prevPotential = potential([prev, y]) > offset ? 1 : 0;
            let counter = 1;
            for (let x = area.xRange[0] + area.xStep; x <= area.xRange[1]; x += area.xStep) {
                const currentPotential = potential([x, y]) > offset ? 1 : 0;
                const upPrevPotential = row[counter - 1];
                const upCurrentPotential = row[counter];
                // get square value
                const value = (upPrevPotential << 3) + (upCurrentPotential << 2) + (prevPotential << 1) + currentPotential;

                const [xs, ys] = [area.xStep,  area.yStep];
                const [tx, ty] = [x - area.xStep, y+area.yStep];
                const lines = CONTOUR_MARCHING_SQUARES[value].map(([x1, y1, x2, y2]) => ([
                    tx + x1 * xs,
                    ty - y1 * ys,
                    tx + x2 * xs,
                    ty - y2 * ys
                ]));

                output.push(...lines);

                row[counter - 1] = prevPotential;
                prevPotential = currentPotential;
                counter += 1;
            }
            row[counter-1] = prevPotential;
        }

        return output;
    }


    function ContourMarchingSquaresDrawer(
        data: Line[],
        ctx: CanvasRenderingContext2D,
        canvas: ICanvas
    ) {
        ctx.beginPath();

        for (const line of data) {
            const [x1, y1, x2, y2] = line;
            ctx.moveTo(...canvas.pcTodc([x1, y1]));
            ctx.lineTo(...canvas.pcTodc([x2, y2]));
        }

        ctx.stroke();
    }

    export const ContourMarchingSquare = {
        computer: ContourMarchingSquaresComputer,
        drawer: ContourMarchingSquaresDrawer
    };
}
