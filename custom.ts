let IS_OPERATION_RUNNING = false;
const PAUSE_DURATION: number = 100; // ms
const PAUSE_EVERY_TICKS: number = 200; // ticks
const enum ZoneEnd { Origin, Terminal }

player.onChat("terminate", function () {
    if (IS_OPERATION_RUNNING) {
        IS_OPERATION_RUNNING = false;
        mobs.execute(
            mobs.target(MY_AGENT),
            pos(0, 0, 0),
            "tell " + player.name() + " " + "§c⚠ Operation Terminated by Player."
        );
    }
}); 
const enum ZoneCorners {
    Zone,
    Top,
    Bottom,
    Left,   // -X
    Right,  // +X
    Back,   // +Z
    Front   // -Z
}
type Scalar = number;
type Coords = number[]; // Specifically a number array [x, y, z,...]
type Endpoints = Scalar[]; // [min, max, ...]
type Vertices = Coords[]; // [min, max, ...]
type EndTypes = Scalar | Coords;
interface BasicEnds<T extends EndTypes> {
    name: string;
    origin: T;
    terminal: T;
}
interface SegmentInfo {
    count: number;
    interval: number;
    length: number;
}
interface Axial extends BasicEnds<Scalar> {
    length: number;
    segment_count: number;
    segment_interval: number;
    segment_length: number;
    segmentsOf(): Endpoints[];
    toString(): string;
}
interface Spacial extends BasicEnds<Coords> {
    volume: number;
    zone_volume: number;
    zone_count: number;
    zone_dimensions: Coords;
    zonesOf(): Vertices[];
    toString(): string;
}
class Ends<T extends EndTypes> implements BasicEnds<T> {
    protected _name: string;
    protected _origin: T;
    protected _terminal: T;
    public get name(): string { return this._name; }
    public get origin(): T { return this._origin; }
    public get terminal(): T { return this._terminal; }
    constructor(_ends: T[], _name?: string) {
        this._name = _name ? _name : "ends";
        this._origin = _ends[0];
        this._terminal = _ends[1];
    }
}
class MinecraftDimension extends Ends<Scalar> implements Axial {
    public static readonly MINECRAFT_LENGTH_LIMIT: number = 64;
    public static _endpoints(point0: Scalar, point1: Scalar): Endpoints {
        return [Math.min(point0, point1), Math.max(point0, point1)]
    }
    public static configure(dimension: MinecraftDimension, segment_length?: number, segment_count?: number, segment_interval?: number): void {
        const _count: number = segment_count !== undefined ? segment_count : dimension.segment_count;
        const _interval: number = segment_interval !== undefined ? segment_interval : dimension.segment_interval;
        const _length: number = segment_length !== undefined ? segment_length : dimension.segment_length;

        dimension.segment_count = _count;
        dimension.segment_interval = _interval;
        dimension.segment_length = _length;
    }
    public static ofLength(length: number, name?: string): MinecraftDimension {
        const _name: string = name ? name : "relative dimension";
        const _origin: number = 0;
        const _terminal: number = Math.max(1, Math.abs(length)) - 1;
        return new MinecraftDimension([_origin, _terminal], _name);
    }
    // Instance Properties and Methods
    protected segment: SegmentInfo;
    private constructor(ends: Endpoints, name: string = "dimension") {
        super(ends)
        this._name = name;
        this.segment = this.calculate_defaults();
    }
    private calculate_defaults(): SegmentInfo {
        const len = this.length;
        const _count: number = Math.ceil(len / MinecraftDimension.MINECRAFT_LENGTH_LIMIT);
        const _interval: number = Math.ceil(len / _count);
        return { count: _count, interval: _interval, length: _interval };
    }
    public reset(): void {
        this.segment = this.calculate_defaults();
    }
    public set origin(value: Scalar) {
        this._origin = value;
        if (this._origin > this._terminal) this._terminal = this._origin;
        this.reset();
    }

    public set terminal(value: Scalar) {
        this._terminal = value;
        if (this._terminal < this._origin) this._origin = this._terminal;
        this.reset();
    }

    public get length(): number {
        return Math.abs(this._terminal - this._origin) + 1;
    }

