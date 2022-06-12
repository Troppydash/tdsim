const {canvas, sims, computation} = tdsim;
const {custom, simple} = sims;

function Injector(cvs) {
    const light = new simple.TDLightBox([1, 1], 0, 0.5);
    const glass1 = new simple.TDGlass(3, [1, 0.65], 0.4, 0.1, -0.6);
    const glass2 = new simple.TDGlass(1.25, [1, 0.25], 0.4, 0.1, 1.2);
    const glass3 = new simple.TDGlass(1.5, [1, -0.25], 0.4, 0.1, 1.2);
    light.addGlass(glass1);
    light.addGlass(glass2);
    light.addGlass(glass3);

    cvs.addElement(light, 'lightbox');
}

// document on ready
document.addEventListener('DOMContentLoaded', function () {
    const root = document.getElementById('root');
    const pause = document.getElementById('pause');

    canvas.loader.InjectSimulation(Injector, root, {
        region: {
            scale: 300,
            top: 0.8,
            right: 0.8,
        },
        coord: false,
    }, pause);
});
