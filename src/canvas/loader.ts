import {ICanvas, ICanvasOptions, TDCanvas} from "./canvas";
import {Graphing} from "../sims/algos/graphing";
import FunctionGrapher = Graphing.FunctionGrapher;
import GrapherAttr = Graphing.GrapherAttr;
import {Vec2} from "../computation/vector";

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

type GraphType = "Static";

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
        fn: (...args: any) => any,
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
                canvas.addElement(new FunctionGrapher(fn, dx, location, size, [], graphOptions), 'static graph');

                break;
            default:
                throw new Error(`Unknown graph type of ${graphType}`)
        }

        if (injector !== null) {
            await injector(canvas);
        }
    }

    await InjectSimulation(Injector, element, canvasOptions, pause);
}