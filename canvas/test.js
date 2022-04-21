const {canvas, sims, computation} = tdsim;
const {simple, custom, status, fundamental} = sims;

function randomHexColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}


function Test(cvs) {
    cvs.addElement(new fundamental.TDFPSClock([8, 7]))


    for (let k =0 ; k < 6; k += 0.5) {
        cvs.addElement(new status.TDGraphFunctionWTime((t, x) => Math.sin(x - k *t), 0.01,
            [0, 0], [11, 8], [],
            {
            xrange: [-3, 3],
            yrange: [-2, 2],
        }))
    }
    // const spring = new angular.TDSpringPendulum(
    //     [5, 2],
    //     [4, 5],
    //     0.25
    // );
    // cvs.addElement(spring);
    //
    // cvs.addElement(new angular.TDEnergeticSystemGrapher(
    //     spring,
    //     ["kineticEnergy", "potentialEnergy", "hamiltonian"],
    //     ["#ff0000", "#0094ff", "black"],
    //     [0, 0], [11, 8], [],
    //     {
    //         xrange: [0, 4],
    //         yrange: [0, 300],
    //     }
    // ));

}

// document on ready
document.addEventListener('DOMContentLoaded', function () {
    const root = document.getElementById('root');
    const pause = document.getElementById('pause');

    canvas.loader.InjectSimulation((cvs) => {
        Test(cvs);
    }, root, {
        region: {
            scale: 70,
            top: 0.8,
            right: 0.8,
        },
        coord: true,
    }, pause);
});
