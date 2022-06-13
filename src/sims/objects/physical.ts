import {EnergeticSystems} from "../algos/graphing";
import {ITDBaseObject, TDBaseObject, Traceable} from "./fundamental";
import {Binding} from "../../canvas/binding";
import {Area, Plane, Vec2, VecN, VSpace} from "../../computation/vector";
import {TDCanvas, TDElement} from "../../canvas/canvas";
import {Primitives} from "../../canvas/drawers/mechanics";
import drawCircle = Primitives.drawCircle;
import drawHollowCircle = Primitives.drawHollowCircle;
import {ContourMethods} from "../algos/contour";

const G = 5e-3;
const Mass = 1e4;

export namespace Mechanics {
    export class OrbitalMotion extends TDBaseObject implements EnergeticSystems, Traceable {
        DEFAULT_BINDINGS = {
            M: Binding.constant(Mass),
            m: Binding.constant(0.1),
            G: Binding.constant(G),
            Mr: Binding.constant(0.25),
            mr: Binding.constant(0.1),
        }

        constructor(
            {
                Mpos,
                Mvel,
                mpos,
                mvel,
                bindings,
            }: {
                Mpos: Vec2,
                Mvel: Vec2,
                mpos: Vec2,
                mvel: Vec2,
                bindings
            }
        ) {
            super({
                pos: [...Mpos, ...mpos],
                vel: [...Mvel, ...mvel],
                bindings
            });
        }

        static circular(
            {
                M,
                m,
                bindings
            }: {
                M: Vec2,
                m: Vec2,
                bindings
            }
        ) {
            const r = VSpace.VecMag(VSpace.VecSubV(M, m));
            const vel = Math.sqrt(G * Mass / r);
            return new OrbitalMotion({
                Mpos: M,
                Mvel: [0, 0],
                mpos: m,
                mvel: [vel, 0],
                bindings
            })
        }

        differential(t: number, p: VecN, v: VecN): VecN {

            const {M, m, G} = this.parameters;

            const Mpos = [p[0], p[1]];
            const mpos = [p[2], p[3]];

            const r = VSpace.VecMag(VSpace.VecSubV(mpos, Mpos));

            // large mass acceleration,
            // notice the r * r * r is because vecsubv is not normalized
            const AM = VSpace.VecMulC(VSpace.VecSubV(mpos, Mpos), G * m / (r * r * r));
            const Am = VSpace.VecMulC(VSpace.VecSubV(Mpos, mpos), G * M / (r * r * r));
            return [...AM, ...Am];
        }

        render(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
            const {Mr, mr} = this.parameters;

            const Mpos = this.pos.slice(0, 2);
            const mpos = this.pos.slice(2, 4);

            const radius = VSpace.VecMag(VSpace.VecSubV(Mpos, mpos));
            // drawHollowCircle(ctx, parent.pcTodc(Mpos) as any, parent.psTods(radius), '#000000');

            drawCircle(ctx, parent.pcTodc(Mpos as Vec2) as any, parent.psTods(Mr), '#000000');
            drawCircle(ctx, parent.pcTodc(mpos as Vec2) as any, parent.psTods(mr), '#ff0000');
        }

        supplyEnergy(percent: number) {
            const mv = [this.vel[2], this.vel[3]];
            const energy = 0.5 * this.parameters.m * VSpace.VecMag(mv) ** 2;
            const newEnergy = energy * (1 + percent);
            const newVel = VSpace.VecMulC(VSpace.VecNormalize(mv), Math.sqrt(2 * newEnergy / this.parameters.m));
            this.vel[2] = newVel[0];
            this.vel[3] = newVel[1];
        }

        reorbit() {
            const {M, m, G} = this.parameters;

            const Mpos = this.pos.slice(0, 2);
            const mpos = this.pos.slice(2, 4);
            const r = VSpace.VecMag(VSpace.VecSubV(Mpos, mpos));
            const vel = Math.sqrt(G * Mass / r);

            const mvel = [this.vel[2], this.vel[3]];

            const newVel = VSpace.VecMulC(VSpace.VecNormalize(mvel), vel);
            this.vel[2] = newVel[0];
            this.vel[3] = newVel[1];
        }

