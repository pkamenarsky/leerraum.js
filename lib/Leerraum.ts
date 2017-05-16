const linebreak = require('./typeset/linebreak').linebreak();

const PDFDocument = require('pdfkit');
const fs = require('fs');

const Hypher = require('hypher');
const en = require('hyphenation.en-us');

const hypher_en = new Hypher(en);

import * as T from './Types';
import * as U from './Utils';
import * as F from './typeset/Formatter';

export * from './Types';

// Combinators -------------------------------------------------------------------- 

export function combine(renderers: [(bbox: T.BBox) => T.BBox, T.Renderer][]): T.Renderer {
    return (measures, bboxes) => {
        let rendered_bboxes: T.BBox[] = [];
        let temp_bboxes: T.BBox[] = [];
        let text_nodes: T.RenderNode[] = [];

        for (let [streamf, renderer] of renderers) {
            let [rendered_bboxes_, rendered_nodes_] = renderer(measures, U.map(streamf)(bboxes));

            temp_bboxes = temp_bboxes.concat(rendered_bboxes_);
            text_nodes = text_nodes.concat(rendered_nodes_);
        }

        // rendered_bboxes_/temp_bboxes may span multiple bboxes from the original bboxes stream; however, other renderers rely
        // on the fact that the rendered bboxes are always contained in their original bbox. this is why we need to
        // find out which rendered box intersects with which original bbox here.
        // this is O(n^2); could be simplified and sped up if renderers return original bbox index along with rendered bboxes.
        let intersect_map: { [key: number]: T.BBox[] } = {};

        for (let bbox of temp_bboxes) {
            let index = 0, bbox_, intersected = false;

            while (bbox_ = bboxes(index)) {
                if (U.bboxesIntersect(bbox, bbox_)) {
                    if (intersect_map[index] === undefined) {
                        intersect_map[index] = [];
                    }

                    intersect_map[index].push(bbox);
                    intersected = true;
                }
                else if (intersected) {
                    break;
                }

                index++;
            }
        }

        // we need to return the rendered bboxes in the same order as the bbox stream, so we sort by bbox stream index here
        let intersect_indices = Object.keys(intersect_map).sort();

        for (let intersect_index of intersect_indices) {
            let intersect_list = intersect_map[intersect_index];
            let rendered_bbox = intersect_list[0];

            for (let index = 1; index < intersect_list.length; index++) {
                rendered_bbox = U.mergeBBoxes(rendered_bbox, intersect_list[index]);
            }

            rendered_bboxes.push(rendered_bbox);
        }


        return [rendered_bboxes, text_nodes];
    }
}

export function vertically(renderers: T.Renderer[]): T.Renderer {
    return (measures, bboxes) => {
        let text_nodes: T.RenderNode[] = [];
        let bboxes_ = bboxes;
        let rendered_bboxes: T.BBox[] = [];

        for (let renderer of renderers) {
            let [rendered_bboxes_, rendered_nodes_] = renderer(measures, bboxes_);

            if (rendered_bboxes_.length > 0) {
                let last_bbox: T.BBox | null = null;
                let rendered_bbox = rendered_bboxes_[rendered_bboxes_.length - 1];
                let rendered_max_y = 0;

                let index = 0;
                while ((last_bbox = bboxes_(index)) !== null) {
                    if (U.bboxesIntersect(last_bbox, rendered_bbox))
                        break;
                    index++;
                }

                if (last_bbox != null) {
                    let rest_bbox = {
                        x: last_bbox.x,
                        y: rendered_bbox.y + rendered_bbox.height,
                        width: last_bbox.width,
                        height: last_bbox. y + last_bbox.height - (rendered_bbox. y + rendered_bbox.height)
                    };

                    if (rest_bbox.height > 0) {
                        bboxes_ = U.cons<T.BBox>(rest_bbox, U.skip<T.BBox>(index + 1, bboxes_));
                    }
                    else {
                        bboxes_ = U.skip(index + 1, bboxes_);
                    }
                }
            }

            rendered_bboxes = rendered_bboxes.concat(rendered_bboxes_);
            text_nodes = text_nodes.concat(rendered_nodes_);
        }

        return [rendered_bboxes, text_nodes];
    }
}

