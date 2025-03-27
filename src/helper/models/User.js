export class User {
    /**
     * 
     * @param {number} uid 
     * @param {string} name 
     * @param {number} privilege 
     * @param {string} password 
     * @param {number} group_id 
     * @param {string} user_id 
     * @param {number} card 
     */
    constructor(uid, name, privilege, password = "", group_id="", user_id="", card = 0) {
        this._uid = uid;
        this._name = name;
        this._privilege = privilege;
        this._password = password;
        this._group_id = group_id;
        this._user_id = user_id;
        this._card = card; //64 int to 40 bit int
    }

    get uid() {
        return this._uid;
    }

    set uid(value) {
        this._uid = value;
    }

    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }

    get privilege() {
        return this._privilege;
    }

    set privilege(value) {
        this._privilege = value;
    }

    get password() {
        return this._password;
    }

    set password(value) {
        this._password = value;
    }

    get group_id() {
        return this._group_id;
    }

    set group_id(value) {
        this._group_id = value;
    }

    get user_id() {
        return this._user_id;
    }

    set user_id(value) {
        this._user_id = value;
    }

    get card() {
        return this._card;
    }

    set card(value) {
        this._card = value;
    }

    ensureEncoding(string) {
        try {
            return decodeURIComponent(string)
        } catch (e) {
            return unescape(string)
        }
    }

    repack29() {
        // Pack format: <BHB5s8sIxBhI (total 29 bytes)
        // Structure:
        // 1 byte: 2 (marker)
        // 2 bytes: uid (H)
        // 1 byte: privilege (B)
        // 5 bytes: password
        // 8 bytes: name
        // 4 bytes: card (I)
        // 1 byte: padding (x)
        // 1 byte: 0 (B)
        // 4 bytes: user_id (I)
        
        const buf = Buffer.alloc(29);
        let offset = 0;
        
        buf.writeUInt8(2, offset); offset += 1;                  // B
        buf.writeUInt16LE(this._uid, offset); offset += 2;       // H
        buf.writeUInt8(this._privilege, offset); offset += 1;     // B
        
        // Write password (5 bytes), truncate or pad with nulls
        const passwordBuf = Buffer.from(this.ensureEncoding(this._password));
        passwordBuf.copy(buf, offset, 0, 5);
        offset += 5;
        
        // Write name (8 bytes), truncate or pad with nulls
        const nameBuf = Buffer.from(this.ensureEncoding(this._name));
        nameBuf.copy(buf, offset, 0, 8);
        offset += 8;
        
        buf.writeUInt32LE(this._card, offset); offset += 4;       // I
        offset += 1; // padding byte (x)
        buf.writeUInt8(0, offset); offset += 1;                  // B
        buf.writeUInt32LE(parseInt(this._user_id) || 0, offset);   // I
        
        return buf;
    }

    repack73() {
        // Pack format: <BHB8s24sIB7sx24s (total 73 bytes)
        // Structure:
        // 1 byte: 2 (marker)
        // 2 bytes: uid (H)
        // 1 byte: privilege (B)
        // 8 bytes: password
        // 24 bytes: name
        // 4 bytes: card (I)
        // 1 byte: 1 (B)
        // 8 bytes: group_id (7s + null)
        // 24 bytes: user_id
        
        const buf = Buffer.alloc(73);
        let offset = 0;
        
        buf.writeUInt8(2, offset); offset += 1;                  // B
        buf.writeUInt16LE(this._uid, offset); offset += 2;        // H
        buf.writeUInt8(this._privilege, offset); offset += 1;     // B
        
        // Write password (8 bytes)
        const passwordBuf = Buffer.from(this.ensureEncoding(this._password));
        passwordBuf.copy(buf, offset, 0, 8);
        offset += 8;
        
        // Write name (24 bytes)
        const nameBuf = Buffer.from(this.ensureEncoding(this._name));
        nameBuf.copy(buf, offset, 0, 24);
        offset += 24;
        
        buf.writeUInt32LE(this._card, offset); offset += 4;       // I
        buf.writeUInt8(1, offset); offset += 1;                   // B
        
        // Write group_id (7 bytes + null)
        const groupBuf = Buffer.from(this.ensureEncoding(String(this._group_id)));
        groupBuf.copy(buf, offset, 0, 7);
        offset += 8; // 7 bytes + 1 null
        
        // Write user_id (24 bytes)
        const userIdBuf = Buffer.from(this.ensureEncoding(String(this._user_id)));
        userIdBuf.copy(buf, offset, 0, 24);
        
        return buf;
    }
}