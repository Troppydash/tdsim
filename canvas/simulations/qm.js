const {canvas, sims, computation} = tdsim;
const {physical, fundamental, graphing} = sims;

function Injector(cvs) {
    const { Range, Complex} = computation.vector;

    // const c1 = Complex.FromRect(-1, 2);
    // const c2 = Complex.FromRect(2, -2);
    // console.log(Complex.Div(c1, c2));
    // console.log(Complex.Inv(c2));
    //
    // return;


    let range = new Range(0, 10, 0.01);
    let points = [];
    // generate points
    for (const [x, i] of range) {
        const y1 = Math.cos(2 * Math.PI * (x - 3)) * Math.exp(-(((x - 3)) ** 2));
        const y2 = Math.cos(2 * Math.PI *(x - 7)) * Math.exp(-(((x - 7)) ** 2));
        // const y1 = Math.exp(-((2 * (x - 3)) ** 2))
        // const y2 = 1.5 * Math.exp(-(((x - 7)) ** 2))
        // const y = x > 2 && x < 4 ? 1 : 0;
        points.push(Complex.FromRect(y1 + y2));
    }


    const graph = new graphing.DynamicGraphs.SpaceTimeGrapher({
        location: [0, 0],
        size: cvs.drawableArea(),
        points: points,
        range: range,
        diffEq: [Complex.FromRect(1), Complex.FromRect(1), Complex.FromRect(0), Complex.FromRect(0)],
        bindings: {
            xrange: [-1, 10],
            yrange: [-1, 3]
        }
    });

    cvs.addElement(graph, 'graph');
}

// document on ready
document.addEventListener('DOMContentLoaded', async function () {
    const root = document.getElementById('root');
    const pause = document.getElementById('pause');

    let _  = await canvas.loader.InjectSimulation(Injector, root, {
        region: {
            scale: 50,
            top: 1,
            right: 1,
        },
        battery: {
            // hibernation: true,
            // newTicks: 50
        },
        rate: {
            speed: 1,
            update: 240,
        },
        coord: true,
    }, pause);
});