// Renderers ---------------------------------------------------------------------- 

// TODO: letter spacing
export function renderParagraph(paragraph: T.Paragraph): T.Renderer {
    return (measures, bboxes) => {

        let text_nodes: T.RenderNode[] = [];
        let text_y = 0;
        let y;
        let old_bbox: T.BBox | null = null;
        let current_bbox, current_bbox_index;
        const rendered_bboxes: T.BBox[] = [];

        const getBBoxForTextY: (leading: number, y: number) => [(T.BBox | null), number] = (leading, y) => {
            let top = 0, index = 0, bbox: T.BBox | null = null;

            while ((bbox = bboxes(index)) !== null) {
                if (y - top < bbox.height) {
                    return [bbox, index];
                }

                top += Math.floor(bbox.height / leading) * leading;
                index++;
            }

            return [null, index];
        }

        const linelength = (line) => {
            const [bbox, _] = getBBoxForTextY(paragraph.leading, text_y + (line + 1) * paragraph.leading);
            const indent = (paragraph.leftIndentation ? paragraph.leftIndentation(line) : 0) + 
                (paragraph.rightIndentation ? paragraph.rightIndentation(line) : 0);
            return bbox !== null ? bbox.width - indent : null;
        };
        let align;

        switch (paragraph.align) {
        case 'left':
        default:
            align = F.left;
            break;
        case 'center':
            align = F.center;
            break;
        case 'justify':
            align = F.justify;
            break;
        }

        const nodes: T.Node[] = align(measures.measure, paragraph.hypher || hypher_en, paragraph.spans, null);
        const breaks = linebreak(nodes.map((n) => n.value), U.memoize(linelength), { tolerance: paragraph.tolerance || 10 });
        const lines: { ratio: number, nodes: T.Node[], position: number}[] = [];
        let lineStart = 0;

        // typeset: Iterate through the line breaks, and split the nodes at the
        // correct point.
        for (let i = 1; i < breaks.length; i += 1) {
            let point = breaks[i].position, r = breaks[i].ratio;
            
            for (let j = lineStart; j < nodes.length; j += 1) {
                // typeset: After a line break, we skip any nodes unless they are boxes or forced breaks.
                if (nodes[j].value.type === 'box' || (nodes[j].value.type === 'penalty' && nodes[j].value.penalty === -linebreak.infinity)) {
                    lineStart = j;
                    break;
                }
            }

            lines.push({ratio: r, nodes: nodes.slice(lineStart, point + 1), position: point});
            lineStart = point;
        }

        y = 0;
        lines.forEach(function (line, lineIndex) {
            let x = 0;
            let x_offset = 0;
            let x_indent = paragraph.leftIndentation ? paragraph.leftIndentation(lineIndex) : 0;

            y += paragraph.leading;
            text_y += paragraph.leading;

            [current_bbox, current_bbox_index] = getBBoxForTextY(paragraph.leading, text_y);

            if (old_bbox !== null && !U.bboxEq(current_bbox, old_bbox)) {
                y = paragraph.leading;
            }

            old_bbox = current_bbox;

            line.nodes.forEach(function (node, index, array) {
                // workaround for pdfkit's blatant disregard of baselines :)
                let asc = measures.fontMetrics(node.style.fontFamily).ascender;
                let y_offset = -asc / 1000 * node.style.fontSize;

                let x_ = current_bbox.x + x, y_ = current_bbox.y + y;

                if (node.value.type === 'box') {
                    // try to left align glyph edges
                    if (x === 0) {
                        let leftBearing = node.value.value[0] ? measures.glyphMetrics(node.style.fontFamily, node.value.value[0]).leftBearing: 0;
                        x_offset = -leftBearing / 1000 * node.style.fontSize;
                    }

                    text_nodes.push({
                        type: 'text',
                        x: x_ + x_offset + x_indent,
                        y: y_ + y_offset,
                        span: node.style,
                        text: node.value.value,
                    });
                    x += node.value.width;
                } else if (node.value.type === 'glue') {
                    x += node.value.width + line.ratio * (line.ratio < 0 ? node.value.shrink : node.value.stretch);
                } else if (node.value.type === 'penalty' && node.value.penalty === 100 && index === array.length - 1) {
                    text_nodes.push({
                        type: 'text',
                        x: x_ + x_offset + x_indent,
                        y: y_ + y_offset,
                        span: node.style,
                        text: '-',
                    });
                }
            });
        });

        for (let index = 0; index < current_bbox_index; index++) {
            rendered_bboxes.push(bboxes(index));
        }

        if (current_bbox !== null && current_bbox !== undefined) {
            rendered_bboxes.push({
                x: current_bbox.x,
                y: current_bbox.y,
                width: current_bbox.width,
                height: Math.min(current_bbox.height, y + (paragraph.paragraphLeading || 0))
            });
        }

        return [rendered_bboxes, text_nodes];
    }
}

