const {canvas, sims, Computation} = tdsim;
const {physical, fundamental} = sims;
const {Binding} = canvas.binding;
const {Electricity, Fields} = physical;

function injectCharges(cvs, charges) {
    const groups = new fundamental.BaseListElements(
        charges
    );

    const strengthGroup = new Fields.ElectricFields({
        divergence: 8,
        initialElements: charges,
        accuracy: 0.1
    });

    // const potentials = [10, 11, 13, 15, 17, 19, 25];
    const potentials = [1, 3, 5, -1, -3, -5];

    const potentialGroup = new Fields.PotentialGroup(
        potentials,
        charges,
        {
            xRange: [-4, 15],
            yRange: [-4, 12],
            xStep: 0.1,
            yStep: 0.1
        },
    );

    cvs.addElement(groups, 'groups', 0);
    cvs.addElement(strengthGroup, 'strengthGroup', 1);
    cvs.addElement(potentialGroup, 'potentialGroup', 1);
}

async function DataInjector(cvs) {
    const data = await fetch('data.json');
    const json = await data.json();

    let charges = [];
    for (const point of json) {
        const [x, y] = point;
        const realX = x / 50;
        const realY = y / 50;

        const charge = new Electricity.Charge({
            p0: [realX - 1, 12 - realY],
            v0: [0, 0],
            bindings: {}
        });
        charge.setConstant('charge', 1);

        charges.push(charge);
    }

    injectCharges(cvs, charges);
}

function TriInjector(cvs) {
    const charges = [];

    // create positive charges
    const accuracy = 10;
    for (let i = 0; i < accuracy; ++i) {
        const pCharge = new Electricity.Charge({
            p0: [1 + i * 0.5 * Math.cos(Math.PI * 60 / 180), 1 + i * 0.5 * Math.sin(Math.PI * 60 / 180)],
            v0: [0, 0],
            bindings: {}
        });
        pCharge.setConstant('charge', 1);
        charges.push(pCharge);


        const nCharge = new Electricity.Charge({
            p0: [1 + i * 0.5, 1],
            v0: [0, 0],
            bindings: {}
        });
        nCharge.setConstant('charge', -1);
        charges.push(nCharge);

        const nCharge2 = new Electricity.Charge({
            p0: [1 + (accuracy - 1) * 0.5 - i * 0.5 * Math.cos(Math.PI * 60 / 180), 1 + i * 0.5 * Math.sin(Math.PI * 60 / 180)],
            v0: [0, 0],
            bindings: {}
        });
        nCharge2.setConstant('charge', 1);
        charges.push(nCharge2);
    }

    injectCharges(cvs, charges);
}

function PlateInjector(cvs) {
    const charges = [];

    for (let i = 0; i < 10; ++i) {
        const pCharge = new Electricity.Charge({
            p0: [0.5 * i, 1],
            v0: [0, 0],
            bindings: {}
        });
        pCharge.setConstant('charge', 1);
        charges.push(pCharge);

        const nCharge = new Electricity.Charge({
            p0: [0.5 * i, 0],
            v0: [0, 0],
            bindings: {}
        });
        pCharge.setConstant('charge', -1);
        charges.push(nCharge);
    }

    injectCharges(cvs, charges)
}

function Injector(cvs) {
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
            xStep: 0.1,
            yStep: 0.1
        },
    );

    cvs.addElement(group, 'potentialGroup');
}



// document on ready
document.addEventListener('DOMContentLoaded', async function () {
    const root = document.getElementById('root');
    const pause = document.getElementById('pause');

    const plate = document.getElementById('plate');
    const def = document.getElementById('def');
    const sus = document.getElementById('Sus');
    const tri = document.getElementById('tri');

    const stop = await canvas.loader.InjectSelectable(
        'default',
        {
            'default': [def, Injector],
            'plate': [plate, PlateInjector],
            'sus': [sus, DataInjector],
            'tri': [tri, TriInjector]
        },
        root,
        {
            region: {
                scale: 50,
                top: 0.8,
                right: 0.8,
            },
            battery: {
                hibernation: true,
                newTicks: 1,
            },
            coord: true,
        },
        pause
    )
});
