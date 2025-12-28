import {User} from "../models/User";
import {ZTCP} from "../ztcp";
import {createTCPHeader, decodeTCPHeader, decodeUserData72} from "../helper/utils";
import {COMMANDS, DISCOVERED_CMD, REQUEST_DATA} from "../helper/command";
import {Finger} from "../models/Finger";

export class UserService {
    _zkTcp: ZTCP;
    _users: Map<string, User>;

    constructor(zkTcp: ZTCP) {
        this._zkTcp = zkTcp;
    }

    getUserByUserId(user_id: string) {
        if (this._users.has(String(user_id))) {
            return this._users.get(String(user_id))
        }
        return null;
    }

    async getUsers(): Promise<User[]> {
        try {
            // Free any existing buffer data to prepare for a new request
            if (this._users) {
                return Array.from(this._users.values())
            } else {
                this._users = new Map([])
            }
            if (this._zkTcp.socket) {
                await this._zkTcp.freeData();
            }

            // Request user data
            const data = await this._zkTcp.readWithBuffer(REQUEST_DATA.GET_USERS);

            // Free buffer data after receiving the data
            if (this._zkTcp.socket) {
                await this._zkTcp.freeData();
            }

            // Constants for user data processing
            const USER_PACKET_SIZE = 72;

            // Ensure data.data is a valid buffer
            if (!data.data || !(data.data instanceof Buffer)) {
                throw new Error('Invalid data received');
            }

            let userData = data.data.subarray(4); // Skip the first 4 bytes (headers)
            const users = [];

            // Process each user packet
            while (userData.length >= USER_PACKET_SIZE) {
                // Decode user data and add to the users array
                const user = decodeUserData72(userData.subarray(0, USER_PACKET_SIZE));
                users.push(user);
                this._users.set(user.user_id, user);
                userData = userData.subarray(USER_PACKET_SIZE); // Move to the next packet
            }

            // Return the list of users
            return users;

        } catch (err) {
            // Log the error for debugging
            console.error('Error getting users:', err);
            // Re-throw the error to be handled by the caller
            throw err;
        }
    }

    async DeleteUser(uid: number) {
        try {
            // Validate input parameter
            if (uid <= 0 || uid > 3000) {
                throw new Error('Invalid UID: must be between 1 and 3000');
            }

            // Allocate and initialize the buffer
            const commandBuffer = Buffer.alloc(72);

            // Write UID to the buffer
            commandBuffer.writeUInt16LE(uid, 0);

            // Send the delete command and return the result
            const deleted = await this._zkTcp.executeCmd(COMMANDS.CMD_DELETE_USER, commandBuffer);
            return !!deleted;

        } catch (err) {
            // Log error details for debugging
            console.error('Error deleting user:', err);

            // Re-throw error for upstream handling
            throw err;
        }
    }

    async getTemplates(callbackInProcess: any = () => {}): Promise<Record<string, Finger[]>>{
        let templates = [] as Finger[];
        try {
            if (this._zkTcp.socket) {
                await this._zkTcp.freeData()
            }
            await this._zkTcp.getSizes()
            if (this._zkTcp.fp_count == 0) return { data: [] }

            await this._zkTcp.disableDevice()

            const resp = await this._zkTcp.readWithBuffer(REQUEST_DATA.GET_TEMPLATES) as Record<string, Buffer>

            let templateData = resp.data.subarray(4);
            let totalSize = resp.data.readUIntLE(0, 4);

            while (totalSize) {
                const buf = templateData.subarray(0, 6);
                const size = buf.readUIntLE(0, 2);
                const uid = buf.readUIntLE(2, 2);
                const fid = buf.readUIntLE(4, 1);
                const valid = buf.readUIntLE(5, 1);

                // Force-copy bytes so we don't retain the entire big backing buffer
                const tplBytes = Buffer.from(templateData.subarray(6, size));

                templates.push(new Finger(uid, fid, valid, tplBytes));

                templateData = templateData.subarray(size);
                totalSize -= size;
            }
            return { data: templates }
        } catch (err) {
            this._zkTcp.verbose && console.log("Error getting templates", err)
            return { data: templates };
        } finally {
            await this._zkTcp.freeData()
            await this._zkTcp.enableDevice()
        }
    }

