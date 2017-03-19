import {Behavior, Events, Time} from "./index";
import {Image, render} from "./graphics";

type Click = {x: number, y: number};

export type World = {
  clicks: Events<Click>,
}

let world: World = {
  clicks: []
};

const canvasHeight = 600;
const canvasWidth = 600;

type DisplaySpec = {
  animation: (world: World) => Behavior<Image>,
  element: Element
}

function playPause({onPause, onPlay}: {onPause: () => void, onPlay: () => void}) {
  const button = document.createElement("a");
  let playing = false;
  button.href = "#";
  const icon = document.createElement("i");
  icon.classList.add("material-icons");
  icon.innerText = "play_arrow";
  button.appendChild(icon);
  button.addEventListener("click", () => {
    playing = !playing;
    icon.innerText = playing ? "pause" : "play_arrow";
    if (playing) {
      onPlay();
    } else {
      onPause();
    }
  });
  return button;
}

function replay({onReplay}) {
  const button = document.createElement("a");
  button.href = "#";
  button.innerHTML = "<i class='material-icons'>replay</i>";
  button.addEventListener("click", onReplay);
  return button;
}

export function display({animation, element}: DisplaySpec): void {
  let time = 0;
  let playing = false;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = canvasHeight;
  canvas.height = canvasHeight;
  element.appendChild(canvas);

  element.appendChild(playPause({
    onPlay: () => {
      playing = true;
      lastFrame = performance.now();
      requestAnimationFrame(mainLoop);
    },
    onPause: () => {
      playing = false;
    }
  }));

  element.appendChild(replay({
    onReplay: () => {
      time = 0;
      lastFrame = performance.now();
      requestAnimationFrame(mainLoop);
    }
  }));

  canvas.addEventListener("click", (ev) => {
    world.clicks.push({
      time: performance.now() / 1000,
      value: { x: ev.offsetX - (canvasWidth / 2), y: (canvasWidth / 2) - ev.offsetY }
    });
  });

  let lastFrame = performance.now();
  function mainLoop(msT: Time): void {
    const delta = msT - lastFrame;
    time += delta / 1000; // convert time to seconds
    lastFrame = msT;
    ctx.clearRect(0, 0, canvasHeight, canvasHeight);
    render(ctx, canvasWidth, canvasHeight, animation(world)(time));
    if (playing) {
      requestAnimationFrame(mainLoop);
    }
  }

  requestAnimationFrame(mainLoop);
}
