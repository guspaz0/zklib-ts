/**
 * Represents a fingerprint template with associated metadata
 */
export class Finger {
    uid: number;
    fid: number;
    valid: number;
    template: Buffer;
    size: number;
    public readonly mark: string;

    /**
     * Creates a new Finger instance
     * @param uid User internal reference
     * @param fid Finger ID (value >= 0 && value <= 9)
     * @param valid Flag indicating 0 = invalid | 1 = valid | 3 = duress
     * @param template Fingerprint template data buffer
     */
    constructor(uid: number, fid: number, valid: number, template: Buffer) {
        this.uid = Number(uid);
        this.fid = Number(fid);
        this.valid = Number(valid);
        this.template = template;
        this.size = template.length;

        // Create mark showing first and last 8 bytes as hex
        const start = template.slice(0, 8).toString('hex');
        const end = template.slice(-8).toString('hex');
        this.mark = `${start}...${end}`;
    }

    /**
     * Packs the fingerprint data with metadata into a Buffer
     * @returns Buffer containing packed fingerprint data
     */
    repack(): Buffer {
        // pack("HHbb%is" % (self.size), self.size+6, self.uid, self.fid, self.valid, self.template)
        const buf = Buffer.alloc(6 + this.size); // HHbb = 6 bytes + template size
        let offset = 0;

        buf.writeUInt16LE(this.size + 6, offset); offset += 2;
        buf.writeUInt16LE(this.uid, offset); offset += 2;
        buf.writeUInt8(this.fid, offset); offset += 1;
        buf.writeUInt8(this.valid, offset); offset += 1;

        this.template.copy(buf, offset);

        return buf;
    }

    /**
     * Packs only the fingerprint template data into a Buffer
     * @returns Buffer containing just the template data
     */
    repackOnly(): Buffer {
        // pack("H%is" % (self.size), self.size, self.template)
        const buf = Buffer.alloc(2 + this.size); // H = 2 bytes + template size
        buf.writeUInt16LE(this.size, 0);
        this.template.copy(buf, 2);
        return buf;
    }

    /**
     * Compares this fingerprint with another for equality
     * @param other Another Finger instance to compare with
     * @returns true if all properties and template data match
     */
    equals(other: Finger): boolean {
        if (!(other instanceof Finger)) return false;
        return this.uid === other.uid &&
            this.fid === other.fid &&
            this.valid === other.valid &&
            this.template.equals(other.template);
    }
}