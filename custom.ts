/**
 * Types for Cartesian Geometry
 */
type OrderedPair = number[]; // [x, y]
type Sequence = OrderedPair[];
type CartesianDesign = Sequence[];

/**
 * Cartesian Plane blocks for coordinate geometry
 */
//% color="#4B1F70" icon="\uf067"
namespace Cartesian {
    export const MIN_scale: number = 1;
    export const MAX_scale: number = 12;
    export const DEFAULT_block: Block = STONE;
    export const INVALID_blocks: Block[] = [TNT, LAVA, FIRE, WATER];

    /**
     * Helper to constrain scale within namespace limits
     */
    export function clampscale(scale: number): number {
        const val = Math.abs(scale);
        return Math.min(Math.max(val, MIN_scale), MAX_scale);
    }

    /**
     * Helper to ensure a valid Y coordinate is always present
     */
    export function clampY(y_override?: number): number {
        return (y_override !== null && y_override !== undefined) ? y_override : 1;
    }
    /**
     * Checks if a block is allowed. Returns the DEFAULT_block if the block is invalid.
     */
    export function validateBlock(block: Block): Block {
        for (let invalid of INVALID_blocks) {
            if (block == invalid) {
                return DEFAULT_block;
            }
        }
        return block;
    }

    /**
     * Create an Ordered Pair (abscissa: x, ordinate: y) 
     */
    //% block="$abscissa|$ordinate" blockId=cartesianOrderedPair
    //% blockSetVariable="pair"
    //% blockHidden=true
    export function orderedPair(abscissa: number, ordinate: number): OrderedPair {
        return [abscissa, ordinate];
    }

    /**
     * Initialize a Sequence of Ordered Pairs with an initial Ordered Pair
     */
    //% block="initial Sequence $pair=cartesianOrderedPair"
    //% blockSetVariable="sequence"
    //% weight=100
    export function defineSequence(pair: OrderedPair): Sequence {
        return [pair];
    }
    /**
     * Add an Ordered Pair to an existing Sequence of Ordered Pairs
     */
    //% block="add $pair=cartesianOrderedPair to $sequence=variables_get(sequence)"
    //% weight=99
    export function addOrderedPairToSequence(sequence: Sequence, pair: OrderedPair): void {
        if (sequence) {
            sequence.push(pair);
        }
    }

    /**
     * Start a new design from a Sequence of Ordered Pairs
     */
    //% block="initial Design $sequence=variables_get(sequence)"
    //% blockSetVariable="design"
    //% weight=98
    export function defineDesign(sequence: Sequence): CartesianDesign {
        return [sequence]
    }
    /**
     * Add a Sequence of Ordered Pairs to a design
     */
    //% block="add $sequence=variables_get(sequence) to $design=variables_get(design)"
    //% weight=97
    export function addSequenceToDesign(design: CartesianDesign, sequence: Sequence): void {
        design.push(sequence)
    }

    /**
     * Initialize a list of block options with an initial block
     */
    //% block="initial Block $block"
    //% blockSetVariable="blocks"
    //% weight=96
    export function defineBlocks(block: Block): Block[] {
        return [validateBlock(block)];
    }
    /**
     * Add a block to an existing list of block options
     */
    //% block="add $block to $block_options=variables_get(blocks)"
    //% weight=95
    export function addBlockToBlocks(block_options: Block[], block: Block): void {
        if (block_options) {
            block_options.push(validateBlock(block));
        }
    }

    /**
     * Convert an Ordered Pair to a World Position
     */
    //% block="to Position $pair=cartesianOrderedPair||at y $y_override scale $scale"
    //% pair.shadow=cartesianOrderedPair
    //% scale.defl=1
    //% blockHidden=true
    export function pairToPosition(pair: OrderedPair, y_override?: number, scale?: number): Position {
        const worldY = clampY(y_override);
        const _scale = clampscale(scale || 1);

        const worldX = pair[0] * _scale;
        const worldZ = (0 - pair[1]) * _scale;

        return world(worldX, worldY, worldZ);
    }

