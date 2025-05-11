import {
    createUDPHeader,
    decodeUserData28,
    decodeRecordData16,
    decodeRecordRealTimeLog18,
    decodeUDPHeader,
    exportErrorMessage,
    checkNotEventUDP,
    authKey, RecordData16, UserData28
} from './helper/utils';

import { REQUEST_DATA, COMMANDS } from './helper/command';
import { Constants } from './helper/command';
import { log } from './logs/log';
import timeParser from "./helper/time";
import * as dgram from "node:dgram";

interface DeviceInfo {
    userCounts: number;
    logCounts: number;
    logCapacity: number;
}

interface ChunkedDataResponse {
    data: Buffer | null;
    err: Error | null;
}

export class ZUDP {
    private ip: string;
    private port: number;
    private timeout: number;
    socket: dgram.Socket | null;
    private sessionId: number | null;
    private replyId: number;
    private inport: number;
    private comm_key: number;

    constructor(ip: string, port: number, timeout: number, inport: number, comm_key: number = 0) {
        this.ip = ip;
        this.port = port;
        this.timeout = timeout;
        this.socket = null;
        this.sessionId = null;
        this.replyId = 0;
        this.inport = inport;
        this.comm_key = comm_key;
    }

    createSocket(cbError?: (err: Error) => void, cbClose?: (type: string) => void): Promise<dgram.Socket> {
        return new Promise((resolve, reject) => {
            this.socket = dgram.createSocket('udp4');
            this.socket.setMaxListeners(Infinity);

            this.socket.once('error', (err: Error) => {
                this.socket = null;
                reject(err);
                if (cbError) cbError(err);
            });

            this.socket.once('close', () => {
                this.socket = null;
                if (cbClose) cbClose('udp');
            });

            this.socket.once('listening', () => {
                resolve(this.socket!);
            });

            try {
                this.socket.bind(this.inport);
            } catch (err) {
                this.socket = null;
                reject(err);
                if (cbError) cbError(err as Error);
            }
        });
    }

    async connect(): Promise<boolean> {
        try {
            let reply = await this.executeCmd(COMMANDS.CMD_CONNECT, '');
            if (reply.readUInt16LE(0) === COMMANDS.CMD_ACK_OK) {
                return true;
            }
            if (reply.readUInt16LE(0) === COMMANDS.CMD_ACK_UNAUTH) {
                const hashedCommkey = authKey(this.comm_key, this.sessionId!) as any;
                reply = await this.executeCmd(COMMANDS.CMD_AUTH, hashedCommkey);

                if (reply.readUInt16LE(0) === COMMANDS.CMD_ACK_OK) {
                    return true;
                } else {
                    throw new Error("Authentication error");
                }
            } else {
                throw new Error('NO_REPLY_ON_CMD_CONNECT');
            }
        } catch (err) {
            console.error('Error in connect method:', err);
            throw err;
        }
    }