    async DownloadFp(uid: number, fid: number): Promise<Buffer> {
        if (0 > fid || fid > 9)  throw new Error('fid must be between 0 and 9')
        // Allocate and initialize the buffer
        const data = Buffer.alloc(3);

        // Fill the buffer with user data
        data.writeUInt16LE(uid, 0);
        data.writeUIntLE(fid, 2,1);

        this._zkTcp.replyId++;
        const packet = createTCPHeader(COMMANDS.CMD_USERTEMP_RRQ, this._zkTcp.sessionId, this._zkTcp.replyId, data)
        let fingerSize : number = 0;
        let fingerTemplate = Buffer.from([])
        return await new Promise((resolve, reject) => {
            let timeout: NodeJS.Timeout;
            const cleanup = () => {
                if (this._zkTcp.socket) {
                    this._zkTcp.socket.removeListener('data', receiveData);
                }
                if (timeout) clearTimeout(timeout);
            };
            let timer = () => setTimeout(() => {
                cleanup()
                reject(new Error('Time Out, Could not retrieve data'))
            }, this._zkTcp.timeout)
            const receiveData = (data: Buffer): Buffer => {
                timeout = timer()
                if (data.length === 0) return;
                try {
                    if (data.length == 0) return
                    const headers = decodeTCPHeader(data);
                    switch (headers.commandId) {
                        case DISCOVERED_CMD.FID_NOT_FOUND:
                            throw new Error('Could not retrieve data. maybe finger id not exists?')
                        case COMMANDS.CMD_PREPARE_DATA:
                            fingerSize = data.readUIntLE(16,2)
                            break
                        case COMMANDS.CMD_DATA:
                            // A single 'data' event might contain multiple TCP packets combined by the OS
                            // in this method, is possible to get CMD_DATA and CMD_ACK_OK in the same event,
                            // so It's important to split data received for remove CMD_ACK_OK headers
                            fingerTemplate = Buffer.concat([fingerTemplate, data.subarray(16, fingerSize+10)]);
                            // @ts-ignore
                            resolve(fingerTemplate);
                            break;

                        case COMMANDS.CMD_ACK_OK:
                            cleanup();
                            // @ts-ignore
                            resolve(fingerTemplate);
                            return;
                        default:
                            // If it's not a recognized command but has data, it might be raw template data
                            if (headers.commandId > 2000 && headers.commandId < 3000) {
                                // Likely another ACK or system msg
                            } else {
                                fingerTemplate = Buffer.concat([fingerTemplate, data]);
                            }
                            break;
                    }
                    clearTimeout(timeout)
                } catch (e) {
                    cleanup();
                    reject(e);
                }
            };

            if (this._zkTcp.socket) {
                this._zkTcp.socket.on('data', receiveData);
                this._zkTcp.socket.write(packet, (err) => {
                    if (err) {
                        cleanup();
                        reject(err);
                    }
                });
            } else {
                reject(new Error('Socket not initialized'));
            }
        });
    }

