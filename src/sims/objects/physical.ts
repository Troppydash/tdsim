import {IEnergeticSystems} from "./status";
import {Vec2} from "../../computation/vector";

export class TDOrbitalMotion extends IEnergeticSystems<{}> {
    DefaultAttr: {
        M: 1000,
        m: 1,
        r: 1,
        G: 10
    }

    constructor(
        m1pos: Vec2, m2pos: Vec2,

    ) {
        super();


        // TODO: Remake TDObject to allow for higher order Vector simulation, maybe TDNObject

    }


    kineticEnergy(): number {
        return 0;
    }

    potentialEnergy(): number {
        return 0;
    }

}