    public set length(value: number) {
        this._terminal = this._origin + Math.max(Math.abs(value), 1) - 1;
        this.reset()
    }
    public get segment_count(): number {
        return this.segment.count;
    }
    public set segment_count(input_count: number) {
        const defaults: SegmentInfo = this.calculate_defaults();
        const min_count: number = defaults.count;
        const max_count: number = this.length;

        const _count: number = Math.max(min_count, Math.min(max_count, Math.abs(input_count)));
        const _interval: number = Math.ceil(this.length / _count);

        this.segment.count = _count;
        this.segment.interval = _interval;
        this.segment.length = Math.min(this.segment.length, _interval);
    }
    public get segment_interval(): number {
        return this.segment.interval;
    }
    public set segment_interval(input_interval: number) {
        const min_interval: number = 1;
        const max_interval: number = MinecraftDimension.MINECRAFT_LENGTH_LIMIT;

        const _interval: number = Math.max(min_interval, Math.min(max_interval, Math.abs(input_interval)));
        const _count: number = Math.ceil(this.length / _interval);

        this.segment.interval = _interval;
        this.segment.count = _count;
        this.segment.length = Math.min(this.segment.length, _interval);
    }
    public get segment_length(): number {
        return this.segment.length;
    }
    public set segment_length(input_length: number) {
        this.segment.length = Math.max(1, Math.min(Math.abs(input_length), this.segment.interval));
    }
    public segmentsOf(): Endpoints[] {
        const segments: Endpoints[] = [];

        const line_origin: number = this._origin;
        const segment_interval: number = this.segment_interval;
        const segment_length: number = this.segment_length;
        const segment_count: number = this.segment_count;

        for (let segment_index: number = 0; segment_index < segment_count; segment_index++) {
            const _origin: number = line_origin + (segment_interval * segment_index);
            const _terminal: number = _origin + (segment_length - 1);

            const line_segment: Endpoints = [_origin, _terminal];
            segments.push(line_segment);
        }
        return segments;
    }
    public toString(): string {
        const segment_str: string = "{ " +
            "count: " + this.segment.count + ", " +
            "interval: " + this.segment.interval + ", " +
            "length: " + this.segment.length + " }";

        return "{ " +
            "name: " + this.name + ", " +
            "origin: " + this._origin + ", " +
            "terminal: " + this._terminal + ", " +
            "length: " + this.length + ", " +
            "segment: " + segment_str + " }";
    }
}
class MinecraftZone extends Ends<Coords> implements Spacial {
    public static readonly MINECRAFT_VOLUME_LIMIT: number = 32768;
    public static vertices(_coords_array: Coords[]): Vertices {
        const initial_coords: Coords = (_coords_array.length === 0) ? [] : _coords_array[0];

        let x_min: number = initial_coords[0] || 0;
        let x_max: number = initial_coords[0] || 0;
        let y_min: number = initial_coords[1] || 0;
        let y_max: number = initial_coords[1] || 0;
        let z_min: number = initial_coords[2] || 0;
        let z_max: number = initial_coords[2] || 0;

        for (const _coords of _coords_array) {
            if (_coords[0] < x_min) { x_min = _coords[0] }
            if (_coords[0] > x_max) { x_max = _coords[0] }

            if (_coords[1] < y_min) { y_min = _coords[1] }
            if (_coords[1] > y_max) { y_max = _coords[1] }

            if (_coords[2] < z_min) { z_min = _coords[2] }
            if (_coords[2] > z_max) { z_max = _coords[2] }
        }
        return [[x_min, y_min, z_min], [x_max, y_max, z_max]];
    }
    public static positionToCoords(pos0: Position): Coords {
        const worldPos: Position = pos0.toWorld()
        return [worldPos.getValue(Axis.X), worldPos.getValue(Axis.Y), worldPos.getValue(Axis.Z)]
    }
    public static coordsToPosition(coord: Coords): Position {
        return world(coord[0], coord[1], coord[2])
    }

    public static fromPositions(pos0: Position, pos1: Position, name?: string): MinecraftZone {
        const _name: string = name ? name : "zone";
        const _coord0: Coords = MinecraftZone.positionToCoords(pos0)
        const _coord1: Coords = MinecraftZone.positionToCoords(pos1)
        const _vertices: Vertices = MinecraftZone.vertices([_coord0, _coord1]);
        return new MinecraftZone(_vertices, _name);
    }
    // Instance Methods and Properties
    public readonly X: MinecraftDimension;
    public readonly Y: MinecraftDimension;
    public readonly Z: MinecraftDimension;

