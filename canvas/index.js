
const {canvas, sims, computation} = tdsim;
const {simple, angular} = sims;

function randomHexColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
}


function DoublePendulums(cvs) {
    for (let x = 0; x <= 10; x += 1) {
        const pen = new simple.TDDoublePendulumTrail(
            300,
            3,
            0.3 * Math.PI + x / 100, 0.2 * Math.PI,
            [4, 4],
            2, 2,
            1, 0.1,
            0.1, randomHexColor(), 0, 0
        );
        cvs.addElement(pen);
    }
}

// document on ready
document.addEventListener('DOMContentLoaded', function () {
    const root = document.getElementById('root');
    const pause = document.getElementById('pause');

    canvas.loader.InjectSimulation((cvs) => {
        DoublePendulums(cvs);
    }, root, {
        region: {
            scale: 70,
            top: 0.8,
            right: 0.8,
        },
        coord: false,
    }, pause);
});
