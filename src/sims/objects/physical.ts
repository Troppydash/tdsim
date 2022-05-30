import {EnergeticSystems} from "./graphing";
import {TDBaseObject} from "./fundamental";
import {Binding} from "../../canvas/binding";
import {Vec2, VecN, VSpace} from "../../computation/vector";
import {TDCanvas} from "../../canvas/canvas";
import {Primitives} from "../../canvas/drawers/mechanics";
import drawCircle = Primitives.drawCircle;
import drawHollowCircle = Primitives.drawHollowCircle;

const G = 5e-3;
const Mass = 1e4;

export class TDOrbitalMotion extends TDBaseObject implements EnergeticSystems {
    override DEFAULT_BINDINGS = {
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
        return new TDOrbitalMotion({
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
        drawHollowCircle(ctx, parent.pcTodc(Mpos) as any, parent.psTods(radius), '#000000');

        drawCircle(ctx, parent.pcTodc(Mpos) as any, parent.psTods(Mr), '#000000');
        drawCircle(ctx, parent.pcTodc(mpos) as any, parent.psTods(mr), '#ff0000');
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

}