export function renderText(text: T.Text): T.Renderer {
    return vertically(text.map((p) => renderParagraph(p)));
}

export function renderColumns(gap: number, columns: [number, T.Renderer][]): T.Renderer {
    const xs: [[number, number], T.Renderer][] = [];
    let acc = 0;

    for (let [width, renderer] of columns) {
        xs.push([[acc, width], renderer]);
        acc += width + gap;
    }

    const split = ([x, width]): (BBox) => T.BBox => {
        return (bbox) => {
            return { x: bbox.x + x, y: bbox.y, width: width, height: bbox.height };
        }
    };

    return combine(xs.map(([x, r]) => [split(x), r] as [(BBox) => T.BBox, T.Renderer]));
}

export function renderTable(gap: number, cols: [number], cells: T.Renderer[][]): T.Renderer {
    return vertically(cells.map((row) => renderColumns(gap, U.zip(cols, row))));
}

export function renderPolygon(points: T.Point[], style: T.Style): T.Renderer {
    return (_, bboxes) => {
        const ref = bboxes(0), bbox = U.bboxForPoints(points);

        return [[{ x: ref.x + bbox.x, y: ref.y + bbox.x, width: bbox.width, height: bbox.height}],
                [{type: 'polygon', x: ref.x, y: ref.y, points: points.map((p) => { return { x: p.x + ref.x, y: p.y + ref.y }}), style: style}]];
    }
}

// Misc --------------------------------------------------------------------------- 

export function pdfMeasures(doc): T.Measures {
    return {
        measure: (fontFamily, fontSize, text) => {
            return doc.font(fontFamily)._font.widthOfString(text, fontSize);
        },
        fontMetrics: (fontFamily) => {
            return {
                ascender: doc.font(fontFamily)._font.ascender
            };
        },
        glyphMetrics: (fontFamily, glyph) => {
            return {
                leftBearing: doc.font(fontFamily)._font.font.layout(glyph).glyphs[0]._metrics.leftBearing
            };
        }
    }
}

// PDF output --------------------------------------------------------------------- 

function setStyle(doc, style: T.Style): void {
    if (style.lineWidth !== undefined)
        doc.lineWidth(style.lineWidth);

    if (style.strokeColor !== undefined)
        doc.strokeColor(style.strokeColor);

    if (style.fillColor !== undefined)
        doc.fillColor(style.fillColor);

    if (style.strokeOpacity !== undefined)
        doc.strokeOpacity(style.fillColor);

    if (style.fillOpacity !== undefined)
        doc.fillOpacity(style.fillColor);

    if (style.lineJoin !== undefined)
        doc.lineJoin(style.lineJoin);

    if (style.lineCap !== undefined)
        doc.lineCap(style.lineCap);
}

