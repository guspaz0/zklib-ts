/**
 * Represents a fingerprint template with associated metadata
 */
export class Finger {
    private _uid: number;
    private _fid: number;
    private _valid: number;
    private _template: Buffer;
    private _size: number;
    public readonly mark: string;

    /**
     * Creates a new Finger instance
     * @param uid User internal reference
     * @param fid Finger ID (value >= 0 && value <= 9)
     * @param valid Flag indicating 0 = invalid | 1 = valid | 3 = duress
     * @param template Fingerprint template data buffer
     */
    constructor(uid: number, fid: number, valid: number, template: Buffer) {
        this._uid = Number(uid);
        this._fid = Number(fid);
        this._valid = Number(valid);
        this._template = template;
        this._size = template.length;

        // Create mark showing first and last 8 bytes as hex
        const start = template.slice(0, 8).toString('hex');
        const end = template.slice(-8).toString('hex');
        this.mark = `${start}...${end}`;
    }

    get uid(): number {
        return this._uid;
    }

    set uid(value: number) {
        this._uid = value;
    }

    get fid(): number {
        return this._fid;
    }

    set fid(value: number) {
        this._fid = value;
    }

    get valid(): number {
        return this._valid;
    }

    set valid(value: number) {
        this._valid = value;
    }

    get size(): number {
        return this._size;
    }

    set size(value: number) {
        this._size = value;
    }

    get template(): Buffer {
        return this._template;
    }

    set template(value: Buffer) {
        this._template = value;
        this._size = value.length;
    }

    /**
     * Packs the fingerprint data with metadata into a Buffer
     * @returns Buffer containing packed fingerprint data
     */
    repack(): Buffer {
        // pack("HHbb%is" % (self.size), self.size+6, self.uid, self.fid, self.valid, self.template)
        const buf = Buffer.alloc(6 + this._size); // HHbb = 6 bytes + template size
        let offset = 0;

        buf.writeUInt16LE(this._size + 6, offset); offset += 2;
        buf.writeUInt16LE(this._uid, offset); offset += 2;
        buf.writeUInt8(this._fid, offset); offset += 1;
        buf.writeUInt8(this._valid, offset); offset += 1;

        this._template.copy(buf, offset);

        return buf;
    }

    /**
     * Packs only the fingerprint template data into a Buffer
     * @returns Buffer containing just the template data
     */
    repackOnly(): Buffer {
        // pack("H%is" % (self.size), self.size, self.template)
        const buf = Buffer.alloc(2 + this._size); // H = 2 bytes + template size
        buf.writeUInt16LE(this._size, 0);
        this._template.copy(buf, 2);
        return buf;
    }

    /**
     * Compares this fingerprint with another for equality
     * @param other Another Finger instance to compare with
     * @returns true if all properties and template data match
     */
    equals(other: Finger): boolean {
        if (!(other instanceof Finger)) return false;
        return this._uid === other._uid &&
            this._fid === other._fid &&
            this._valid === other._valid &&
            this._template.equals(other._template);
    }
}