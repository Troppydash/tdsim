const {canvas, sims, Computation} = tdsim;
const {physical} = sims;




// document on ready
document.addEventListener('DOMContentLoaded', function () {
    const graph1 = document.getElementById('graph1');
    const graph2 = document.getElementById('graph2');
    const graph2Input = document.getElementById('graph2Input');
    const graph2xlower = document.getElementById('xrangeLower');
    const graph2xlupper = document.getElementById('xrangeUpper');
    const pause = document.getElementById('pause');
    const diode = document.getElementById('diode');
    const diodeCurrent = document.getElementById('diodeCurrent');

    const binding = canvas.binding.Binding;

    const DEFAULT_OPTIONS = {
        canvasOptions: {
            size: {
                width: 500,
                height: 500
            },
            region: {
                scale: 50,
                top: 1,
                right: 1,
            },
            coord: true,
        },
        graphOptions: {
            xrange: [-2, 2],
            yrange: [-2, 2]
        },
        pause: pause
    }

    const InjectGraph = canvas.loader.InjectGraph;
    InjectGraph({
        ...DEFAULT_OPTIONS,
        element: graph1,
        fn: x => Math.sin(x),
        dx: 0.01,
    });
    const bindableFn = binding.function(graph2Input);
    InjectGraph({
        ...DEFAULT_OPTIONS,
        graphOptions: {
            xrange: binding.range(graph2xlower, graph2xlupper, 100),
            yrange: [-2, 2]
        },
        element: graph2,
        fn: bindableFn,
        dx: 0.01,
        graphType: 'Dynamic',
    });

    function Diode(v, p) {
        const {i0, n, t} = p;
        return i0 * (Math.exp(v/n/t)-1)
    }

    InjectGraph({
        ...DEFAULT_OPTIONS,
        element: diode,
        fn: Diode,
        graphOptions: {
            i0: binding.slider(diodeCurrent, 1000),
            n: 1,
            t: 1,
            xrange: [-10, 10],
            yrange: [-5, 20]
        },
        dx: 0.01,
        graphType: 'Dynamic'
    });
});
