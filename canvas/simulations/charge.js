const {canvas, sims, Computation} = tdsim;
const {physical} = sims;

function injector(cvs) {
    const {Binding} = canvas.binding;
    const {Electricity, Fields} = physical;

    const slider = document.getElementById('radius');

    const charge1 = new Electricity.Charge({
        p0: [1, 2],
        v0: [0, 0],
        bindings: {
            radius: Binding.slider(slider, 100, 15)
        }
    });
    charge1.setConstant('charge', 1);

    const charge2 = new Electricity.Charge({
        p0: [4, 2],
        v0: [0, 0]
    });
    charge2.setConstant('charge', -1);


    const charge3 = new Electricity.Charge({
        p0: [0, 5],
        v0: [0.2, 0],
    });
    charge3.setConstant('charge', 2);
    //
    const charge4 = new Electricity.Charge({
        p0: [5, -1],
        v0: [0, 0],
    });
    charge4.setConstant('charge', -0.7);



    const strengthGroup = new Fields.ElectricFields({
        initialElements: [charge1, charge2, charge3, charge4],
        divergence: 8
    });

    cvs.addElement(strengthGroup);

    const group = new Fields.PotentialGroup(
        [1, 0.5, 0.1, -0.1, -0.5, -1],
        [charge1, charge2, charge3, charge4],
        {
            xRange: [-5, 10],
            yRange: [-5, 10],
            xStep: 0.02,
            yStep: 0.02
        },
    );

    cvs.addElement(group, 'potentialGroup');
}

// document on ready
document.addEventListener('DOMContentLoaded', function () {
    const root = document.getElementById('root');
    const pause = document.getElementById('pause');

    canvas.loader.InjectSimulation(injector, root, {
        region: {
            scale: 50,
            top: 0.8,
            right: 0.8,
        },
        battery: {
            hibernation: true,
            newTicks: 1,
        },
        coord: false,
    }, pause);
});
