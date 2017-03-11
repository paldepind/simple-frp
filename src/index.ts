export type Time = number;

export type Behavior<A> = (t: Time) => A;

export type Occurence<A> = {time: Time, value: A};

export type Events<A> = Occurence<A>[];

export const timeB: Behavior<Time> = (t) => t;

export const constB = <A>(a: A) => (t: Time) => a;
export function lift1<A, B>(f: (a: A) => B, a: Behavior<A>): Behavior<B> {
  return (t: Time) => f(a(t));
}
export const lift2 = <A, B, C>(f: (a: A, b: B) => C, a: Behavior<A>, b: Behavior<B>) => (t: Time) => f(a(t), b(t));
export const lift3 = <A, B, C, D>(f: (a: A, b: B, c: C) => D, a: Behavior<A>, b: Behavior<B>, c: Behavior<C>) => (t: Time) => f(a(t), b(t), c(t));

export function lift<A, B>(f: (a: A) => B, a: Behavior<A>): Behavior<B>;
export function lift<A, B, C>(f: (a: A, b: B) => C, a: Behavior<A>, b: Behavior<B>): Behavior<C>;
export function lift<A, B, C, D>(f: (a: A, b: B, c: C) => D, a: Behavior<A>, b: Behavior<B>, c: Behavior<C>): Behavior<D>;
export function lift<A>(f: (...args: any[]) => A, ...behaviors: Behavior<any>[]): Behavior<A>;
export function lift<A>(f: (...args: any[]) => A, ...behaviors: Behavior<any>[]): Behavior<A> {
  return (t) => f(...behaviors.map((b) => b(t)));
}

function findOccurence<V>(t: Time, e: Events<V>): Occurence<V> | undefined {
  return e.filter(({time}) => time < t).reverse()[0];
}

export function map<A, B>(f: (a: A) => B, e: Events<A>): Events<B> {
  return e.map(({time, value}) => ({time, value: f(value)}));
}

export function switcher<V>(b: Behavior<V>, e: Events<Behavior<V>>): Behavior<V> {
  return (t) => {
    const maybeOcc = findOccurence(t, e);
    return maybeOcc !== undefined ? maybeOcc.value(t) : b(t);
  };
}

export function delay<A>(delta: Time, b: Behavior<A>): Behavior<A> {
  return (t) => b(t - delta);
}

export function timeTransform<V>(b: Behavior<V>, tb: Behavior<Time>): Behavior<V> {
  return (t) => b(tb(t));
}

export function slower<V>(n: number, b: Behavior<V>): Behavior<V> {
  return timeTransform(b, lift1(t => t / n, timeB));
}