    private constructor(ends: Vertices, name: string = 'zone') {
        super(ends);

        const x_length: number = Math.abs(this.terminal[0] - this.origin[0]) + 1;
        const y_length: number = Math.abs(this.terminal[1] - this.origin[1]) + 1;
        const z_length: number = Math.abs(this.terminal[2] - this.origin[2]) + 1;

        this.X = MinecraftDimension.ofLength(x_length, "x");
        this.Y = MinecraftDimension.ofLength(y_length, "y");
        this.Z = MinecraftDimension.ofLength(z_length, "z");

        this.calibrate_zone();
        player.tell(mobs.target(LOCAL_PLAYER), "Zone created!");
    }

    private calibrate_zone(): void {
        player.tell(mobs.target(LOCAL_PLAYER), "Calibrating the Zone...");
        const xz_segment_area: number = Math.abs(this.X.segment_interval * this.Z.segment_interval);
        const y_max_interval: number = Math.floor(MinecraftZone.MINECRAFT_VOLUME_LIMIT / xz_segment_area);
        const y_current_interval: number = this.Y.segment_interval;

        this.Y.segment_interval = Math.min(y_current_interval, y_max_interval);
    }
    public configure_axis(axis_index: number, segment_length?: number, segment_count?: number, segment_interval?: number): void {
        if (axis_index === 0) {
            MinecraftDimension.configure(this.X, segment_length, segment_count, segment_interval);
        } else if (axis_index === 1) {
            MinecraftDimension.configure(this.Y, segment_length, segment_count, segment_interval);
        } else if (axis_index === 2) {
            MinecraftDimension.configure(this.Z, segment_length, segment_count, segment_interval);
        }
    }
    public reset(): void {
        this.X.reset();
        this.Y.reset();
        this.Z.reset();
        this.calibrate_zone();
    }

    public get volume(): number { return this.X.length * this.Y.length * this.Z.length; }
    public get zone_volume(): number { return this.X.segment_interval * this.Y.segment_interval * this.Z.segment_interval; }
    public get zone_count(): number { return this.X.segment_count * this.Y.segment_count * this.Z.segment_count; }
    public get zone_dimensions(): Coords { return [this.X.segment_length, this.Y.segment_length, this.Z.segment_length] }
    public zonesOf(destination?: Position): Vertices[] {
        const zones: Vertices[] = [];

        const x_line_segments: Endpoints[] = this.X.segmentsOf();
        const y_line_segments: Endpoints[] = this.Y.segmentsOf();
        const z_line_segments: Endpoints[] = this.Z.segmentsOf();

        const dest_x: number = destination ? destination.getValue(Axis.X) : this.origin[0];
        const dest_y: number = destination ? destination.getValue(Axis.Y) : this.origin[1];
        const dest_z: number = destination ? destination.getValue(Axis.Z) : this.origin[2];

        const zone_volume: number = this.zone_volume;

        for (const x_segment of x_line_segments) {
            for (const z_segment of z_line_segments) {
                for (const y_segment of y_line_segments) {
                    const zone_origin: Coords = [dest_x + x_segment[0], dest_y + y_segment[0], dest_z + z_segment[0]];
                    const zone_terminal: Coords = [dest_x + x_segment[1], dest_y + y_segment[1], dest_z + z_segment[1]];
                    zones.push([zone_origin, zone_terminal]);
                }
            }
        }
        player.tell(mobs.target(LOCAL_PLAYER), "...subspaces zoned!");

        return zones;
    }


    /**
     * Converts a specific corner or surface endpoint to a Minecraft Position.
     * This method wraps getZoneCorner for convenience.
     * * @param selection The specific corner set (Zone itself or a face)
     * @param which_end Whether to get the Origin (min) or Terminal (max) of that selection
     */
    public toPosition(selection: ZoneCorners, which_end: ZoneEnd): Position {
        const coords = this.getZoneCorner(selection, which_end);
        return MinecraftZone.coordsToPosition(coords);
    }

