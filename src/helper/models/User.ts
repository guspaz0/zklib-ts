/**
 * Represents a User as is from ZkDevice and contain methods
 * */
export class User {
    private _uid: number;
    private _name: string;
    private _privilege: number;
    private _password: string;
    private _group_id: string | number;
    private _user_id: string;
    private _card: number;

    /**
     * Creates a new User instance
     * @param uid User ID
     * @param name User name
     * @param privilege Privilege level
     * @param password User password (default: "")
     * @param group_id Group ID (default: "")
     * @param user_id Alternate user ID (default: "")
     * @param card Card number (default: 0)
     */
    constructor(
        uid: number,
        name: string,
        privilege: number,
        password: string = "",
        group_id: string | number = "",
        user_id: string = "",
        card: number = 0
    ) {
        this._uid = uid;
        this._name = name;
        this._privilege = privilege;
        this._password = password;
        this._group_id = group_id;
        this._user_id = user_id;
        this._card = card;
    }

    get uid(): number {
        return this._uid;
    }

    set uid(value: number) {
        this._uid = value;
    }

    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
    }

    get privilege(): number {
        return this._privilege;
    }

    set privilege(value: number) {
        this._privilege = value;
    }

    get password(): string {
        return this._password;
    }

    set password(value: string) {
        this._password = value;
    }

    get group_id(): string | number {
        return this._group_id;
    }

    set group_id(value: string | number) {
        this._group_id = value;
    }

    get user_id(): string {
        return this._user_id;
    }

    set user_id(value: string) {
        this._user_id = value;
    }

    get card(): number {
        return this._card;
    }

    set card(value: number) {
        this._card = value;
    }

    private ensureEncoding(string: string): string {
        try {
            return decodeURIComponent(string);
        } catch (e) {
            return unescape(string);
        }
    }

    public repack29(): Buffer {
        // Pack format: <BHB5s8sIxBhI (total 29 bytes)
        const buf = Buffer.alloc(29);
        let offset = 0;

        buf.writeUInt8(2, offset); offset += 1;
        buf.writeUInt16LE(this._uid, offset); offset += 2;
        buf.writeUInt8(this._privilege, offset); offset += 1;

        const passwordBuf = Buffer.from(this.ensureEncoding(this._password));
        passwordBuf.copy(buf, offset, 0, 5);
        offset += 5;

        const nameBuf = Buffer.from(this.ensureEncoding(this._name));
        nameBuf.copy(buf, offset, 0, 8);
        offset += 8;

        buf.writeUInt32LE(this._card, offset); offset += 4;
        offset += 1; // padding byte
        buf.writeUInt8(0, offset); offset += 1;
        buf.writeUInt32LE(parseInt(this._user_id) || 0, offset);

        return buf;
    }

    public repack73(): Buffer {
        // Pack format: <BHB8s24sIB7sx24s (total 73 bytes)
        const buf = Buffer.alloc(73);
        let offset = 0;

        buf.writeUInt8(2, offset); offset += 1;
        buf.writeUInt16LE(this._uid, offset); offset += 2;
        buf.writeUInt8(this._privilege, offset); offset += 1;

        const passwordBuf = Buffer.from(this.ensureEncoding(this._password));
        passwordBuf.copy(buf, offset, 0, 8);
        offset += 8;

        const nameBuf = Buffer.from(this.ensureEncoding(this._name));
        nameBuf.copy(buf, offset, 0, 24);
        offset += 24;

        buf.writeUInt32LE(this._card, offset); offset += 4;
        buf.writeUInt8(1, offset); offset += 1;

        const groupBuf = Buffer.from(this.ensureEncoding(String(this._group_id)));
        groupBuf.copy(buf, offset, 0, 7);
        offset += 8;

        const userIdBuf = Buffer.from(this.ensureEncoding(String(this._user_id)));
        userIdBuf.copy(buf, offset, 0, 24);

        return buf;
    }
}