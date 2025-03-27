/** 
 * @class
*/
export class Finger {
    /**
     * 
    * @param {number} uid user internal reference
    * @param {number} fid finger id (value >= 0 && value <= 9)
    * @param {number} valid or flag indicating 0 = invalid | 1 = valid | 3 = duress
    * @param {number} size size in bytes
    * @param {Buffer} template data buffer
     */
    constructor(uid, fid, valid, template) {
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
    set uid(value) {
        this._uid = value 
    }
    set fid(value){ 
        this._fid = value 
    }
    set valid(value){ 
        this._valid = value
    }
    set size(value) {
        this._size = value
    }
    set template(value){
        this._template = value 
    }

    get uid(){
        return this._uid;
    }
    get fid(){
        return this._fid
    }
    get valid() {
        return this._valid
    }
    get size(){
        return this._size
    }
    get template(){
        return this._template
    }
    repack() {
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

    repackOnly() {
        // pack("H%is" % (self.size), self.size, self.template)
        const buf = Buffer.alloc(2 + this._size); // H = 2 bytes + template size
        buf.writeUInt16LE(this._size, 0);
        this._template.copy(buf, 2);
        return buf;
    }

    equals(other) {
        if (!(other instanceof Finger)) return false;
        return this._uid === other._uid &&
               this._fid === other._fid &&
               this._valid === other._valid &&
               this._template.equals(other._template);
    }

}
