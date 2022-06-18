import {ICanvas, ICanvasOptions, TDCanvas} from "./canvas";
import {DynamicGraphs, Graphing} from "../sims/algos/graphing";
import FunctionGrapher = Graphing.FunctionGrapher;
import GrapherAttr = Graphing.GrapherAttr;
import {Vec2} from "../computation/vector";
import {Binding} from "./binding";

export function sayHello() {
    alert("Hello World");
}

function animate(canvas: TDCanvas, pause: HTMLButtonElement | null = null) {
    let isPaused = false;
    let unPaused = false;
    pause?.addEventListener('click', () => {
        isPaused = !isPaused;
        unPaused = true;
    });

    canvas.start();
    // render loop
    const update = time => {
        if (isPaused) {
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
}

type Injector = (canvas: ICanvas) => Promise<void>;

export async function InjectSimulation(
    injector: Injector,
    element: HTMLCanvasElement,
    canvasOptions: Partial<ICanvasOptions> = {},
    pause: HTMLButtonElement | null = null
) {
    // setup
    if (!element.getContext) {
        alert('your browser is not supported, download chrome/firefox or something');
        return;
    }

    const canvas = new TDCanvas(element, canvasOptions);
    await injector(canvas);

    animate(canvas, pause);
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
        canvasOptions: Partial<ICanvasOptions>,
        graphType: GraphType,
        pause: HTMLButtonElement | null,
        injector: Injector | null
    }
) {
    const Injector = async (canvas: ICanvas) => {
        const location = canvas.anchor();
        const size = canvas.drawableArea();
        switch (graphType) {
            case "Static":
                canvas.addElement(new FunctionGrapher(fn as any, dx, location, size, [], graphOptions), 'static graph');

                break;
            case "Dynamic":
                canvas.addElement(new DynamicGraphs.FunctionGrapher(
                    location, size,
                    {
                        dx,
                        fn,
                        ...graphOptions
                    }
                ));

                break;
            default:
                throw new Error(`Unknown graph type of ${graphType}`)
        }

        if (injector !== null) {
            await injector(canvas);
        }
    }

    // always hibernate
    if (!canvasOptions.battery) {
        canvasOptions.battery = {
            hibernation: true,
            newTicks: 2
        };
    }
    await InjectSimulation(Injector, element, canvasOptions, pause);
}
