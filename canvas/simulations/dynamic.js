const {canvas, sims, Computation} = tdsim;
const {physical} = sims;




// document on ready
document.addEventListener('DOMContentLoaded', function () {
    const graph1 = document.getElementById('graph1');
    const graph2 = document.getElementById('graph2');
    const graph2Input = document.getElementById('graph2Input');
    const pause = document.getElementById('pause');

    const DEFAULT_OPTIONS = {
        canvasOptions: {
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
    // InjectGraph({
    //     ...DEFAULT_OPTIONS,
    //     element: graph1,
    //     fn: x => Math.sin(x),
    //     dx: 0.01,
    // });
    const bindableFn = canvas.binding.Binding.function(graph2Input);
    InjectGraph({
        ...DEFAULT_OPTIONS,
        element: graph2,
        fn: bindableFn,
        dx: 0.01,
        graphType: 'Dynamic'
    });
});