export function renderToPages(doc, format: T.Format, layers: T.RenderNode[][], background?: (page: number) => T.RenderNode[][]) {
    let page_count = 0;

    for (let layer of layers) {
        for (let node of layer) {
            const page = Math.floor(node.y / format.height);
            page_count = Math.max(page_count, page);
        }
    }

    const pages = Array(page_count + 1).fill([]);

    if (background) {
        for (let page = 0; page <= page_count; page++) {
            for (let layer of background(page)) {
                for (let node of layer) {
                    pages[page].push(node);
                }
            }
        }
    }

    for (let layer of layers) {
        for (let node of layer) {
            const page = Math.floor(node.y / format.height);
            pages[page].push(node);
        }
    }

    for (let page = 0; page <= page_count; page++) {
        if (page != 0) {
            doc.addPage();
        }

        for (let node of pages[page]) {
            doc.save();
            switch (node.type) {
            case 'text':
                doc.save();
                setStyle(doc, node.span.style || {});

                doc.font(node.span.fontFamily).fontSize(node.span.fontSize)._fragment(node.text, node.x, node.y - page * format.height, node.span.options || {});

                doc.restore();
                break;

            case 'polygon':
                doc.save();
                setStyle(doc, node.style || {});

                if (node.style.fillColor && node.style.strokeColor) {
                    doc.polygon.apply(doc, node.points.map(({x: x, y: y}) => [x, y]));
                    doc.fillAndStroke();
                }
                else if (node.style.fillColor) {
                    doc.polygon.apply(doc, node.points.map(({x: x, y: y}) => [x, y]));
                    doc.fill();
                }
                else if (node.style.strokeColor) {
                    doc.polygon.apply(doc, node.points.map(({x: x, y: y}) => [x, y]));
                    doc.stroke();
                }

                doc.restore();
                break;
            }
        }
    }
}

export function renderToPDF(
    filename: string,
    format: T.Format,
    renderers: { bboxes: T.Stream<T.BBox>, renderer: T.Renderer}[],
    background?: (page: number) => { bboxes: T.Stream<T.BBox>, renderer: T.Renderer}[]): void {

        const doc = new PDFDocument({
            layout: 'portrait',
            size: [format.width, format.height]
        });

        const measures = pdfMeasures(doc);

        doc.pipe(fs.createWriteStream(filename));

        let background_: ((page: number) => T.RenderNode[][]) | undefined = undefined;

        if (background) {
            background_ = (page) => {
                return background(page).map((r) => r.renderer(measures, r.bboxes)[1]);
            };
        }

        renderToPages(doc, format, renderers.map((r) => r.renderer(measures, r.bboxes)[1]), background_);

        doc.end();
    }

export function withMargins(format: T.Format, marginTop: number, marginRight: number, marginBottom: number, marginLeft: number): T.Stream<T.BBox> {
    return (index) => {
        return { tag: 'new_page', x: marginLeft, y: index * format.height + marginTop, width: format.width - (marginLeft + marginRight), height: format.height - (marginTop + marginBottom) };
    }
}

export function columnsWithMargins(format: T.Format, gap: number, marginTop: number, marginRight: number, marginBottom: number, marginLeft: number): T.Stream<T.BBox> {
    return (index) => {
        if (index % 2 === 0) {
            return { tag: 'new_page', x: marginLeft, y: Math.floor(index / 2) * format.height + marginTop, width: format.width / 2 - gap / 2 - marginLeft, height: format.height - (marginTop + marginBottom) };
        }
        else {
            return { x: gap / 2 + format.width / 2, y: Math.floor(index / 2) * format.height + marginTop, width: format.width / 2 - gap / 2 - marginRight, height: format.height - (marginTop + marginBottom) };
        }
    }
}

export const pageBreak: T.Renderer = (_, bboxes) => {
    let index = 0, bbox, rendered_bboxes: T.BBox[] = [];

    while (bboxes(index).tag !== 'new_page') {
        rendered_bboxes.push(bboxes(index));
        index++;
    }

    return [rendered_bboxes, []];
}
