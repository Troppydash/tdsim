const {canvas, sims, computation} = tdsim;
const {physical} = sims;

function injector(cvs) {
    const {Electricity} = physical;
    const charge = new Electricity.Charge({
        p0: [1, 1],
        v0: [0, 0]
    });
    cvs.addElement(charge);
}

// document on ready
document.addEventListener('DOMContentLoaded', function () {
    const root = document.getElementById('root');
    const pause = document.getElementById('pause');

    canvas.loader.InjectSimulation(injector, root, {
        region: {
            scale: 70,
            top: 0.8,
            right: 0.8,
        },
        coord: true,
    }, pause);
});
