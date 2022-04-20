export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Scalar = number;

export type Mat2 = [
    number, number,
    number, number
];

export namespace Plane {

    export function VecMag(a: Vec2): Scalar {
        return Math.sqrt(a[0] * a[0] + a[1] * a[1])
    }

    export function VecAddV(a: Vec2, b: Vec2): Vec2 {
        return [a[0] + b[0], a[1] + b[1]];
    }

    export function VecAddC(a: Vec2, b: Scalar): Vec2 {
        return [a[0] + b, a[1] + b];
    }

    export function VecMulC(a: Vec2, b: Scalar): Vec2 {
        return [a[0] * b, a[1] * b];
    }

    export function MatDet(mat: Mat2): Scalar {
        return mat[0] * mat[3] - mat[1] * mat[2];
    }

    export function MatInv(mat: Mat2): Mat2 {
        const det = MatDet(mat);
        const [a, b, c, d] = mat;
        return [
            d / det, -b / det, -c / det, a / det
        ];
    }

    export function MatVec(mat: Mat2, vec: Vec2): Vec2 {
        const [a, b, c, d] = mat;

        return [
            a * vec[0] + b * vec[1],
            c * vec[0] + d * vec[1]
        ];
    }

    export function MatRotate(rad: Scalar): Mat2 {
        return [
            Math.cos(rad), -Math.sin(rad),
            Math.sin(rad), Math.cos(rad)
        ];
    }

    export function VecSubV(a: Vec2, b: Vec2): Vec2 {
        return [a[0] - b[0], a[1] - b[1]];
    }

    export function VecRotate(rad: Scalar, vec: Vec2): Vec2 {
        return MatVec(MatRotate(rad), vec);
    }

    export function VecNormalize(vec: Vec2): Vec2 {
        const mag = VecMag(vec);
        return [vec[0] / mag, vec[1] / mag];
    }

    export function VecNormal(vec: Vec2): Vec2 {
        return VecRotate(0.5 * Math.PI, VecNormalize(vec));
    }

    export function VecDot(a: Vec2, b: Vec2): Scalar {
        return a[0] * b[0] + a[1] * b[1];
    }

    export function VecInv(a: Vec2): Vec2 {
        return [-a[0], -a[1]];
    }

    export function VecReMag(a: Vec2, m: Scalar): Vec2 {
        const norm = VecNormalize(a);
        return VecMulC(norm, m);
    }

    export function VecDist(a: Vec2, b: Vec2): Scalar {
        return VecMag(VecSubV(b, a));
    }

// intersection code, i have no idea how it works
// https://stackoverflow.com/questions/9043805/test-if-two-lines-intersect-javascript-function
    export function Intersect(from1: Vec2, to1: Vec2, from2: Vec2, to2: Vec2): Vec2 | null {
        const dX = to1[0] - from1[0];
        const dY = to1[1] - from1[1];

        const determinant = dX * (to2[1] - from2[1]) - (to2[0] - from2[0]) * dY;
        if (determinant === 0) return null; // parallel lines

        const lambda = ((to2[1] - from2[1]) * (to2[0] - from1[0]) + (from2[0] - to2[0]) * (to2[1] - from1[1])) / determinant;
        const gamma = ((from1[1] - to1[1]) * (to2[0] - from1[0]) + dX * (to2[1] - from1[1])) / determinant;

        // check if there is an intersection
        if (!(0 <= lambda && lambda <= 1) || !(0 <= gamma && gamma <= 1)) return null;

        return [
            from1[0] + lambda * dX,
            from1[1] + lambda * dY,
        ];
    }
}

export namespace Volume {
    export function VecAddV(a: Vec3, b: Vec3): Vec3 {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    }

    export function VecMulC(a: Vec3, b: Scalar): Vec3 {
        return [a[0] * b, a[1] * b, a[2] * b];
    }


    export function VecDot3(a: Vec3, b: Vec3): Scalar {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    export function VecAddV3(a: Vec3, b: Vec3): Vec3 {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    }

    export function VecSubV3(a: Vec3, b: Vec3): Vec3 {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }

    export function VecMulC3(a: Vec3, c: Scalar): Vec3 {
        return [a[0] * c, a[1] * c, a[2] * c];
    }

    export function VecMag3(a: Vec3): Scalar {
        return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    }

    export function VecNorm3(a: Vec3): Vec3 {
        const mag = VecMag3(a);
        return [a[0] / mag, a[1] / mag, a[2] / mag];
    }

    export function VecNeg3(a: Vec3): Vec3 {
        return [-a[0], -a[1], -a[2]];
    }

    export function VecRotate3(a: Vec3, degrees: Scalar): Vec3 {
        const rad = degrees * Math.PI / 180;
        const [x, y, z] = a;
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return [
            x * c + y * s,
            -x * s + y * c,
            z
        ];
    }

    export function VecScale3(a: Vec3, c: Scalar): Vec3 {
        if (VecMag3(a) < 0.001) return [0, 0, 0];
        return VecMulC3(VecNorm3(a), c);
    }
}
