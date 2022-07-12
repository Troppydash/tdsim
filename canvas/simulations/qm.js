
const {canvas, sims, computation} = tdsim;
const {physical, fundamental, graphing} = sims;

function MaxwellInjector(cvs) {
    const {MaxwellGrapher} = graphing.DynamicGraphs;
    const { Range } = computation.vector;

    const range = new Range(0, 100, 0.1);
    let points = [];
    let bfield = null;
    // generate points
    for (const [x, i] of range) {
        // const y1 = Math.cos(2 * Math.PI * (x - 30)) * Math.exp(-(((x - 30)) ** 2));
        // const y2 = Math.cos(2 * Math.PI *(x - 7)) * Math.exp(-(((x - 7)) ** 2));
        const y = Math.exp(-((0.1 * (x - 50)) ** 2))
        // const y2 = 1.5 * Math.exp(-(((x - 7)) ** 2))
        // const y = x > 20 && x < 40 ? 1 : 0;
        points.push(y)
        // if (x > 30) {
        //     points.push(Math.sin(2 * 3.14 * 0.05 * x));
        //     bfield.push(Math.sin(2 * 3.14 * 0.05 * x));
        // } else {
        //     points.push(0);
        //     bfield.push(0);
        // }
    }


    const graph = new MaxwellGrapher({
        location: [0, 0],
        size: cvs.drawableArea(),
        points: points,
        bfield,
        range: range,
        bindings: {
            xrange: [-1, 100],
            yrange: [-1, 3],
            color: ['#f00', '#00f']
        }
    });
    graph.addSource(0.3, t => {
        return 2 * Math.exp(-0.5 * ((t - 10) / 2) ** 2)
        // return Math.sin(2 * 3.14 * 0.05 * t)
    })

    cvs.addElement(graph, 'graph');

    const fps = new sims.fundamental.TDFPSClock([ 7, 5]);
    cvs.addElement(fps);
}

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
        // const y1 = Math.cos(2 * Math.PI * (x - 3)) * Math.exp(-(((x - 3)) ** 2));
        // const y2 = Math.cos(2 * Math.PI *(x - 7)) * Math.exp(-(((x - 7)) ** 2));
        const y = Math.exp(-((2 * (x - 3)) ** 2))
        // const y2 = 1.5 * Math.exp(-(((x - 7)) ** 2))
        // const y = x > 2 && x < 4 ? 1 : 0;
        points.push(Complex.FromRect(y));
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

    let _  = await canvas.loader.InjectSimulation(MaxwellInjector, root, {
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
            update: 120,
        },
        coord: true,
    }, pause);
});
