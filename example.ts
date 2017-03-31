import "./src/style.scss";
import {
  Behavior, delay, Stream, constB, lift, map, slower, switcher, Time, timeB
} from "./src";
import {
  Circle, Image, circle, stack, translate
} from "./src/graphics";
// import {World, display} from "./src/simple-driver";
import { World, display } from "./src/funnel-driver";

function animation0(w: World): Behavior<Image> {
  return lift((t) => circle(20, t * 100 - 260, 0), timeB);
}

function animation1(w: World): Behavior<Image> {
  return lift((t) => circle(20, t * 100 - 260, 50 * Math.sin(3 * t)), timeB);
}

function animation2(w: World): Behavior<Image> {
  const movingCircle = animation1(w);
  return lift(stack,
    movingCircle,
    delay(1, movingCircle),
    slower(2, movingCircle),
    slower(4, movingCircle)
  );
}

function animation3(w: World): Behavior<Image> {
  return switcher(
    constB(circle(10, 0, 0)),
    map(({ x, y }) => constB(circle(10, x, y)), w.clicks)
  );
}

function animation4(w: World): Behavior<Image> {
  return lift(({x, y}) => circle(20, x, y), w.mouse);
}

function notanimation4(w: World): Behavior<Image> {
  const sinTime = lift((t) => 100 * Math.sin(t), timeB);
  const cosTime = lift((t) => 100 * Math.cos(t), timeB);

  const movingSquare = lift((x, y) => circle(20, x, y), sinTime, cosTime);

  const slowerMovingSquare = slower(2, movingSquare);
  return lift(stack,
    switcher(movingSquare, map(({ x, y }) => constB(circle(25, x, y)), w.clicks)),
    delay(400, movingSquare),
    slowerMovingSquare
  );
}

function orbit(t: Time, image: Image): Image {
  return translate(100 * Math.sin(t), 100 * Math.cos(t), image);
}

function notanimation5(w: World): Behavior<Image> {
  const planet = lift(orbit, timeB, constB(circle(10, 0, 0)));
  const circles = lift(stack, planet, slower(2, planet));

  return lift(stack,
    circles
  );
}

display({
  animation: animation0,
  element: document.getElementById("animation0"),
  duration: 6
});

display({
  animation: animation1,
  element: document.getElementById("animation1"),
  duration: 6
});

display({
  animation: animation2,
  element: document.getElementById("animation2"),
  duration: 12
});

display({
  animation: animation3,
  element: document.getElementById("animation3"),
  duration: 12
});

display({
  animation: animation4,
  element: document.getElementById("animation4"),
  duration: 12
});