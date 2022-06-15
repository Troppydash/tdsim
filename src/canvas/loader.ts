import {ICanvasOptions, TDCanvas} from "./canvas";

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

type Injector = (canvas: TDCanvas) => Promise<void>;

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

export async function InjectGraph(

) {

}