const {canvas, sims, computation} = tdsim;
const {simple, custom, status, fundamental} = sims;

function Spring(cvs) {
    cvs.addElement(new fundamental.TDFPSClock([8, 7]))

    const spring = new custom.TDSpringPendulum(
        [3, 2],
        [4, 7],
        0.25,
        {
            dampt: 0,
            dampx: 0
        }
    );
    cvs.addElement(spring, 'spring');

    cvs.addElement(new status.TDEnergeticSystemGrapher(
        spring,
        ["kineticEnergy", "potentialEnergy"],
        ["#ff0000", "#0094ff", "black"],
        [0, 0], [11, 8], [],
        {
            xrange: [0, 4],
            yrange: [0, 300],
            bordered: false,
            axis: false
        }
    ), 'grapher');

}

// document on ready
document.addEventListener('DOMContentLoaded', function () {
    const root = document.getElementById('root');
    const pause = document.getElementById('pause');

    canvas.loader.InjectSimulation((cvs) => {
        Spring(cvs);
    }, root, {
        region: {
            scale: 70,
            top: 1,
            right: 1,
        },
        size: {
            height: 600,
            width: 1000
        },
        coord: false,
    }, pause);
});
