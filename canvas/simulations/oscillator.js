
const {canvas, sims, computation} = tdsim;
const {simple, fundamental, physical, graphing} = sims;

function injector(cvs) {
    cvs.addElement(new fundamental.TDFPSClock([8.25, 7]))

    const oscillator = new physical.Mechanics.Oscillator({
        location: [5, 6],
        xe: [0, 0],
        xi: [0, 0],
        force(time) {
            return [2 * Math.cos(time + 1) + Math.sin(time) , 0];
        }
    })

    const grapher = new physical.Groups.EnergeticSystemGrapher(
        oscillator,
        [ "potentialEnergy"],
        ["#0094ff"],
        [0, 0],
        [10, 5],
        [],
        {
            xrange: [0, 10],
            yrange: [-5, 6],
            bordered: false,
            axis: true
        }
    )

    cvs.addElement(oscillator)
    cvs.addElement(grapher)
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
        rate: {
            speed: 2
        },
        coord: true
    }, pause);
});
