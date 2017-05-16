import * as T from './Types';

export function memoize<A, B>(f: (A) => B): (A) => B {
    const memo = {};

    return (a) => {
        if (memo[a] !== undefined) {
            return memo[a];
        }
        else {
            memo[a] = f(a);
            return memo[a];
        }
    };
}

export function zip(a, b) {
    return a.map(function (e, i) {
        return [e, b[i]];
    });
}

// Streams

export function cons<A>(a: A, stream: (index: number) => A): (index: number) => A {
    return (index) => {
        if (index == 0)
            return a;
        else
            return stream(index - 1);
    }
}

export function skip<A>(skipBy: number, stream: (index: number) => A): (index: number) => A {
    return (index) => {
        return stream(index + skipBy);
    }
}

export function map<A, B>(f: (A) => B): (stream: T.Stream<A>) => T.Stream<B> {
    return (stream) => {
        return (index) => {
            return f(stream(index));
        }
    }
}

// BBoxes

export function bboxesIntersect(bbox1: T.BBox, bbox2: T.BBox): boolean {
    return !(bbox1.x + bbox1.width < bbox2.x || bbox1.y + bbox1.height < bbox2.y ||
             bbox2.x + bbox2.width < bbox1.x || bbox2.y + bbox2.height < bbox1.y);
}

export function bboxEq(bbox1: T.BBox, bbox2: T.BBox): boolean {
    const e = 0.001;

    return bbox1.x >= bbox2.x - e && bbox1.x <= bbox2.x + e &&
        bbox1.y >= bbox2.y - e && bbox1.y <= bbox2.y + e &&
        bbox1.width >= bbox2.width - e && bbox1.width <= bbox2.width + e &&
        bbox1.height >= bbox2.height - e && bbox1.height <= bbox2.height + e;
}

export function mergeBBoxes(bbox1: T.BBox, bbox2: T.BBox): T.BBox {
    const xmin = Math.min(bbox1.x, bbox2.x), ymin = Math.min(bbox1.y, bbox2.y),
    xmax = Math.max(bbox1.x + bbox1.width, bbox2.x + bbox2.width), ymax = Math.max(bbox1.y + bbox1.height, bbox2.y + bbox2.height);

    return { x: xmin, y: ymin, width: xmax - xmin, height: ymax - ymin };
}

export function bboxForPoints(points: T.Point[]): T.BBox {
    let xmax = Number.MIN_VALUE, ymax = Number.MIN_VALUE, xmin = Number.MAX_VALUE, ymin = Number.MAX_VALUE;

    for (let point of points) {
        xmax = Math.max(xmax, point.x);
        xmin = Math.min(xmin, point.x);
        ymax = Math.max(ymax, point.y);
        ymin = Math.min(ymin, point.y);
    }

    return { x: xmin, y: xmin, width: xmax - xmin, height: ymax - ymin };
}
