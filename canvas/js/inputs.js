function createDynamicGraph(element, fn, variables, settings) {
    const binding = tdsim.canvas.binding.Binding;

    const ce = (ele) => document.createElement(ele);

    // element must be a div
    element.classList.add('dynamic-graph');

    // create canvas
    const ID = makeid(6)
    const canvas = ce('canvas');
    canvas.id = ID;

    // check if tdsim is installed
    if (!tdsim) {
        throw new Error("tdsim module not installed, aborting!");
    }

    element.appendChild(canvas);

    // create xrange, yrange, bordered, axis, color
    const rangeContainer = ce('div');
    rangeContainer.className = 'rangeContainer';
    let xrangeLowerInput, xrangeUpperInput, yrangeLowerInput, yrangeUpperInput;

    // get default ranges
    let xr = settings.graphOptions ? settings.graphOptions.xrange : null;
    let yr = settings.graphOptions ? settings.graphOptions.yrange : null;

    // create xrange
    {
        const xrange = ce('div');
        const xrangeLabel = ce('label');
        xrangeLabel.for = `${ID}-xrange`;
        xrangeLabel.innerText = 'X-axis Range';

        xrangeLowerInput = ce('input');
        xrangeLowerInput.value = xr ? xr[0] : 0;
        xrangeLowerInput.id = `${ID}-xrange`;
        xrangeLowerInput.type = 'number';

        xrangeUpperInput = ce('input');
        xrangeUpperInput.value =  xr ? xr[1] : 10;
        xrangeUpperInput.type = 'number';

        xrange.appendChild(xrangeLabel);
        xrange.appendChild(xrangeLowerInput);
        xrange.appendChild(xrangeUpperInput);

        rangeContainer.appendChild(xrange);
    }

    // create yrange
    {
        const yrange = ce('div');
        const yrangeLabel = ce('label');
        yrangeLabel.for = `${ID}-yrange`
        yrangeLabel.innerText = `Y-axis Range`

        yrangeLowerInput = ce('input');
        yrangeLowerInput.value = yr ? yr[0] : 0;
        yrangeLowerInput.id = `${ID}-yrange`;
        yrangeLowerInput.type = 'number';

        yrangeUpperInput = ce('input');
        yrangeUpperInput.value = yr ? yr[1] : 10;
        yrangeUpperInput.type = 'number';

        yrange.appendChild(yrangeLabel);
        yrange.appendChild(yrangeLowerInput);
        yrange.appendChild(yrangeUpperInput);

        rangeContainer.appendChild(yrange);
    }

    element.appendChild(rangeContainer);


    // Create Variables
    const variablesContainer = ce('div');
    variablesContainer.className = 'variablesContainer';
    const bindings = {};

    for (const [vari, value] of Object.entries(variables)) {
        const variContainer = ce('div');
        const variLabel = ce('label');
        const variLower = ce('input');
        const variUpper = ce('input');
        const variScale = ce('input');
        const variRange = ce('input');
        const variValue = ce('span');

        variLabel.innerText = vari;
        variLabel.for = `${ID}-${vari}label`;
        variRange.id = `${ID}-${vari}label`;

        variScale.value = '100';
        variLower.value = '0';  // TODO: Make these bound respond to value
        variUpper.value = '1';

        variLower.type = 'number';
        variUpper.type = 'number';
        variScale.type = 'number';
        variRange.type = 'range';

        variRange.value = value * 100;
        variRange.min = '0';
        variRange.max = '100';

        variValue.innerText = value;

        // changing scale callback
        let handleChange = null;
        function changeScale(hc) {
            handleChange = hc;
        }

        // handle change handlers
        (function () {
            let scale = 100;

            variScale.addEventListener('change', (event) => {
                const newScale = parseFloat(event.target.value);

                variRange.min = variLower.value * newScale;
                variRange.max = variUpper.value * newScale;
                variRange.value = parseFloat(variRange.value) / scale * newScale;
                scale = newScale;

                if (handleChange) {
                    handleChange(newScale);
                }

                variValue.innerText = parseFloat(variRange.value) / scale;
            });

            variLower.addEventListener('change', (event) => {
                let min = parseFloat(event.target.value);

                // make sure that min is smaller than value
                if (min > parseFloat(variRange.value) / scale) {
                    min = parseFloat(variRange.value) / scale;
                    variLower.value = min;
                }

                variRange.min = min * scale;

            });

            variUpper.addEventListener('change', (event) => {
                let max = parseFloat(event.target.value);

                // make sure that max is larger than value
                if (max < parseFloat(variRange.value) / scale) {
                    max = parseFloat(variRange.value) / scale;
                    variUpper.value = max;
                }

                variRange.max = max * scale;
            });

            variRange.addEventListener('input', (event) => {
                variValue.innerText = parseFloat(event.target.value) / scale;
            })
        })()


        // adding to element
        const firstLine = ce('div');
        const secondLine = ce('div');
        const thirdLine = ce('div');

        firstLine.appendChild(variLabel);
        secondLine.appendChild(variRange);
        secondLine.appendChild(variValue);
        thirdLine.appendChild(variLower);
        thirdLine.appendChild(variUpper);
        thirdLine.appendChild(variScale);
        variContainer.appendChild(firstLine)
        variContainer.appendChild(secondLine)
        variContainer.appendChild(thirdLine);

        variablesContainer.appendChild(variContainer);

        // add to bindings
        bindings[vari] = binding.slider(
            variRange,
            100,
            {
                continuous: true,
                changeScale
            }
        );
    }

    element.appendChild(variablesContainer);

    // setup tdsim
    tdsim.canvas.loader.InjectGraph({
        element: canvas,
        fn,
        dx: 0.01,
        ...settings,
        graphOptions: {
            xrange: binding.range(xrangeLowerInput, xrangeUpperInput, 1),
            yrange: binding.range(yrangeLowerInput, yrangeUpperInput, 1),
            axis: true,
            bordered: false,  // do not like green border :(
            ...bindings,
        },
        graphType: 'Dynamic',
    })
}

// https://stackoverflow.com/a/1349426
function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    return result;
}