    async closeSocket(): Promise<unknown> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                resolve(true);
                return;
            }

            const timeout = 2000;
            const timer = setTimeout(() => {
                console.warn('Socket close timeout');
                resolve(true);
            }, timeout);

            this.socket.removeAllListeners('message');
            // @ts-ignore
            this.socket.close((err: any) => {
                clearTimeout(timer);
                if (err) {
                    console.error('Error closing socket:', err);
                    reject(err);
                } else {
                    resolve(true);
                }
                this.socket = null;
            });
        });
    }

    private writeMessage(msg: Buffer, connect: boolean): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not initialized'));
                return;
            }

            let sendTimeoutId: NodeJS.Timeout;

            const onMessage = (data: Buffer) => {
                clearTimeout(sendTimeoutId);
                this.socket!.removeListener('message', onMessage);
                resolve(data);
            };

            this.socket.once('message', onMessage);

            this.socket.send(msg, 0, msg.length, this.port, this.ip, (err) => {
                if (err) {
                    this.socket!.removeListener('message', onMessage);
                    reject(err);
                    return;
                }

                if (this.timeout) {
                    sendTimeoutId = setTimeout(() => {
                        this.socket!.removeListener('message', onMessage);
                        reject(new Error('TIMEOUT_ON_WRITING_MESSAGE'));
                    }, connect ? 2000 : this.timeout);
                }
            });
        });
    }

    private requestData(msg: Buffer): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not initialized'));
                return;
            }

            let sendTimeoutId: NodeJS.Timeout;
            let responseTimeoutId: NodeJS.Timeout;

            const handleOnData = (data: Buffer) => {
                if (checkNotEventUDP(data)) return;

                clearTimeout(sendTimeoutId);
                clearTimeout(responseTimeoutId);
                this.socket!.removeListener('message', handleOnData);
                resolve(data);
            };

            const onReceiveTimeout = () => {
                this.socket!.removeListener('message', handleOnData);
                reject(new Error('TIMEOUT_ON_RECEIVING_REQUEST_DATA'));
            };

            this.socket.on('message', handleOnData);

            this.socket.send(msg, 0, msg.length, this.port, this.ip, (err) => {
                if (err) {
                    this.socket!.removeListener('message', handleOnData);
                    reject(err);
                    return;
                }

                responseTimeoutId = setTimeout(onReceiveTimeout, this.timeout);
            });

            sendTimeoutId = setTimeout(() => {
                this.socket!.removeListener('message', handleOnData);
                reject(new Error('TIMEOUT_IN_RECEIVING_RESPONSE_AFTER_REQUESTING_DATA'));
            }, this.timeout);
        });
    }

    async executeCmd(command: number, data: string | Buffer): Promise<Buffer> {
        try {
            if (command === COMMANDS.CMD_CONNECT) {
                this.sessionId = 0;
                this.replyId = 0;
            } else {
                this.replyId++;
            }

            const buf = createUDPHeader(command, this.sessionId!, this.replyId, data);
            const reply = await this.writeMessage(buf, command === COMMANDS.CMD_CONNECT || command === COMMANDS.CMD_EXIT);

            if (reply && reply.length > 0) {
                if (command === COMMANDS.CMD_CONNECT) {
                    this.sessionId = reply.readUInt16LE(4);
                }
            }

            return reply;
        } catch (err) {
            console.error(`Error executing command ${command}:`, err);
            throw err;
        }
    }

    private async sendChunkRequest(start: number, size: number): Promise<void> {
        this.replyId++;
        const reqData = Buffer.alloc(8);
        reqData.writeUInt32LE(start, 0);
        reqData.writeUInt32LE(size, 4);
        const buf = createUDPHeader(COMMANDS.CMD_DATA_RDY, this.sessionId!, this.replyId, reqData);

        try {
            await new Promise<void>((resolve, reject) => {
                this.socket!.send(buf, 0, buf.length, this.port, this.ip, (err) => {
                    if (err) {
                        log(`[UDP][SEND_CHUNK_REQUEST] Error sending chunk request: ${err.message}`);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (error) {
            log(`[UDP][SEND_CHUNK_REQUEST] Exception: ${error.message}`);
            throw error;
        }
    }

    async readWithBuffer(reqData: Buffer, cb: ((progress: number, total: number) => void) | null = null): Promise<ChunkedDataResponse> {
        this.replyId++;
        const buf = createUDPHeader(COMMANDS.CMD_DATA_WRRQ, this.sessionId!, this.replyId, reqData);

        try {
            const reply = await this.requestData(buf);
            const header = decodeUDPHeader(reply.subarray(0, 8));

            switch (header.commandId) {
                case COMMANDS.CMD_DATA:
                    return { data: reply.subarray(8), err: null };
                case COMMANDS.CMD_ACK_OK:
                case COMMANDS.CMD_PREPARE_DATA:
                    return await this.handleChunkedData(reply, header.commandId, cb);
                default:
                    throw new Error('ERROR_IN_UNHANDLE_CMD ' + exportErrorMessage(header.commandId));
            }
        } catch (err) {
            return { data: null, err: err as Error };
        }
    }

    private async handleChunkedData(
        reply: Buffer,
        commandId: number,
        cb: ((progress: number, total: number) => void) | null
    ): Promise<ChunkedDataResponse> {
        return new Promise((resolve) => {
            const recvData = reply.subarray(8);
            const size = recvData.readUIntLE(1, 4);
            let totalBuffer = Buffer.from([]);
            const timeout = 3000;

            let timer = setTimeout(() => {
                this.socket!.removeListener('message', handleOnData);
                resolve({ data: null, err: new Error('TIMEOUT WHEN RECEIVING PACKET') });
            }, timeout);

            const internalCallback = (replyData: Buffer, err: Error | null = null) => {
                this.socket!.removeListener('message', handleOnData);
                clearTimeout(timer);
                resolve({ data: err ? null : replyData, err });
            };

            const handleOnData = (reply: Buffer) => {
                if (checkNotEventUDP(reply)) return;

                clearTimeout(timer);
                timer = setTimeout(() => {
                    internalCallback(totalBuffer, new Error(`TIMEOUT !! ${(size - totalBuffer.length) / size} % REMAIN !`));
                }, timeout);

                const header = decodeUDPHeader(reply);
                switch (header.commandId) {
                    case COMMANDS.CMD_PREPARE_DATA:
                        break;
                    case COMMANDS.CMD_DATA:
                        totalBuffer = Buffer.concat([totalBuffer, reply.subarray(8)]);
                        cb && cb(totalBuffer.length, size);
                        break;
                    case COMMANDS.CMD_ACK_OK:
                        if (totalBuffer.length === size) {
                            internalCallback(totalBuffer);
                        }
                        break;
                    default:
                        internalCallback(Buffer.from([]), new Error('ERROR_IN_UNHANDLE_CMD ' + exportErrorMessage(header.commandId)));
                }
            };

            this.socket!.on('message', handleOnData);

            const chunkCount = Math.ceil(size / Constants.MAX_CHUNK);
            for (let i = 0; i < chunkCount; i++) {
                const start = i * Constants.MAX_CHUNK;
                const chunkSize = (i === chunkCount - 1) ? size % Constants.MAX_CHUNK : Constants.MAX_CHUNK;
                this.sendChunkRequest(start, chunkSize).catch(err => {
                    internalCallback(Buffer.from([]), err);
                });
            }
        });
    }

    async getUsers(): Promise<{data: UserData28[]}> {
        try {
            if (this.socket) {
                await this.freeData();
            }

            const data = await this.readWithBuffer(REQUEST_DATA.GET_USERS);

            if (this.socket) {
                await this.freeData();
            }

            const USER_PACKET_SIZE = 28;
            let userData = data.data?.subarray(4) || Buffer.from([]);
            const users: UserData28[] = [];

            while (userData.length >= USER_PACKET_SIZE) {
                const user = decodeUserData28(userData.subarray(0, USER_PACKET_SIZE));
                users.push(user);
                userData = userData.subarray(USER_PACKET_SIZE);
            }

            return { data: users };
        } catch (err) {
            throw new Error(err.message);
        }
    }

    async getAttendances(callbackInProcess?: (progress: number, total: number) => void) {
        try {
            if (this.socket) {
                await this.freeData();
            }

            const data = await this.readWithBuffer(REQUEST_DATA.GET_ATTENDANCE_LOGS);

            if (this.socket) {
                await this.freeData();
            }

            const RECORD_PACKET_SIZE = 16;
            let recordData = data.data?.subarray(4) || Buffer.from([]);

            const records: RecordData16[] = [];
            while (recordData.length >= RECORD_PACKET_SIZE) {
                const record = decodeRecordData16(recordData.subarray(0, RECORD_PACKET_SIZE));
                records.push({ ...record, ip: this.ip });
                recordData = recordData.subarray(RECORD_PACKET_SIZE);
            }

            return { data: records, err: data.err };
        } catch (err) {
            return { data: [], err: err as Error };
        }
    }

    async freeData(): Promise<boolean> {
        try {
            const resp = await this.executeCmd(COMMANDS.CMD_FREE_DATA, Buffer.alloc(0));
            return !!resp
        } catch (err) {
            console.error('Error freeing data:', err);
            throw err;
        }
    }

    async getInfo(): Promise<DeviceInfo> {
        try {
            const data = await this.executeCmd(COMMANDS.CMD_GET_FREE_SIZES, Buffer.alloc(0));
            return {
                userCounts: data.readUIntLE(24, 4),
                logCounts: data.readUIntLE(40, 4),
                logCapacity: data.readUIntLE(72, 4)
            };
        } catch (err) {
            console.error('Error retrieving info:', err);
            throw err;
        }
    }

    async getTime(): Promise<Date> {
        try {
            const response = await this.executeCmd(COMMANDS.CMD_GET_TIME, Buffer.alloc(0));
            const timeValue = response.readUInt32LE(8);
            return timeParser.decode(timeValue);
        } catch (err) {
            console.error('Error retrieving time:', err);
            throw err;
        }
    }

    async setTime(tm: Date | string): Promise<boolean> {
        try {
            const commandBuffer = Buffer.alloc(32);
            commandBuffer.writeUInt32LE(timeParser.encode(new Date(tm)), 0);
            await this.executeCmd(COMMANDS.CMD_SET_TIME, commandBuffer);
            return true;
        } catch (err) {
            console.error('Error setting time:', err);
            throw err;
        }
    }

    async clearAttendanceLog(): Promise<Buffer> {
        try {
            return await this.executeCmd(COMMANDS.CMD_CLEAR_ATTLOG, Buffer.alloc(0));
        } catch (err) {
            console.error('Error clearing attendance log:', err);
            throw err;
        }
    }

    async clearData(): Promise<Buffer> {
        try {
            return await this.executeCmd(COMMANDS.CMD_CLEAR_DATA, Buffer.alloc(0));
        } catch (err) {
            console.error('Error clearing data:', err);
            throw err;
        }
    }

    async disableDevice(): Promise<boolean> {
        try {
            const resp = await this.executeCmd(COMMANDS.CMD_DISABLEDEVICE, REQUEST_DATA.DISABLE_DEVICE);
            return !!resp
        } catch (err) {
            console.error('Error disabling device:', err);
            throw err;
        }
    }

    async enableDevice(): Promise<boolean> {
        try {
            const resp = await this.executeCmd(COMMANDS.CMD_ENABLEDEVICE, Buffer.alloc(0));
            return !!resp
        } catch (err) {
            console.error('Error enabling device:', err);
            throw err;
        }
    }

    async disconnect(): Promise<void> {
        try {
            await this.executeCmd(COMMANDS.CMD_EXIT, Buffer.alloc(0));
        } catch (err) {
            console.error('Error executing disconnect command:', err);
        }

        try {
            await this.closeSocket();
        } catch (err) {
            console.error('Error closing the socket:', err);
        }
    }

    async getRealTimeLogs(cb: (log: any) => void = () => {}): Promise<void> {
        this.replyId++;
        const buf = createUDPHeader(COMMANDS.CMD_REG_EVENT, this.sessionId!, this.replyId, REQUEST_DATA.GET_REAL_TIME_EVENT);

        try {
            this.socket!.send(buf, 0, buf.length, this.port, this.ip, (err) => {
                if (err) {
                    console.error('Error sending UDP message:', err);
                    return;
                }
                console.log('UDP message sent successfully');
            });
        } catch (err) {
            console.error('Error during send operation:', err);
            return;
        }

        const handleMessage = (data: Buffer) => {
            if (!checkNotEventUDP(data)) return;

            if (data.length === 18) {
                cb(decodeRecordRealTimeLog18(data));
            }
        };

        if (this.socket!.listenerCount('message') === 0) {
            this.socket!.on('message', handleMessage);
        } else {
            console.warn('Multiple message listeners detected. Ensure only one listener is attached.');
        }
    }
}

export default ZUDP;