    /**
     *
     * @param user_id {string} user
     * @param fingers {Finger[]} array of finger templates instances
     * */
    async saveTemplates(user_id: string, fingers: Finger[] = []) {
        if (fingers.length > 9 || fingers.length == 0) throw new Error("maximum finger length is 10 and can't be empty")
        try {
            await this._zkTcp.disableDevice()
            if (!this._users) {
                await this.getUsers()
            }
            // check users exists
            if (!this._users.has(user_id)) throw new Error("user_id not exists")
            const user = this.getUserByUserId(user_id)


            let fpack = Buffer.alloc(0);
            let table = Buffer.alloc(0);
            const fnum = 0x10;
            let tstart = 0;

            for (const finger of fingers) {
                const tfp = finger.repackOnly();
                const tableEntry = Buffer.alloc(11); // b=1, H=2, b=1, I=4 => 1+2+1+4=8? Wait, bHbI is 1+2+1+4=8 bytes
                tableEntry.writeInt8(2, 0);
                tableEntry.writeUInt16LE(user.uid, 1);
                tableEntry.writeInt8(fnum + finger.fid, 3);
                tableEntry.writeUInt32LE(tstart, 4);

                table = Buffer.concat([table, tableEntry]);
                tstart += tfp.length;
                fpack = Buffer.concat([fpack, tfp]);
            }

            let upack;
            if (this._zkTcp.userPacketSize === 28) {
                upack = user.repack29();
            } else {
                upack = user.repack73();
            }

            const head = Buffer.alloc(12); // III = 3*4 bytes
            head.writeUInt32LE(upack.length, 0);
            head.writeUInt32LE(table.length, 4);
            head.writeUInt32LE(fpack.length, 8);

            const packet = Buffer.concat([head, upack, table, fpack]);
            const bufferResponse = await this._zkTcp.sendWithBuffer(packet);
            const command = 110;
            const commandString = Buffer.alloc(8); // <IHH = I(4) + H(2) + H(2) = 8 bytes
            commandString.writeUInt32LE(12, 0);
            commandString.writeUInt16LE(0, 4);
            commandString.writeUInt16LE(8, 6);

            const cmdResponse = await this._zkTcp.executeCmd(command, commandString);

            if(this._zkTcp.verbose) console.log("finally bulk save user templates: \n", cmdResponse.readUInt16LE(0))

        } catch (error) {
            throw error
        } finally {
            await this._zkTcp.refreshData();
            await this._zkTcp.enableDevice()
        }
    }

    async deleteFinger(uid?: number, fid?: number) {
        try {
            const buf = Buffer.alloc(4)
            buf.writeUInt16LE(uid ? uid : 0,0)
            buf.writeUint16LE(fid ? fid : 0,2)
            const reply = await this._zkTcp.executeCmd(COMMANDS.CMD_DELETE_USERTEMP, buf)
            return !!reply
        } catch (error) {
            throw new Error("Can't save utemp");
        } finally {
            await this._zkTcp.refreshData()
        }
    }

    async enrollInfo(uid: number , tempId: number, userId: string = '') {
        let done = false;
        try {
            const userBuf = Buffer.alloc(24);
            userBuf.write(userId.toString(), 0, 24, 'ascii');
            let commandString = Buffer.concat([
                userBuf,
                Buffer.from([tempId, 1])
            ]);

            const cancel = await this._zkTcp.cancelCapture();

            const cmdResponse = await this._zkTcp.executeCmd(COMMANDS.CMD_STARTENROLL, commandString);

            this._zkTcp.timeout = 60000; // 60 seconds timeout
            let attempts = 3;

            while (attempts > 0) {
                if (this._zkTcp.verbose) console.log(`A:${attempts} esperando primer regevent`);

                let dataRecv = await this._zkTcp.readSocket(17)
                await this._zkTcp.ackOk();

                if (dataRecv.length > 16) {
                    const padded = Buffer.concat([dataRecv, Buffer.alloc(24 - dataRecv.length)]);
                    const res = padded.readUInt16LE(16);
                    if (this._zkTcp.verbose) console.log(`res ${res}`);
                    if (res === 0 || res === 6 || res === 4) {
                        if (this._zkTcp.verbose) console.log("posible timeout o reg Fallido");
                        break;
                    }
                }
                if (this._zkTcp.verbose) console.log(`A:${attempts} esperando 2do regevent`);

                dataRecv = await this._zkTcp.readSocket(17)
                await this._zkTcp.ackOk();
                if (this._zkTcp.verbose) console.log(dataRecv);

                if (dataRecv.length > 8) {
                    const padded = Buffer.concat([dataRecv, Buffer.alloc(24 - dataRecv.length)]);
                    const res = padded.readUInt16LE(16);
                    if (this._zkTcp.verbose) console.log(`res ${res}`);
                    if (res === 6 || res === 4) {
                        if (this._zkTcp.verbose) console.log("posible timeout o reg Fallido");
                        break;
                    } else if (res === 0x64) {
                        if (this._zkTcp.verbose) console.log("ok, continue?");
                        attempts--;
                    }
                }
            }

            if (attempts === 0) {
                const dataRecv = await this._zkTcp.readSocket(17);
                await this._zkTcp.ackOk();
                if (this._zkTcp.verbose) console.log(dataRecv.toString('hex'));

                const padded = Buffer.concat([dataRecv, Buffer.alloc(24 - dataRecv.length)]);
                let res = padded.readUInt16LE(16);

                if (this._zkTcp.verbose) console.log(`res ${res}`);
                if (res === 5) {
                    if (this._zkTcp.verbose) console.log("finger duplicate");
                }
                if (res === 6 || res === 4) {
                    if (this._zkTcp.verbose) console.log("posible timeout");
                }
                if (res === 0) {
                    const size = padded.readUInt16LE(10);
                    const pos = padded.readUInt16LE(12);
                    if (this._zkTcp.verbose) console.log(`enroll ok ${size} ${pos}`);
                    done = true;
                }
            }

            //this.__sock.setTimeout(this.__timeout);
            await this._zkTcp.regEvent(0); // TODO: test
            return done;
        } catch (error) {
            throw error
        } finally {
            await this._zkTcp.cancelCapture();
            await this._zkTcp.verifyUser(undefined);
        }
    }
    async verify(uid: number){
        try {
            let command_string = '' as string | Buffer
            if (uid) {
                command_string = Buffer.alloc(4)
                command_string.writeUInt32LE(uid,0)
            }
            const reply = await this._zkTcp.executeCmd(COMMANDS.CMD_STARTVERIFY, command_string)
            if (this._zkTcp.verbose) console.log(reply.readUInt16LE(0))
            return !!reply
        } catch (error) {
            console.error(error)
        }
    }

