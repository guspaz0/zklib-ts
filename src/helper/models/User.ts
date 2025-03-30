/**
 * Represents a User as is from ZkDevice and contain methods
 * */
export class User {
    uid: number;
    name: string;
    privilege: number;
    password: string;
    group_id: string | number;
    user_id: string;
    card: number;

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
        this.uid = uid;
        this.name = name;
        this.privilege = privilege;
        this.password = password;
        this.group_id = group_id;
        this.user_id = user_id;
        this.card = card;
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
        buf.writeUInt16LE(this.uid, offset); offset += 2;
        buf.writeUInt8(this.privilege, offset); offset += 1;

        const passwordBuf = Buffer.from(this.ensureEncoding(this.password));
        passwordBuf.copy(buf, offset, 0, 5);
        offset += 5;

        const nameBuf = Buffer.from(this.ensureEncoding(this.name));
        nameBuf.copy(buf, offset, 0, 8);
        offset += 8;

        buf.writeUInt32LE(this.card, offset); offset += 4;
        offset += 1; // padding byte
        buf.writeUInt8(0, offset); offset += 1;
        buf.writeUInt32LE(parseInt(this.user_id) || 0, offset);

        return buf;
    }

    public repack73(): Buffer {
        // Pack format: <BHB8s24sIB7sx24s (total 73 bytes)
        const buf = Buffer.alloc(73);
        let offset = 0;

        buf.writeUInt8(2, offset); offset += 1;
        buf.writeUInt16LE(this.uid, offset); offset += 2;
        buf.writeUInt8(this.privilege, offset); offset += 1;

        const passwordBuf = Buffer.from(this.ensureEncoding(this.password));
        passwordBuf.copy(buf, offset, 0, 8);
        offset += 8;

        const nameBuf = Buffer.from(this.ensureEncoding(this.name));
        nameBuf.copy(buf, offset, 0, 24);
        offset += 24;

        buf.writeUInt32LE(this.card, offset); offset += 4;
        buf.writeUInt8(1, offset); offset += 1;

        const groupBuf = Buffer.from(this.ensureEncoding(String(this.group_id)));
        groupBuf.copy(buf, offset, 0, 7);
        offset += 8;

        const userIdBuf = Buffer.from(this.ensureEncoding(String(this.user_id)));
        userIdBuf.copy(buf, offset, 0, 24);

        return buf;
    }
}