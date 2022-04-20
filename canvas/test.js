const {canvas, sims, computation} = tdsim;
const {simple, angular, status} = sims;

function randomHexColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
}


function Test(cvs) {
    cvs.addElement(new status.TDGraphFunctionWTime((t, x) => Math.sin(x - t), 0.01,[1, 1], [8, 4], [], {
        xrange: [-3, 3],
        yrange: [-2, 2],
    }))
    cvs.addElement(new simple.TDBall(0.1, [1,1], 0))
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
