const {canvas, sims, Computation} = tdsim;
const {physical} = sims;
const {InjectGraph, CreateDynamicGraph} = canvas.loader;


// document on ready
document.addEventListener('DOMContentLoaded', async function () {
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


    /// CREATE REGULAR STATIC GRAPH
    await InjectGraph({
        ...DEFAULT_OPTIONS,
        element: graph1,
        fn: x => Math.sin(x),
        dx: 0.01,
    });

    /// CREATE DYNAMIC FUNCTION GRAPH
    const bindableFn = binding.function(graph2Input);
    await InjectGraph({
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

    /// CREATE DYNAMIC DIODE GRAPHS
    function Diode(v, p) {
        const {i0, n, t} = p;
        return i0 * (Math.exp(v / n / t) - 1)
    }
    await CreateDynamicGraph(
        diode,
        Diode,
        {
            i0: 0.1,
            n: 1,
            t: 1
        },
        {
            canvasOptions: {
                size: {
                    width: 500,
                    height: 500
                }
            },
            graphOptions: {
                xrange: [-10, 10],
                yrange: [-2, 10]
            }
        }
    )


    /// CREATE DYNAMIC WAVES GRAPHS
    // wave equation
    function Wave(x, p) {
        const {A, t, k, w} = p;
        return A * Math.sin(x*k - t * w);
    }

    await CreateDynamicGraph(
        document.getElementById('wave'),
        Wave,
        {
            A: {
                lower: -10,
                upper: 10,
                scale: 100,
                value: 2
            },
            t: 1,
            k: 1,
            w: 1,
        },
        {
            canvasOptions: {
                size: {
                    width: 500,
                    height: 500
                }
            },
            graphOptions: {
                xrange: [-10, 10],
                yrange: [-2, 2]
            }
        }
    )
});