    /**
     * Upload a single fingerprint for a given user id
     * @param user_id {string} user id for customer
     * @param fingerTemplate {string} finger template in base64 string
     * @param fid {number} finger id is a number between 0 and 9
     * @param fp_valid {number} finger flag. e.g., valid=1, duress=3
     */
    async uploadFingerTemplate(user_id: string, fingerTemplate: string, fid: number, fp_valid: number){
        try {
            // if (!this._users) await this.getUsers()
            // if (!this._users.has(user_id)) throw new Error(`user id/pin ${user_id} does not exist`);
            const check_ACK_OK = (buf: Buffer) => {
                let resp_cmd = initPacket.readUInt16LE(0)
                if (resp_cmd === COMMANDS.CMD_ACK_OK) return true
                else throw new Error(`received unexpected command: ${resp_cmd}`);
            }

            const user = { uid: +user_id} // this._users.get(user_id);
            await this._zkTcp.disableDevice()
            const prep_struct = Buffer.alloc(4);
            const fingerBuffer = Buffer.from(fingerTemplate, 'base64')
            const fp_size = fingerBuffer.length;

            prep_struct.writeUInt16LE(fp_size,0);
            const initPacket = await this._zkTcp.executeCmd(COMMANDS.CMD_PREPARE_DATA, prep_struct)
            check_ACK_OK(initPacket);

            const fpPacket = await this._zkTcp.executeCmd(COMMANDS.CMD_DATA, fingerBuffer)
            check_ACK_OK(fpPacket);

            const cheksumPacket = await this._zkTcp.executeCmd(COMMANDS.CMD_CHECKSUM_BUFFER, '')
            check_ACK_OK(cheksumPacket)

            const checksum = cheksumPacket.readUInt32LE(8)

            const tmp_wreq = Buffer.alloc(6);
            tmp_wreq.writeUInt16LE(user.uid,0);
            tmp_wreq.writeUIntLE(fid,2,1);
            tmp_wreq.writeUIntLE(fp_valid,3,1);

            tmp_wreq.writeUInt16LE(fp_size,4);
            const tmp_wreqPacket = await this._zkTcp.executeCmd(COMMANDS.CMD_TMP_WRITE, tmp_wreq)
            check_ACK_OK(tmp_wreqPacket)

            const freeData = await this._zkTcp.executeCmd(COMMANDS.CMD_FREE_DATA, '')
            return check_ACK_OK(freeData);

        } catch (err) {
            throw err
        } finally {
            await this._zkTcp.refreshData()
            await this._zkTcp.enableDevice()
        }
    }
}