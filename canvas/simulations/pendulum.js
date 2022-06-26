const {canvas, sims, computation} = tdsim;
const {simple, graphing, status, fundamental, physical} = sims;

function setup(cvs) {
    cvs.addElement(new fundamental.TDFPSClock([8, 7]))
    cvs.addElement(new fundamental.TDTimer([8, 7.5]))

    const dblPendulum = new simple.TDDoublePendulum(
        3.14, 3.14 / 2,
        [0, 0],
        [6, 5],
        2, 2,
        1, 1,
        0.2,
        '#ff0000',
        0, 0
    );
    cvs.addElement(dblPendulum);

    // testing

    // add energy graph
    cvs.addElement(new physical.Groups.EnergeticSystemGrapher(
        dblPendulum,
        ['kineticEnergy', 'potentialEnergy', 'totalEnergy'],
        ['#ff0000', '#008cff', '#000'],
        [1, 1], [13, 8],
        [],
        {
            xrange: [0, 4],
            yrange: [0, 300],
            bordered: false,
            axis: false
        }
    ))
}

// document on ready
document.addEventListener('DOMContentLoaded', function () {
    const root = document.getElementById('root');
    const pause = document.getElementById('pause');

    canvas.loader.InjectSimulation(setup, root, {
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
