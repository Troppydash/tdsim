// IMPLEMENTS THE CONTOUR DRAWING OF A SCALAR MAP ALGORITHM

// MARCHING SQUARES or BRUTE-FORCE BILINEAR SCALING
import {Vec2} from "../../computation/vector";

export namespace ContourMethods {

    type Computer = (
        area: {
            xRange: Vec2
            xStep: number,
            yRange: Vec2,
            yStep: number,
        },
        potential: (pos: Vec2) => number,
        error: number | null,
        // TODO: Add offset param if not performant
    ) => any;

    type Drawer = (
        data: any,
        canvas: CanvasRenderingContext2D
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
     * @param error The error boundary, known as epsilon
     * @constructor
     */
    export function ContourMarchingSquares(
        area: {
            xRange: Vec2
            xStep: number,
            yRange: Vec2,
            yStep: number,
        },
        potential: (pos: Vec2) => number,
        error: number | null = 0,
    ): Vec2[] {


        return [];
    }

}
