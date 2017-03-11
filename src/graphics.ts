export type Circle = {
  radius: number;
  x: number;
  y: number;
}

export type Image = Circle[];

export function circle(radius: number, x: number, y: number): Image {
  return [{ radius, x, y }];
}

export function stack(...images: Image[]): Image {
  return images.reduce((imgs, img) => imgs.concat(img), []);
}

export function translate(dx: number, dy: number, image: Image): Image {
  return image.map(({radius, x, y}) => ({radius, x: x + dx, y: y + dy}));
}

function renderCircle(
  ctx: CanvasRenderingContext2D, width: number, height: number, {radius, x, y}: Circle
): void {
  ctx.beginPath();
  ctx.arc(
    (width / 2) + x,
    (height / 2) - y,
    radius,
    0,
    2 * Math.PI,
    false
  );
  ctx.fill();
}

export function render(
  ctx: CanvasRenderingContext2D, width: number, height: number, circles: Image
): void {
  for (const circle of circles) {
    renderCircle(ctx, width, height, circle);
  }
}