    /**
     * Execute code for every segment in a Sequence of Ordered Pairs
     */
    //% block="for each two Position segment of $sequence=variables_get(sequence) scale|$scale at y|$y_override"
    //% handlerStatement
    //% scale.defl=1 y_override.defl=1
    //% draggableParameters="reporter, reporter"
    //% blockHidden=true
    export function forEachPositionSegment(sequence: Sequence, scale: number, y_override: number, handler: (origin: Position, terminal: Position) => void): void {
        if (!sequence || sequence.length < 2) return;

        for (let i = 1; i < sequence.length; i++) {
            const _origin: Position = Cartesian.pairToPosition(sequence[i - 1], y_override, scale);
            const _terminal: Position = Cartesian.pairToPosition(sequence[i], y_override, scale);
            handler(_origin, _terminal);

            if (i % 32 === 0) {
                loops.pause(50);
            }
        }
    }

    /**
     * Draw a single Sequence of Ordered Pairs using provided blocks
     */
    //% block="draw $sequence=variables_get(sequence)|$block_options=variables_get(blocks)|index|$block_index|scale|$scale||at y|$y_override"
    //% inlineInputMode="inline"
    //% scale.defl=1 y_override.defl=1
    //% blockHidden=true
    export function drawSequence(sequence: Sequence, block_options: Block[], block_index: number, scale: number, y_override?: number) {
        Cartesian.forEachPositionSegment(sequence, scale, clampY(y_override), function (origin, terminal) {
            shapes.line(
                validateBlock(block_options[block_index]),
                origin,
                terminal
            )
        })
    }

    /**
     * Draw an entire Cartesian Design
     */
    //% block="draw $design=variables_get(design)|$block_options=variables_get(blocks)|cycle blocks?|$cycle_blocks|scale|$scale||at y|$y_override"
    //% inlineInputMode="inline"
    //% scale.defl=1 y_override.defl=1
    //% weight=90
    export function drawDesign(design: CartesianDesign, block_options: Block[], cycle_blocks: boolean, scale: number, y_override?: number) {
        let block_index: number = 0
        const worldY = clampY(y_override);
        for (let line_sequence of design) {
            drawSequence(line_sequence, block_options, block_index, scale, worldY)
            if (cycle_blocks) {
                block_index += 1
                if (block_index >= block_options.length) {
                    block_index = 0
                }
            }
        }
    }
}

