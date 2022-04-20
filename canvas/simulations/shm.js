
const {canvas, sims, computation} = tdsim;
const {simple, angular} = sims;

function SHM(cvs) {
    // cvs.addElement(new canvas.canvas.TDFPSClock([8.25, 7]))
    // cvs.addElement(new simple.TDPendulum(0.5 * Math.PI, [2, 5], 2, 0.25));
    cvs.addElement(new simple.TDOsillator([2, 0], 1, 0.25, [6, 5]))
}

// document on ready
document.addEventListener('DOMContentLoaded', function () {
    const root = document.getElementById('root');
    const pause = document.getElementById('pause');

    canvas.loader.InjectSimulation((cvs) => {
        SHM(cvs);
    }, root, {
        region: {
            scale: 70,
            top: 0.8,
            right: 0.8,
        },
        coord: true
    }, pause);
});