    /**
     * Retrieves a specific endpoint (Origin or Terminal) of a selected corner set
     * (the global zone or a surface), returning the raw Coords vertex.
     * * @param selection The ZoneCorners enum member (Zone, Top, Bottom, etc.)
     * @param which_end The ZoneEnd enum member (Origin or Terminal)
     * @returns Coords - The calculated [x, y, z] vertex
     */
    public getZoneCorner(which_corners: ZoneCorners, which_end: ZoneEnd): Coords {
        const min = this.origin;
        const max = this.terminal;

        switch (which_corners) {
            case ZoneCorners.Top:
                return (which_end === ZoneEnd.Origin)
                    ? [min[0], max[1], min[2]]
                    : [max[0], max[1], max[2]];
            case ZoneCorners.Bottom:
                return (which_end === ZoneEnd.Origin)
                    ? [min[0], min[1], min[2]]
                    : [max[0], min[1], max[2]];
            case ZoneCorners.Front:
                return (which_end === ZoneEnd.Origin)
                    ? [min[0], min[1], min[2]]
                    : [max[0], max[1], min[2]];
            case ZoneCorners.Back:
                return (which_end === ZoneEnd.Origin)
                    ? [min[0], min[1], max[2]]
                    : [max[0], max[1], max[2]];
            case ZoneCorners.Left:
                return (which_end === ZoneEnd.Origin)
                    ? [min[0], min[1], min[2]]
                    : [min[0], max[1], max[2]];
            case ZoneCorners.Right:
                return (which_end === ZoneEnd.Origin)
                    ? [max[0], min[1], min[2]]
                    : [max[0], max[1], max[2]];
            case ZoneCorners.Zone:
            default:
                return (which_end === ZoneEnd.Origin) ? min : max;
        }
    }

    public toString(): string {
        const o: Coords = this.origin;
        const t: Coords = this.terminal;
        return "{\n" +
            "name: " + this.name + "\n" +
            "origin: " + "[" + o[0] + "," + o[1] + "," + o[2] + "]" + "\n" +
            "terminal: " + "[" + t[0] + "," + t[1] + "," + t[2] + "]" + "\n" +
            "volume: " + this.volume + "\n" +
            "zone_volume: " + this.zone_volume + "\n" +
            "zone_count: " + this.zone_count + "\n" +
            "X: " + this.X.toString() + "\n" +
            "Y: " + this.Y.toString() + "\n" +
            "Z: " + this.Z.toString() + "\n" +
            "}";
    }
}
namespace TrackingInfo {
    export function get_progress_bar(percent: number, width: number = 20): string {
        const filled_chars = Math.floor((percent / 100) * width);
        const empty_chars = width - filled_chars;

        let bar = "[";
        for (let i = 0; i < filled_chars; i++) bar += "■"; // Filled part
        for (let i = 0; i < empty_chars; i++) bar += " ";  // Empty part
        bar += "]";

        return bar + " " + Math.round(percent) + "%";
    }

    export function current_game_ticks(): number {
        return gameplay.timeQuery(GAME_TIME);
    }

    export function elapsed_ticks(start_time: number): number {
        return current_game_ticks() - start_time;
    }

    export function ticks_to_milliseconds(ticks: number): number {
        return Math.abs(Math.round(ticks) * 50);
    }

    export function estimated_milliseconds_remaining(start_time: number, current_index: number, last_index: number): number {
        if (current_index <= 0) return 0; // Avoid division by zero

        const ticks_elapsed = elapsed_ticks(start_time);
        const ticks_per_index: number = ticks_elapsed / current_index;
        const index_remaining: number = last_index - current_index;

        return ticks_to_milliseconds(ticks_per_index * index_remaining);
    }

