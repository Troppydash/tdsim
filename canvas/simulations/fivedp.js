
const {canvas, sims, computation} = tdsim;
const {simple, custom} = sims;

function randomHexColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
}


function DoublePendulums(cvs) {
    for (let x = 0; x <= 5; x += 1) {
        const pen = new simple.TDDoublePendulumTrail(
            50,
            1,
            1.01 * Math.PI + x / 100, 1 * Math.PI,
            [4, 4],
            [4, 4],
            2, 2,
            1, 0.1,
            0.1, randomHexColor(), 0.01, 0.01
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
