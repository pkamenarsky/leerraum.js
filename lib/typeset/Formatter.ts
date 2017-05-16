/*!
 * Knuth and Plass line breaking algorithm in JavaScript
 *
 * Licensed under the new BSD License.
 * Copyright 2009-2010, Bram Stein
 * All rights reserved.
 */

const linebreak = require('./linebreak').linebreak();

import * as T from '../Types';

export function justify(measureText: (fontFamily: string, fontSize: number, text: string) => number, hypher, spans: T.Span[], options): T.Node[] {
    let nodes: T.Node[] = [];

    spans.forEach(function (span, spanIndex, spanArray) {
        let words = span.text.split(/\s/),

        spaceWidth = measureText(span.fontFamily, span.fontSize, ' '),
        o = {
            space: {
                width: options && options.space.width || 3,
                stretch: options && options.space.stretch || 6,
                shrink: options && options.space.shrink || 9
            }
        },
        hyphenWidth = measureText(span.fontFamily, span.fontSize, '-'),
        hyphenPenalty = 100,
        spaceStretch = (spaceWidth * o.space.width) / o.space.stretch,
        spaceShrink = (spaceWidth * o.space.width) / o.space.shrink;

        words.forEach(function (word, index, array) {
            let hyphenated = span.hyphenate ? hypher.hyphenate(word) : [word];

            if (hyphenated.length > 1 && word.length > 4) {
                hyphenated.forEach(function (part, partIndex, partArray) {
                    nodes.push({style: span, value: linebreak.box(measureText(span.fontFamily, span.fontSize, part), part)});

                    if (partIndex !== partArray.length - 1) {
                        nodes.push({style: span, value: linebreak.penalty(hyphenWidth, hyphenPenalty, 1)});
                    }
                });
            }
            else {
                nodes.push({style: span, value: linebreak.box(measureText(span.fontFamily, span.fontSize, word), word)});
            }

            if (spanIndex === spanArray.length - 1 && index === array.length - 1) {
                nodes.push({style: span, value: linebreak.glue(0, linebreak.infinity, 0)});
                nodes.push({style: span, value: linebreak.penalty(0, -linebreak.infinity, 1)});
            }
            // don't add space after a span
            else if (index !== array.length - 1) {
                nodes.push({style: span, value: linebreak.glue(spaceWidth, spaceStretch, spaceShrink)});
            }
        });
    });

    return nodes;
}

export function left(measureText: (fontFamily: string, fontSize: number, text: string) => number, hypher, spans: T.Span[], options): T.Node[] {
    let nodes: T.Node[] = [];

    spans.forEach(function (span, spanIndex, spanArray) {
        let words = span.text.split(/\s/),
        spaceWidth = measureText(span.fontFamily, span.fontSize, ' '),
        o = {
            space: {
                width: options && options.space.width || 3,
                stretch: options && options.space.stretch || 6,
                shrink: options && options.space.shrink || 9
            }
        },
        hyphenWidth = measureText(span.fontFamily, span.fontSize, '-'),
        hyphenPenalty = 100,
        spaceStretch = (spaceWidth * o.space.width) / o.space.stretch,
        spaceShrink = (spaceWidth * o.space.width) / o.space.shrink;

        words.forEach(function (word, index, array) {
            let hyphenated = span.hyphenate ? hypher.hyphenate(word) : [word];

            if (hyphenated.length > 1 && word.length > 4) {
                hyphenated.forEach(function (part, partIndex, partArray) {
                    nodes.push({style: span, value: linebreak.box(measureText(span.fontFamily, span.fontSize, part), part)});
                    if (partIndex !== partArray.length - 1) {
                        nodes.push({style: span, value: linebreak.penalty(hyphenWidth, hyphenPenalty, 1)});
                    }
                });
            } else {
                nodes.push({style: span, value: linebreak.box(measureText(span.fontFamily, span.fontSize, word), word)});
            }

            if (spanIndex === spanArray.length - 1 && index === array.length - 1) {
                nodes.push({style: span, value: linebreak.glue(0, linebreak.infinity, 0)});
                nodes.push({style: span, value: linebreak.penalty(0, -linebreak.infinity, 1)});
            }
            // don't add space after a span
            else if (index !== array.length - 1) {
                nodes.push({style: span, value: linebreak.glue(0, 12, 0)});
                nodes.push({style: span, value: linebreak.penalty(0, 0, 0)});
                nodes.push({style: span, value: linebreak.glue(spaceWidth, -12, 0)});
            }
        });
    });

    return nodes;
}

export function center(measureText: (fontFamily: string, fontSize: number, text: string) => number, hypher, spans: T.Span[], options): T.Node[] {
    let nodes: T.Node[] = [];

    // Although not specified in the Knuth and Plass whitepaper, this box is necessary
    // to keep the glue from disappearing.
    if (spans.length > 0) {
        nodes.push({style: spans[0], value: linebreak.box(0, '')});
        nodes.push({style: spans[0], value: linebreak.glue(0, 12, 0)});
    }

    spans.forEach(function (span, spanIndex, spanArray) {
        let words = span.text.split(/\s/),
        spaceWidth = measureText(span.fontFamily, span.fontSize, ' '),
        o = {
            space: {
                width: options && options.space.width || 3,
                stretch: options && options.space.stretch || 6,
                shrink: options && options.space.shrink || 9
            }
        },
        hyphenWidth = measureText(span.fontFamily, span.fontSize, '-'),
        hyphenPenalty = 100,
        spaceStretch = (spaceWidth * o.space.width) / o.space.stretch,
        spaceShrink = (spaceWidth * o.space.width) / o.space.shrink;

        words.forEach(function (word, index, array) {
            let hyphenated = hypher.hyphenate(word);
            if (hyphenated.length > 1 && word.length > 4) {
                hyphenated.forEach(function (part, partIndex, partArray) {
                    nodes.push({style: span, value: linebreak.box(measureText(span.fontFamily, span.fontSize, part), part)});
                    if (partIndex !== partArray.length - 1) {
                        nodes.push({style: span, value: linebreak.penalty(hyphenWidth, hyphenPenalty, 1)});
                    }
                });
            } else {
                nodes.push({style: span, value: linebreak.box(measureText(span.fontFamily, span.fontSize, word), word)});
            }

            if (spanIndex === spanArray.length - 1 && index === array.length - 1) {
                nodes.push({style: span, value: linebreak.glue(0, 12, 0)});
                nodes.push({style: span, value: linebreak.penalty(0, -linebreak.infinity, 0)});
            }
            // don't add space after a span
            else if (index !== array.length - 1) {
                nodes.push({style: span, value: linebreak.glue(0, 12, 0)});
                nodes.push({style: span, value: linebreak.penalty(0, 0, 0)});
                nodes.push({style: span, value: linebreak.glue(spaceWidth, -24, 0)});
                nodes.push({style: span, value: linebreak.box(0, '')});
                nodes.push({style: span, value: linebreak.penalty(0, linebreak.infinity, 0)});
                nodes.push({style: span, value: linebreak.glue(0, 12, 0)});
            }
        });
    });

    return nodes;
}