    export function eta_completion_string(start_time: number, index: number, array_length: number): string {
        if (index <= 0) return "Calculating...";

        const ms_remaining: number = estimated_milliseconds_remaining(start_time, index, array_length - 1);

        if (ms_remaining > 60000) {
            const mins = Math.floor(ms_remaining / 60000);
            const secs = Math.floor((ms_remaining % 60000) / 1000);
            return `${mins}m ${secs}s`;
        } else if (ms_remaining > 1000) {
            return `${Math.floor(ms_remaining / 1000)}s`;
        }

        return "" + ms_remaining + "ms";
    }
}
//% weight=500 color="#361F4D"
//% groups=['Zones', 'Subspaces', 'Coords']
namespace Zones {
    //% block="$zone=variables_get(zone)|$which_corners|$which_end|to Position"
    //% group="Zones"
    export function zoneToPosition(zone: MinecraftZone, which_corners: ZoneCorners, which_end: ZoneEnd): Position {
        return zone.toPosition(which_corners, which_end)
    }
    //% block="$zone=variables_get(zone)|$which_corners|$which_end|Coords"
    //% group="Zones"
    export function getZoneCorner(zone: MinecraftZone, which_corners: ZoneCorners, which_end: ZoneEnd): Coords {
        return zone.getZoneCorner(which_corners, which_end)
    }
    /**
     * Configures the segmentation of a zone axis.
     * Note: MakeCode defaults optional number arguments to 0. 
     * We filter 0 to undefined to prevent overwriting valid configuration with 0.
     */
    //% block="configure zone $zone=variables_get(zone) axis $axis_index || segment length $segment_length segment count $segment_count segment interval $segment_interval"
    //% inlineInputMode="inline"
    //% group="Zones"
    export function configureZoneAxis(zone: MinecraftZone, axis_index: Axis, segment_length?: number, segment_count?: number, segment_interval?: number): void {
        // Filter out 0 values from MakeCode block defaults
        const _length: number | undefined = segment_length === 0 ? undefined : segment_length;
        const _count: number | undefined = segment_count === 0 ? undefined : segment_count;
        const _interval: number | undefined = segment_interval === 0 ? undefined : segment_interval;

        zone.configure_axis(axis_index, _length, _count, _interval);
    }
    /**
     * Resets a zone's dimensions to their default calculations.
     */
    //% block="reset zone $zone=variables_get(zone)"
    //% group="Zones"
    export function resetZone(zone: MinecraftZone): void {
        zone.reset();
    }
    //% block="zone|$name|$p0=minecraftCreateWorldPosition|$p1=minecraftCreateWorldPosition"
    //% name.defl="Zone"
    //% blockSetVariable="zone"
    //% group="Zones"
    export function createZone(p0: Position, p1: Position, name?: string): MinecraftZone {
        return MinecraftZone.fromPositions(p0, p1, name);
    }
    /**
     * Advanced handler function that iterates through an array of spaces.
     * Includes a short pause every 100 ticks or so.
     * Includes a progress bar and message.
     */
    //% block="for each subspace in $collection $subspaces do"
    //% subspaces.shadow=variables_get subspaces.defl="subspaces"
    //% collection.defl="subspaces"
    //% handlerStatement
    //% draggableParameters="reporter, reporter, reporter"
    //% group="Subspaces"
    export function forEachSubspace(subspaces: Vertices[], collection: string, handler: (name: string, origin: Position, terminal: Position) => void): void {
        const SUBSPACES_COUNT: number = subspaces.length;
        const OPERATION_CALL_TIME: number = TrackingInfo.current_game_ticks();

        if (SUBSPACES_COUNT <= 0) { return };

        let last_pause_tick = OPERATION_CALL_TIME;
        IS_OPERATION_RUNNING = true;

        for (let space_index = 0; space_index < SUBSPACES_COUNT; space_index++) {
            if (!IS_OPERATION_RUNNING) {
                const stop_percent = Math.floor((space_index / (SUBSPACES_COUNT)) * 100);
                player.execute("titleraw @s actionbar {\"rawtext\":[{\"text\":\"§cStopped at " + stop_percent + "%\"}]}");
                return;
            }

            const subspace: Vertices = subspaces[space_index];

            // UI Update: Every iteration to keep progress bar smooth
            const bar = TrackingInfo.get_progress_bar((space_index / (SUBSPACES_COUNT)) * 100);
            const eta = TrackingInfo.eta_completion_string(OPERATION_CALL_TIME, space_index, SUBSPACES_COUNT);
            player.execute("titleraw @s actionbar {\"rawtext\":[{\"text\":\"§e" + bar + " | §fETA: " + eta + "\"}]}");

            // Performance Pause: Threshold check is safer than modulo
            if (TrackingInfo.current_game_ticks() - last_pause_tick >= PAUSE_EVERY_TICKS) {
                loops.pause(PAUSE_DURATION);
                last_pause_tick = TrackingInfo.current_game_ticks();
            }

            const subspace_name: string = collection + "_" + space_index;
            const origin_pos: Position = world(subspace[0][0], subspace[0][1], subspace[0][2]);
            const terminal_pos: Position = world(subspace[1][0], subspace[1][1], subspace[1][2]);

            // Chunk Rendering: Teleport Agent (@c) to subspace origin to ensure the area is loaded.
            player.execute("teleport @c " + origin_pos.toString());
            handler(subspace_name, origin_pos, terminal_pos);
        }

        IS_OPERATION_RUNNING = false;
        player.execute("titleraw @s actionbar {\"rawtext\":[{\"text\":\"§a✔ Operation Complete\"}]}");
    }
    /**
     * Returns an array of subspaces for a given zone.
     */
    //% block="get subspaces from $zone=variables_get(zone) || at $destination=minecraftCreateWorldPosition"
    //% blockSetVariable="subspaces"
    //% group="Subspaces"
    export function getSubspaces(zone: MinecraftZone, destination?: Position): Vertices[] {
        return zone.zonesOf(destination);
    }
    /**
     * Anchors a specific axis of a coords to the nearest multiple.
     */
    //% block="anchor $coords $axis at $anchor_to_nearest_multiple"
    //% coords.shadow=variables_get coords.defl="coords"
    //% group="Coords"
    export function anchorCoordsAxis(coords: Coords, axis: Axis, anchor_to_nearest_multiple: number): void {
        const current_val = getCoordsAxis(coords, axis);
        const anchored_coord = Math.floor(current_val / anchor_to_nearest_multiple) * anchor_to_nearest_multiple;
        setCoordsAxis(coords, axis, anchored_coord);
    }
    /**
     * Simple getter for coords coordinates using the Axis enum.
     */
    //% block="get $coords $axis"
    //% coords.shadow=variables_get coords.defl="coords"
    //% group="Coords"
    export function getCoordsAxis(coords: Coords, axis: Axis): number {
        return coords[axis];
    }
    /**
     * Simple setter for coords coordinates using the Axis enum.
     */
    //% block="set $coords $axis to $value"
    //% coords.shadow=variables_get coords.defl="coords"
    //% group="Coords"
    export function setCoordsAxis(coords: Coords, axis: Axis, value: number): void {
        coords[axis] = value;
    }
    //% block="coords|$pos0=minecraftCreateWorldPosition"
    //% blockSetVariable="coords"
    //% group="Coords"
    export function positionToCoords(pos0: Position): Coords {
        return MinecraftZone.positionToCoords(pos0)
    };
    //% block="coords|x|$x|y|$y|z|$z"
    //% blockSetVariable="coords"
    //% group="Coords"
    export function coords(x: number, y: number, z: number): Coords {
        return [x, y, z];
    };
}

