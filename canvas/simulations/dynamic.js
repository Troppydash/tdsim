const {canvas, sims, Computation} = tdsim;
const {physical} = sims;




// document on ready
document.addEventListener('DOMContentLoaded', function () {
    const graph1 = document.getElementById('graph1');
    const pause = document.getElementById('pause');
    canvas.loader.InjectGraph({
        element: graph1,
        fn: x => Math.sin(x),
        dx: 0.01,
        canvasOptions: {
            region: {
                scale: 50,
                top: 1,
                right: 1,
            },
            coord: true,
        },
        graphOptions: {
            xrange: [-6, 6]
        },
        pause: pause
    })
});
