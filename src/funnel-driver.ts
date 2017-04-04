import { DefaultOutput } from "@funkia/funnel/dist/defs";
import { timeB } from "./";
import {
  Behavior, changes, empty, integrate, keepWhen, Now, sample, scan, scanS,
  snapshot, snapshotWith, split, stepper, Stream, switcher, Time, timeFrom, toggle
} from "hareactive";
import { combine, fgo, go, lift, map, take } from "jabz";
import { Component, modelView, element, runComponentNow, elements, Child, streamDescription } from "@funkia/funnel";
const { div, button, a } = elements;

import * as lib from "./index";
import { circle, Image, render } from "./graphics";

type Position = { x: number, y: number };

export type World = {
  clicks: lib.Stream<Position>,
  mouse: lib.Behavior<{ x: number, y: number }>
}

// Create global events
const bodyMouseup = empty<MouseEvent>();
const bodyMousemove = empty<MouseEvent>();

document.addEventListener("DOMContentLoaded", () => {
  document.getElementsByTagName("body")[0].addEventListener("mouseup", (e) => {
    bodyMouseup.push(e);
  });
  document.getElementsByTagName("body")[0].addEventListener("mousemove", (e) => {
    bodyMousemove.push(e);
  });
});

let world: World = {
  clicks: [],
  mouse: (t: lib.Time) => ({ x: 0, y: 0 })
};

type Animation = (w: World) => lib.Behavior<Image>;

type DisplaySpec = {
  animation: Animation,
  element: Element,
  duration: number
}

const canvasHeight = 200;
const canvasWidth = 600;

const canvas = element("canvas", {
  actionDefinitions: {
    render: (elm: HTMLCanvasElement, image: Image) => {
      const ctx = elm.getContext("2d");
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      render(ctx, canvasWidth, canvasHeight, image);
    }
  }
});

const icon = element("i", { class: "material-icons" });

type SliderInput = {
  position: Behavior<number>
}

const slider = ({ position }: SliderInput) => go(function* () {
  const pixelPosition = position.map((n) => n * canvasWidth);
  const { mousedown }: DefaultOutput = yield div({
    class: "slider"
  }, [
      div({
        class: "slider-progress",
        style: { width: pixelPosition.map((n) => `${n + 5}px`) }
      }),
      // a({
      //   class: "slider-thumb",
      //   style: {
      //     transform: pixelPosition.map((n) => `translateX(${n}px`)
      //   }
      // }),
      // div({
      //   class: "slider-line"
      // })
    ]);
  const mouseOffsetX = bodyMousemove.map((e) => e.offsetX);
  const mousePressed = toggle(false, mousedown, bodyMouseup);
  const setPositionS = combine(
    mousedown.map((e) => e.offsetX / canvasWidth),
    keepWhen(mouseOffsetX.map((x) => x / canvasWidth), mousePressed)
  );
  return { setPositionS };
});

type ToModel = {
  playPauseS: Stream<{}>,
  replayS: Stream<{}>,
  setPositionS: Stream<number>,
  clickS: Stream<MouseEvent>,
  canvasMousemove: Stream<MouseEvent>
};

type ToView = {
  imageB: Behavior<Image>,
  positionB: Behavior<Time>,
  playing: Behavior<boolean>
};

function findMousemove(evs: (Position & { time: Time })[]): (t: Time) => Position {
  return (time: Time) => {
    let idx = evs.length - 1;
    while (idx >= 0 && evs[idx].time > time) {
      idx--;
    }
    const before = idx !== -1 ? evs[idx] : { time: 0, x: 0, y: 0 };
    const last = evs[idx + 1];
    if (last !== undefined) {
      // Linear interpolation
      const factor = (time - before.time) / (last.time - before.time);
      return {
        x: before.x + (last.x - before.x) * factor,
        y: before.y + (last.y - before.y) * factor
      };
    } else {
      return before;
    }
  };
}

function prepend<A>(elm: A, elms: A[]): A[] {
  return elms.concat([elm]);
}

/**
 * Samples the behavior in the current moment and whenever the stream has an
 * occurrence.
 * @param behavior A behavior of a behavior to sample.
 * @param stream A stream whose occurrences will trigger a sample.
 */
function sampleOn<A>(behavior: Behavior<Behavior<A>>, stream: Stream<any>): Now<Behavior<A>> {
  return sample(behavior).chain((b) => sample(switcher(b, snapshot(behavior, stream))));
}

const model = (animation: Animation, duration: number) => fgo(function* model({
  playPauseS, replayS, setPositionS, clickS, canvasMousemove
}: ToModel) {
  const jumpToTime = combine(setPositionS, replayS.mapTo(0)).map((n) => n * duration);
  const playing: Behavior<boolean> = yield sample(scan((_, b) => !b, false, playPauseS));
  const speed = map((b) => b ? 1 : 0, playing);
  const initialTimeB = yield sample(integrate(speed));
  const playFromBS = snapshotWith(
    (from, int) => int.map((n) => n + from), integrate(speed), jumpToTime
  );
  const timeB: Behavior<number> = yield sample(switcher(initialTimeB, playFromBS));
  const clickOccurrences = snapshotWith(
    (click, time) => ({
      time, value: { x: click.offsetX - (canvasWidth / 2), y: (canvasHeight / 2) - click.offsetY }
    }), timeB, clickS);
  const worldClicksB: Behavior<lib.Stream<Position>> = yield sampleOn(scan(
    prepend, [], clickOccurrences
  ), replayS);
  const moveOccurrence = snapshotWith(
    (move, time) => ({
      time, x: move.offsetX - (canvasWidth / 2), y: (canvasHeight / 2) - move.offsetY
    }), timeB, keepWhen(canvasMousemove, playing));
  const worldMousemoves: Behavior<Position[]> = yield sampleOn(scan(
    (move, moves) => moves.concat([move]), [{ time: 0, x: 0, y: 0 }], moveOccurrence
  ), replayS);
  const worldMouse = worldMousemoves.map(findMousemove);
  const positionB = timeB.map((t) => t / duration);
  const worldB = lift((clicks, mouse) => ({ clicks, mouse }), worldClicksB, worldMouse);
  const animationB = worldB.map(animation);
  const imageB = lift((currentAnimation, t) => currentAnimation(t), animationB, timeB);
  return [{ imageB, positionB, playing }, {}];
});

const view = ({ playing, imageB, positionB }: ToView) => div({
  class: "animation",
  style: { width: canvasWidth + "px" }
}, [
    canvas({
      props: { width: canvasWidth, height: canvasHeight },
      setters: { render: imageB },
      output: { clickS: "click", canvasMousemove: "mousemove" }
    }),
    div({ class: "control-buttons" }, [
      button({
        output: { playPauseS: "click" }
      }, icon(playing.map((b) => b ? "pause" : "play_arrow"))),
      button({ output: { replayS: "click" } }, icon("replay")),
    ]),
    slider({ position: positionB })
  ]);

const app = (animation: Animation, duration: number) =>
  modelView(model(animation, duration), view);

export function display({ animation, element, duration }: DisplaySpec): void {
  runComponentNow(element, app(animation, duration));
}
