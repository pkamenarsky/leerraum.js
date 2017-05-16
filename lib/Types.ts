export type Point = { x: number, y: number };

export type BBox = {
    tag?: string,
    x: number,
    y: number,
    width: number,
    height: number
}

export type Stream<A> = (index: number) => A

export type Renderer = (measures: Measures, bboxes: Stream<BBox>) => [BBox[], RenderNode[]]

export const idRenderer: Renderer = (_, __) => {
    return [[], []];
}

export type RenderNode = {
    type: 'text',
    x: number,
    y: number,
    span: Span,
    text: string
} | {
    type: 'polygon',
    x: number,
    y: number,
    style: Style,
    points: Point[]
};

// Style -------------------------------------------------------------------------- 

export type Style = {
    lineWidth?: number,
    strokeColor?: string,
    fillColor?: string,
    strokeOpacity?: number,
    fillOpacity?: number,
    lineJoin?: 'miter' | 'round' | 'bevel',
    lineCap?: 'butt' | 'round' | 'square',
}

// Text --------------------------------------------------------------------------- 

export type Span = {
    fontFamily: string,
    fontSize: number,
    text: string,

    hyphenate?: boolean,
    style?: Style,

    options?: any
}

export type Paragraph = {
    align?: 'left' | 'center' | 'justify',
    leftIndentation?: (line: number) => number,
    rightIndentation?: (line: number) => number,
    leading: number,
    paragraphLeading?: number,
    tolerance: number,
    spans: Span[],
    hypher?: any
}

export type Text = Paragraph[]

// formatter node
export type Node = {
    style: Span,
    value: any
}

export type Measures = {
    measure: (fontFamily: string, fontSize: number, text: string) => number,
    fontMetrics: (fontFamily: string) => { ascender: number },
    glyphMetrics: (fontFamily: string, glyph: string) => { leftBearing: number },
}

// Formats ------------------------------------------------------------------------ 

export type Format = {
    width: number,
    height: number
}

export function landscape(f: Format): Format {
    return { width: f.height, height: f.width };
}

// https://github.com/devongovett/pdfkit/blob/master/lib/page.coffee
export const formats: { [key: string]: Format } =
    {
        '4A0': { width: 4767.87, height: 6740.79 },
        '2A0': { width: 3370.39, height: 4767.87 },
        A0: { width: 2383.94, height: 3370.39 },
        A1: { width: 1683.78, height: 2383.94 },
        A2: { width: 1190.55, height: 1683.78 },
        A3: { width: 841.89, height: 1190.55 },
        A4: { width: 595.28, height: 841.89 },
        A5: { width: 419.53, height: 595.28 },
        A6: { width: 297.64, height: 419.53 },
        A7: { width: 209.76, height: 297.64 },
        A8: { width: 147.40, height: 209.76 },
        A9: { width: 104.88, height: 147.40 },
        A10: { width: 73.70, height: 104.88 },
        B0: { width: 2834.65, height: 4008.19 },
        B1: { width: 2004.09, height: 2834.65 },
        B2: { width: 1417.32, height: 2004.09 },
        B3: { width: 1000.63, height: 1417.32 },
        B4: { width: 708.66, height: 1000.63 },
        B5: { width: 498.90, height: 708.66 },
        B6: { width: 354.33, height: 498.90 },
        B7: { width: 249.45, height: 354.33 },
        B8: { width: 175.75, height: 249.45 },
        B9: { width: 124.72, height: 175.75 },
        B10: { width: 87.87, height: 124.72 },
        C0: { width: 2599.37, height: 3676.54 },
        C1: { width: 1836.85, height: 2599.37 },
        C2: { width: 1298.27, height: 1836.85 },
        C3: { width: 918.43, height: 1298.27 },
        C4: { width: 649.13, height: 918.43 },
        C5: { width: 459.21, height: 649.13 },
        C6: { width: 323.15, height: 459.21 },
        C7: { width: 229.61, height: 323.15 },
        C8: { width: 161.57, height: 229.61 },
        C9: { width: 113.39, height: 161.57 },
        C10: { width: 79.37, height: 113.39 },
        RA0: { width: 2437.80, height: 3458.27 },
        RA1: { width: 1729.13, height: 2437.80 },
        RA2: { width: 1218.90, height: 1729.13 },
        RA3: { width: 864.57, height: 1218.90 },
        RA4: { width: 609.45, height: 864.57 },
        SRA0: { width: 2551.18, height: 3628.35 },
        SRA1: { width: 1814.17, height: 2551.18 },
        SRA2: { width: 1275.59, height: 1814.17 },
        SRA3: { width: 907.09, height: 1275.59 },
        SRA4: { width: 637.80, height: 907.09 },
        EXECUTIVE: { width: 521.86, height: 756.00 },
        FOLIO: { width: 612.00, height: 936.00 },
        LEGAL: { width: 612.00, height: 1008.00 },
        LETTER: { width: 612.00, height: 792.00 },
        TABLOID: { width: 792.00, height: 1224.00 }
    }