/**
 * Types for Cartesian Geometry
 */
type OrderedPair = number[]; // [x, y]
type Sequence = OrderedPair[];
type CartesianDesign = Sequence[];

/**
 * Cartesian Plane blocks for coordinate geometry
 */
//% color="#4B1F70" icon="\uf067" weight=450
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
    //% block="x:$abscissa|y:$ordinate" blockId=cartesianOrderedPair
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
    //% group="Sequence of Ordered Pairs"
    export function defineSequence(pair: OrderedPair): Sequence {
        return [pair];
    }
    /**
     * Add an Ordered Pair to an existing Sequence of Ordered Pairs
     */
    //% block="add $pair=cartesianOrderedPair to $sequence=variables_get(sequence)"
    //% weight=99
    //% group="Sequence of Ordered Pairs"
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
    //% group="Design Sequences"
    export function defineDesign(sequence: Sequence): CartesianDesign {
        return [sequence]
    }
    /**
     * Add a Sequence of Ordered Pairs to a design
     */
    //% block="add $sequence=variables_get(sequence) to $design=variables_get(design)"
    //% weight=97
    //% group="Design Sequences"
    export function addSequenceToDesign(design: CartesianDesign, sequence: Sequence): void {
        design.push(sequence)
    }

    /**
     * Initialize a list of block options with an initial block
     */
    //% block="initial Block $block=minecraftBlock"
    //% block.shadow=minecraftBlock
    //% blockSetVariable="blocks"
    //% weight=96
    //% group=Utility
    export function defineBlocks(block: number): Block[] {
        return [validateBlock(block)];
    }
    /**
     * Add a block to an existing list of block options
     */
    //% block="add $block=minecraftBlock to $block_options=variables_get(blocks)"
    //% weight=95
    //% group=Utility
    export function addBlockToBlocks(block_options: Block[], block: number): void {
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
    //% group=Utility
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
    //% group=Utility
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
    export function drawSequence(sequence: Sequence, block_options: number[], block_index: number, scale: number, y_override?: number) {
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
    //% group="Design Sequences"
    export function drawDesign(design: CartesianDesign, block_options: number[], cycle_blocks: boolean, scale: number, y_override?: number) {
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
    //% blockNamespace=Cartesian group="Cartesian Designs"
    export function marioDesign(): CartesianDesign {
        return Mario.SEQUENCES
    }
}