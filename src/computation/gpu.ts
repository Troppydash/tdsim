import {Mat} from "./vector.js";

export interface Accelerator {
    matrix4Multiply(mat1: Mat, mat2: Mat);
}

export class GPUAccelerator implements GPUAccelerator {
    constructor(
        private gpu
    ) {
    }

    public matrix4Multiply(mat1: Mat<4, 4>, mat2: Mat<4, 4>) {
        return (
            this.gpu.createKernel(function(a, b) {
                let sum = 0;
                for (let i = 0; i < 4; ++i) {
                    sum += a[this.thread.y][i] * b[i][this.thread.x];
                }
                return sum;
            }).setOutput([4, 4])
        )(mat1, mat2);
    }
}
