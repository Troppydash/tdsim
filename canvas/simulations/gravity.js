const {canvas, sims, computation} = tdsim;
const {physical, graphing, fundamental} = sims;

function Injector(cvs) {
    cvs.addElement(new fundamental.TDFPSClock([3, 3]))

    const gravity = physical.Mechanics.OrbitalMotion.circular({
        M: [0, 1],
        m: [0, 3],
    })

    const gravityTrail = new fundamental.TDBaseObjectTrail({
        system: gravity,
        limit: 2000,
        step: 1
    });


    const energy = document.getElementById('percentage-energy');
    const energyBtn = document.getElementById('percentage-energy-btn');
    energyBtn.addEventListener('click', () => {
        gravity.supplyEnergy(parseFloat(energy.value));
    });

    const orbitBtn = document.getElementById('orbit-btn');
    orbitBtn.addEventListener('click', () => {
        gravity.reorbit();
    })


    cvs.addElement(gravity, 'gravity');
    cvs.addElement(gravityTrail, 'gravityTrail');

    // cvs.addElement(new graphing.DynamicGraphs.EnergeticSystemGrapher(
    //     gravity,
    //     ["kineticEnergy", "potentialEnergy", "totalEnergy"],
    //     ["#ff0000", "#0094ff", "fff"],
    //     {
    //         location: [-9, -5.5],
    //         size: [10, 6],
    //         bindings: {
    //             xrange: [0, 4],
    //             yrange: [-5, 6],
    //             bordered: false,
    //             axis: true
    //         }
    //     }
    // ), 'grapher');
}

// document on ready
document.addEventListener('DOMContentLoaded', function () {
    const root = document.getElementById('root');
    const pause = document.getElementById('pause');

    canvas.loader.InjectSimulation(Injector, root, {
        region: {
            scale: 50,
            top: 0.5,
            right: 0.5,
        },
        size: {
            height: 600,
            width: 1000
        },
        rate: {
            update: 120,
            speed: 1
        },
        coord: false,
    }, pause);
});