        kineticEnergy(): number {
            const mv = [this.vel[2], this.vel[3]];
            return 0.5 * this.parameters.m * VSpace.VecMag(mv) ** 2;
        }

        potentialEnergy(): number {
            const {M, m, G} = this.parameters;
            const r = VSpace.VecMag(VSpace.VecSubV(this.pos.slice(2, 4), this.pos.slice(0, 2)));
            const p = -G * M * m / r;
            return p;
        }

        totalEnergy() {
            return this.kineticEnergy() + this.potentialEnergy();
        }

        location(): Vec2 {
            return [
                this.pos[2], this.pos[3]
            ];
        }

    }
}

export namespace Electricity {

    import HasPotential = Fields.HasPotential;

    /**
     *  A singular charge
     */
    export class Charge extends TDBaseObject implements HasPotential {
        DEFAULT_BINDINGS = {
            k: Binding.constant(1),
            charge: Binding.constant(1),
            radius: Binding.constant(0.15)
        }

        constructor(
            {
                p0,
                v0,
                bindings
            }: {
                p0: Vec2,
                v0: Vec2,
                bindings
            }
        ) {
            super({
                pos: p0,
                vel: v0,
                bindings
            });
        }


        render(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
            const {pos} = this;
            const {radius} = this.parameters;

            drawCircle(ctx, parent.pcTodc(pos as Vec2) as Vec2, parent.psTods(radius), '#000');
        }

        differential(t: number, p: VecN, v: VecN): VecN {
            return [0, 0];
        }

        potential(pos: Vec2): number {
            const {k, charge} = this.parameters;
            const distance = Math.sqrt((this.pos[0] - pos[0]) ** 2 + (this.pos[1] - pos[1]) ** 2);
            return k * charge / distance;
        }
    }

}

export namespace Fields {
    import Method = ContourMethods.Method;

    export interface HasPotential extends ITDBaseObject {
        potential(pos: Vec2): number;
    }

    export class PotentialGroup extends TDElement {
        protected potentials: number[];
        protected objects: HasPotential[];
        protected method: Method<any> = ContourMethods.ContourMarchingSquare;
        protected polling: number = -1;

        protected area: Area = {
            xRange: [0, 10],
            xStep: 0.1,
            yRange: [0, 7],
            yStep: 0.1
        }

        private frameCount: number;
        private contourData: any[];

        constructor(
            potentials: number[],
            initialObjects?: HasPotential[],
            area?: Partial<Area>,
            polling?: number,
            method?: Method<any>
        ) {
            super();

            this.potentials = potentials;

            this.objects = [];
            if (initialObjects) {
                this.objects = [...this.objects, ...initialObjects];
            }

            if (method) {
                this.method = method;
            }

            if (area) {
                this.area = {...this.area, ...area};
            }

            if (polling) {
                this.polling = polling;
            }
            this.frameCount = 0;


            this.contourData = [];

            this.potential = this.potential.bind(this);
        }

        start(parent: TDCanvas, ctx: CanvasRenderingContext2D) {
            for (const object of this.objects) {
                object.start(parent, ctx);
            }
        }

        render(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
            for (const object of this.objects) {
                object.render(parent, ctx, dt);
            }

            ctx.lineWidth = 3;
            for (const data of this.contourData) {
                this.method.drawer(data, ctx, parent);
            }
        }

        update(parent: TDCanvas, ctx: CanvasRenderingContext2D, dt: number) {
            for (const object of this.objects) {
                object.update(parent, ctx, dt);
            }

            // compute contour
            if (this.polling === -1 && this.contourData.length > 0) {
                return;
            } else if (this.frameCount <= this.polling) {
                this.frameCount += 1;
                return;
            }

            this.frameCount = 0;
            let i = 0;
            for (const V of this.potentials) {
                this.contourData[i] = this.method.computer(
                    this.area,
                    this.potential,
                    V
                );

                i += 1;
            }

        }

        stop(parent: TDCanvas, ctx: CanvasRenderingContext2D) {
            for (const object of this.objects) {
                object.stop(parent, ctx);
            }
        }


        potential(pos: Vec2) {
            // sum up all the potential
            let V = 0;
            for (const object of this.objects) {
                V += object.potential(pos);
            }
            return V;
        }
    }

}