namespace Mario {
    const LINE_1: Sequence = [[-11, 4.5], [-10.5, 5.5], [-9, 4.5], [-10, 3.5]];
    const LINE_2: Sequence = [[-9, 4.5], [-8.5, 3.5], [-8, 2], [-7.5, 1], [-8.5, 0.5], [-9, 1], [-10, 2], [-11, 3.5], [-11.5, 5], [-11, 6], [-10, 6.5], [-9.5, 6.5], [-9, 6], [-8.5, 5], [-8.5, 3.5]];
    const LINE_3: Sequence = [[-8, 2], [-7.5, 2.5], [-7, 3.5], [-6.5, 5], [-7.5, 7], [-8, 7], [-9.5, 6.5], [-9.5, 7], [-11, 9.5], [-11, 11.5], [-10, 13], [-8, 15], [-5.5, 17], [-3.5, 18], [-1, 19], [1, 19], [4, 17.5], [6, 15.5], [7, 14], [7.5, 12], [7.5, 10], [6.5, 9.5], [5, 10.5], [3.5, 11], [-1.5, 11], [-4, 10], [-8, 7.5], [-8, 7]];
    const LINE_4: Sequence = [[-1.5, 11], [-2.5, 12], [-2.5, 13.5], [-2, 14.5], [-1, 15], [0, 15.5], [2, 15.5], [3.5, 15], [4, 14], [4, 13], [3.5, 12], [3.5, 11]];
    const LINE_5: Sequence = [[-0.5, 11.5], [-1.5, 12], [0, 15], [1, 14], [1.5, 15], [3.5, 12.5], [2.5, 11.5], [1.5, 13.5], [1, 12.5], [0, 13.5], [-0.5, 11.5]];
    const LINE_6: Sequence = [[-7.5, 1], [-7, 0], [-6, -1.5], [-5, -2], [-4, -2.5], [-2.5, -2.5], [-2, -3.5], [-1, -3.5], [-0.5, -4], [0, -4], [1, -4], [2.5, -3], [3.5, -2.5], [4, -1.5], [5.5, 0], [6, 1], [6.5, 2], [6.5, 3.5], [6.5, 4], [6, 5], [5.5, 6.5], [5.5, 7.5], [4, 7.5], [2, 7.5], [0, 7.5], [-1.5, 7.5], [-4, 7.5], [-5, 7.5], [-8, 7.5], [-5.5, 8.5], [-1.5, 8.5], [2.5, 8.5], [5.5, 8.5], [6, 8], [5.5, 7.5]];
    const LINE_7: Sequence = [[-2, 2], [-5, 3], [-5.5, 2], [-5, 1], [-4, 0], [-3.5, -0.5], [-3, -1], [-2, -1], [-1.5, -0.5], [-1, -1.5], [0, -2], [1, -2], [1.5, -1.5], [3, -1.5], [3.5, -0.5], [4, -0.5], [4.5, 0], [5.5, 1.5], [6, 2], [6, 4], [5.5, 4.5], [5, 3.5], [5, 2], [4.5, 0.5], [3.5, -0.5], [1.5, -1], [0, -0.5], [-1.5, 1], [-2, 2], [-1, 3], [0, 4.5], [1, 5], [1.5, 5], [2.5, 5], [3, 4.5], [4.5, 4.5], [5, 3.5]];
    const LINE_8: Sequence = [[-4, 7.5], [-5, 6.5], [-4, 7], [-3.5, 7], [-2, 7], [-0.5, 6.5], [-1.5, 7.5]];
    const LINE_9: Sequence = [[-4, 7], [-4.5, 6], [-4.5, 5], [-4, 4], [-3.5, 3], [-1.5, 3], [-1, 4], [-1, 6], [-2, 7]];
    const LINE_10: Sequence = [[-3.5, 7], [-4, 6], [-4, 5], [-3.5, 4.5], [-2.5, 4], [-1.5, 4.5], [-1.5, 5], [-1.5, 6], [-2, 7]];
    const LINE_11: Sequence = [[-3, 6.5], [-3.5, 6], [-3.5, 5.5], [-2.5, 5], [-2, 5.5], [-2, 6.5], [-3, 6.5]];
    const LINE_12: Sequence = [[2, 7.5], [1, 6.5], [1.5, 6.5], [2, 7], [2.5, 7.5]];
    const LINE_13: Sequence = [[1.5, 6.5], [1.5, 5]];
    const LINE_14: Sequence = [[2, 7], [2, 5.5], [2.5, 5], [3, 5], [4, 5.5], [4, 7], [3.5, 7.5]];
    const LINE_15: Sequence = [[3, 7.5], [2.5, 7], [2.5, 6], [3, 5.5], [3.5, 6], [3.5, 7], [3, 7.5]];
    const LINE_16: Sequence = [[4, 7.5], [4.5, 7], [4.5, 5], [4.5, 4.5]];
    const LINE_17: Sequence = [[6.5, 4], [7, 3], [7.5, 2.5], [7.5, 1], [6, 1]];
    const LINE_18: Sequence = [[7.5, 1], [8, 0.5], [8, -0.5], [9, -2.5]];
    const LINE_19: Sequence = [[8, 0.5], [9, 0], [10.5, 0], [12, 0.5], [13, 2], [13.5, 1], [12.5, 0], [11.5, -0.5], [10, -1], [9, 0]];
    const LINE_20: Sequence = [[12.5, 0], [12, -2.5], [11, -3], [6.5, -4]];
    const LINE_21: Sequence = [[13, 2], [13, 5], [12, 8], [9.5, 10.5], [7.5, 10]];
    const LINE_22: Sequence = [[6.5, 9.5], [6, 9.5], [5.5, 8.5], [6, 8], [6.5, 7.5]];
    const LINE_23: Sequence = [[11, 8], [10, 8.5], [8, 8.5], [6.5, 7.5], [6, 7], [6, 6], [7, 5.5], [8.5, 6.5], [10, 7], [11.5, 6]];
    const LINE_24: Sequence = [[7, 5.5], [7, 4.5], [7.5, 4], [8, 5], [10, 5], [11, 4.5]];
    const LINE_25: Sequence = [[7.5, 4], [7.5, 3.5], [9, 3], [10, 2.5]];
    const LINE_26: Sequence = [[4, -1.5], [5.5, -2], [6.5, -4], [7, -5], [7.5, -6], [8, -7], [7.5, -8], [6, -7], [5.5, -5.5], [5.5, -4.5], [5, -4], [3.5, -2.5]];
    const LINE_27: Sequence = [[7, -5], [6, -4.5], [6, -5.5], [6.5, -6.5], [7.5, -7], [8, -7]];
    const LINE_28: Sequence = [[0, -4], [1, -5.5], [2, -6.5], [3, -7], [4, -6], [5.5, -4.5]];
    const LINE_29: Sequence = [[1, -5.5], [2, -7], [3, -7.5], [4, -7], [5.5, -5.5]];
    const LINE_30: Sequence = [[2, -7], [3, -9.5], [1.5, -11.5], [-0.5, -10.5], [-1, -9], [-1, -8], [-2, -6], [-3, -4], [-4, -2.5]];
    const LINE_31: Sequence = [[0.5, -8], [1.5, -8], [2, -8.5], [2.5, -9.5], [2, -10], [1.5, -10.5], [0.5, -10.5], [0, -10], [0, -9], [0.5, -8]];
    const LINE_32: Sequence = [[-3.5, -7], [-5.5, -8.5], [-5, -9.5], [-4.5, -10], [-3.5, -10], [-2, -9], [-1, -8]];
    const LINE_33: Sequence = [[-6, -13], [-5, -9.5], [-4.5, -11], [-3.5, -11], [-2, -10], [-1, -9]];
    const LINE_34: Sequence = [[8, -7], [8, -9], [8, -12], [7, -19], [3, -19], [-2, -19], [-7.5, -19], [-6.5, -18], [-6, -16], [-6, -15], [-7, -13], [-6, -13], [-5, -14], [-4.5, -15], [-5, -16], [-6, -16]];
    const LINE_35: Sequence = [[-5.5, -8.5], [-7, -9.5], [-7, -11.5], [-7, -13], [-9, -14], [-10, -14], [-11, -13.5], [-13, -12.5], [-13.5, -14], [-13, -17], [-12.5, -19], [-7.5, -19]];
    const LINE_36: Sequence = [[-13, -12.5], [-12.5, -11.5], [-12, -11.5], [-11, -12], [-8.5, -12], [-7, -11.5]];
    const LINE_37: Sequence = [[-12.5, -11.5], [-12, -10.5], [-11.5, -9], [-11, -8], [-10, -6], [-9, -5], [-7, -3], [-5, -2]];
    const LINE_38: Sequence = [[-11.5, -16], [-12, -17], [-11.5, -17.5], [-11, -17], [-11.5, -16]];
    const LINE_39: Sequence = [[-8.5, -16], [-9, -17], [-8.5, -17.5], [-8, -17], [-8.5, -16]];

    export const SEQUENCES: CartesianDesign = [
        LINE_1, LINE_2, LINE_3, LINE_4, LINE_5, LINE_6, LINE_7, LINE_8,
        LINE_9, LINE_10, LINE_11, LINE_12, LINE_13, LINE_14, LINE_15, LINE_16,
        LINE_17, LINE_18, LINE_19, LINE_20, LINE_21, LINE_22, LINE_23, LINE_24,
        LINE_25, LINE_26, LINE_27, LINE_28, LINE_29, LINE_30, LINE_31, LINE_32,
        LINE_33, LINE_34, LINE_35, LINE_36, LINE_37, LINE_38, LINE_39
    ];

    /**
     * Returns the built-in Mario coordinate sequences
     */
    //% block
    export function marioSequences(): CartesianDesign {
        return Mario.SEQUENCES
    }
}