import { ICanvas, CanvasOptions, TDCanvas } from "./canvas";
import { DynamicGraphs, Graphing } from "../sims/algos/graphing";
import FunctionGrapher = Graphing.FunctionGrapher;
import GrapherAttr = Graphing.GrapherAttr;
import { Binding } from "./binding";


interface AnimateOperations {
    stop: () => void;
    pause: () => void;
}

/**
 * Starts the Animation Loop on a specific canvas, returns a list of playback operations
 * @param canvas
 */
function animate(canvas: TDCanvas): AnimateOperations {
    let isPaused = false;
    let isStopped = false;
    let unPaused = false;

    canvas.start();
    // render loop
    const update = time => {
        if (isPaused) {
            if (isStopped) {
                return;
            }
            requestAnimationFrame(update);
            return;
        }

        canvas.render(time, unPaused);
        if (unPaused) {
            unPaused = false;
        }
        requestAnimationFrame(update);
    };
    requestAnimationFrame(update);

    return {
        pause() {
            isPaused = !isPaused;
            unPaused = true;
        },
        stop() {
            canvas.stop();
            isPaused = true;
            isStopped = true;
        }
    }
}


/**
 The Type of Injector, takes the canvas as input, returns an optional function for cleanup
 */
type Injector = (canvas: ICanvas) => Promise<void | (() => void)>;

/**
 * Inject a standard injector simulation, returns a cleanup function
 * @param injector The injector function
 * @param element The canvas element
 * @param canvasOptions Some options for canvas
 * @param pause The pause button element
 * @returns Cleanup function
 */
export async function InjectSimulation(
    injector: Injector,
    element: HTMLCanvasElement,
    canvasOptions: Partial<CanvasOptions> = {},
    pause: HTMLButtonElement | null = null
): Promise<() => void> {
    // setup
    if (!element.getContext) {
        alert('your browser is not supported, download chrome/firefox or something');
        return;
    }

    const canvas = new TDCanvas(element, canvasOptions);
    const stop = await injector(canvas);

    const handles = animate(canvas);

    // add handlers
    function pauseHandler(event) {
        handles.pause();
    }

    pause && pause.addEventListener('click', pauseHandler);

    return () => {
        pause && pause.removeEventListener('click', pauseHandler);
        if (stop) {
            stop();
        }
        handles.stop();
    }
}

// Static draws a single graph,
// Dynamic takes a custom function input string (or function) and draws it dynamically
// Reactive takes a custom function and draws it dynamically
type GraphType = "Static" | "Dynamic";

/**
 * Method to inject the tdsim library into a canvas with a graph
 * @param element The canvas element
 * @param fn The function to graph, of form (x, p) => number
 * @param dx The accuracy of the graph
 * @param graphOptions The graph options
 * @param canvasOptions The canvas options
 * @param graphType The type of the graph
 * @param pause THe pause button element
 * @param injector Injector function that runs for extra elements
 * @constructor
 */
export async function InjectGraph(
    {
        element,
        fn,
        dx,
        graphOptions = {},
        canvasOptions = {},
        graphType = "Static",
        pause = null,
        injector = null
    }: {
        element: HTMLCanvasElement,
        fn: (...args: any) => any | Binding<(...args: any) => any>,
        dx: number,
        graphOptions: Partial<GrapherAttr>,
        canvasOptions: Partial<CanvasOptions>,
        graphType: GraphType,
        pause: HTMLButtonElement | null,
        injector: Injector | null
    }
): Promise<() => void> {
    let Injector;
    switch (graphType) {
        case "Static": {
            Injector = async (canvas: ICanvas) => {
                const location = canvas.anchor();
                const size = canvas.drawableArea();
                canvas.addElement(
                    new FunctionGrapher(
                        fn as any, dx,
                        { location, size, bindings: graphOptions }
                    ),
                    'static graph'
                );
                if (injector !== null) {
                    await injector(canvas);
                }
            }
            break;
        }
        case "Dynamic": {
            Injector = async (canvas: ICanvas) => {
                const location = canvas.anchor();
                const size = canvas.drawableArea();
                canvas.addElement(new DynamicGraphs.FunctionGrapher(
                    location, size,
                    {
                        dx,
                        fn,
                        ...graphOptions
                    }
                ));
                if (injector !== null) {
                    await injector(canvas);
                }
            }
            break;
        }
        default:
            throw new Error(`Unknown graph type of ${graphType}`)
    }


    // always hibernate
    if (!canvasOptions.battery) {
        canvasOptions.battery = {
            hibernation: true,
            newTicks: 2
        };
    }
    return await InjectSimulation(Injector, element, canvasOptions, pause);
}


/**
 * Inject a graph with dynamically generated options
 * @param element 
 * @param fn 
 * @param variables 
 * @param settings 
 * @returns 
 */
export async function CreateDynamicGraph(
    element: HTMLElement,
    fn: any,
    variables: { [key: string]: number | { lower: number, upper: number, scale: number, value: number } },
    settings: any
): Promise<() => void> {
    const ce = (ele) => document.createElement(ele);

    // element must be a div
    element.classList.add('dynamic-graph');

    // create canvas
    const ID = makeid(6)
    const canvas = ce('canvas');
    canvas.id = ID;

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
        xrangeUpperInput.value = xr ? xr[1] : 10;
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

        variLower.type = 'number';
        variUpper.type = 'number';
        variScale.type = 'number';
        variRange.type = 'range';

        // create bounds and scale
        if (typeof value == 'number') {
            variScale.value = '100';
            variLower.value = '0';  // TODO: Make these bound respond to value
            variUpper.value = '1';
            variRange.value = value * 100;
            variRange.min = '0';
            variRange.max = '100';
            variValue.innerText = value;
        } else {
            variScale.value = value.scale;
            variLower.value = value.lower;
            variUpper.value = value.upper;
            variRange.value = value.value * value.scale;
            variRange.min = value.lower * value.scale;
            variRange.max = value.upper * value.scale;
            variValue.innerText = value.value;
        }


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
        bindings[vari] = Binding.slider(
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
    return await InjectGraph({
        element: canvas,
        fn,
        dx: 0.01,
        ...settings,
        graphOptions: {
            xrange: Binding.range(xrangeLowerInput, xrangeUpperInput, 1),
            yrange: Binding.range(yrangeLowerInput, yrangeUpperInput, 1),
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

/**
 * Inject a graph with dynamically selectable options
 * @param initial 
 * @param selection 
 * @param element 
 * @param canvasOptions 
 * @param pause 
 * @returns 
 */
export async function InjectSelectable(
    initial: string,
    selection: {
        [key: string]: [HTMLButtonElement, Injector]
    },
    element: HTMLCanvasElement,
    canvasOptions: CanvasOptions,
    pause: null | HTMLButtonElement = null
) {
    // check for null
    if (Object.keys(selection).length == 0) {
        console.warn("no selections available, returning");
        return;
    }

    // default to first
    let currentSelection = initial;
    let stopHandle;

    stopHandle = await InjectSimulation(selection[initial][1], element, canvasOptions, pause);


    let handlers = {};
    for (const [name, [button, injector]] of Object.entries(selection)) {
        const handler = async (event) => {
            // do not switch if switching to the same injector
            if (currentSelection == name) {
                return;
            }

            // switch to this
            stopHandle();
            currentSelection = name;
            stopHandle = await InjectSimulation(injector, element, canvasOptions, pause);
        };
        handlers[name] = handler;
        button.addEventListener('click', handler);
    }


    return () => {
        // cleanup
        for (const key of Object.keys(selection)) {
            selection[key][0].removeEventListener('click', handlers[key]);
        }
    }
}