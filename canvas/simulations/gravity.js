const {canvas, sims, computation} = tdsim;
const {physical, graphing, fundamental} = sims;

function Injector(cvs) {
    cvs.addElement(new fundamental.TDFPSClock([3, 3]))

    const gravity = new physical.TDOrbitalMotion.circular({
        M: [0, 1],
        m: [0, 3]
    })

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

    cvs.addElement(new graphing.TDEnergeticSystemGrapher(
        gravity,
        ["kineticEnergy", "potentialEnergy"],
        ["#ff0000", "#0094ff"],
        [-9, -5.5], [10, 6], [],
        {
            xrange: [0, 4],
            yrange: [-7, 10],
            bordered: false,
            axis: true
        }
    ), 'grapher');
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
        coord: false,
    }, pause);
});
