import {ZTCP} from './ztcp';
import {ZUDP} from './zudp';
import { User } from './models/User';
import { Finger } from './models/Finger';
import { ZkError, ERROR_TYPES } from './exceptions/handler';
import {Attendance} from "./models/Attendance";
import {RecordData16, UserData28, DeviceInfo} from "./helper/utils";


export default class Zklib {
    set connectionType(value: "tcp" | "udp" | null) {
        this._connectionType = value;
    }
    private _connectionType: 'tcp' | 'udp' | null = null;
    public ztcp: ZTCP;
    public zudp: ZUDP;
    private interval: NodeJS.Timeout | null = null;
    private timer: NodeJS.Timeout | null = null;
    private isBusy: boolean = false;
    private ip: string;
    private comm_key: number;

    get connectionType(): "tcp" | "udp" | null {
        return this._connectionType;
    }

    /**
     * Creates a new Zkteco device connection instance
     * @param ip IP address of device
     * @param port Port number of device
     * @param timeout Connection timeout in milliseconds
     * @param inport Required only for UDP connection (default: 10000)
     * @param comm_key Communication key of device (default: 0)
     * @param verbose Console log some data
     */
    constructor(ip: string, port: number = 4370, timeout: number= 5000, inport: number = 10000, comm_key: number = 0, verbose: boolean = false) {
        this.ip = ip;
        this.comm_key = comm_key;
        this.ztcp = new ZTCP(ip, port, timeout, comm_key, verbose);
        this.zudp = new ZUDP(ip, port, timeout, inport);
    }

    private async functionWrapper<T>(
        tcpCallback: () => Promise<T>,
        udpCallback: () => Promise<T>,
        command: string
    ): Promise<T> {
        try {
            switch (this._connectionType) {
                case 'tcp':
                    if (this.ztcp && this.ztcp.socket) {
                        return await tcpCallback();
                    } else {
                        throw new ZkError(
                            new Error(`TCP socket isn't connected!`),
                            `[TCP] ${command}`,
                            this.ip
                        );
                    }

                case 'udp':
                    if (this.zudp && this.zudp.socket) {
                        return await udpCallback();
                    } else {
                        throw new ZkError(
                            new Error(`UDP socket isn't connected!`),
                            `[UDP] ${command}`,
                            this.ip
                        );
                    }
                default:
                    throw new ZkError(
                        new Error(`Unsupported connection type or socket isn't connected!`),
                        '',
                        this.ip
                    );
            }
        } catch (err) {
            throw new ZkError(
                err as Error,
                `[${this._connectionType?.toUpperCase()}] ${command}`,
                this.ip
            );
        }
    }

    async createSocket(
        cbErr?: (err: Error) => void,
        cbClose?: (type: string) => void
    ): Promise<boolean> {
        try {
            if (this.ztcp.socket) {
                try {
                    await this.ztcp.connect();
                    console.log('TCP reconnection successful');
                    this._connectionType = 'tcp';
                    return true;
                } catch (err) {
                    throw new ZkError(err as Error, 'TCP CONNECT', this.ip);
                }
            } else {
                try {
                    await this.ztcp.createSocket(cbErr, cbClose);
                    await this.ztcp.connect();
                    console.log('TCP connection successful');
                    this._connectionType = 'tcp';
                    return true;
                } catch (err) {
                    throw new ZkError(err as Error, 'TCP CONNECT', this.ip);
                }
            }
        } catch (err) {
            try {
                if (this.ztcp.socket) await this.ztcp.disconnect();
            } catch (disconnectErr) {
                console.error('Error disconnecting TCP:', disconnectErr);
            }

            if (err.code !== ERROR_TYPES.ECONNREFUSED) {
                throw new ZkError(err as Error, 'TCP CONNECT', this.ip);
            }

            try {
                if (!this.zudp.socket) {
                    await this.zudp.createSocket(cbErr, cbClose);
                }
                await this.zudp.connect();
                console.log('UDP connection successful');
                this._connectionType = 'udp';
                return true;
            } catch (err) {
                if ((err as Error).message !== 'EADDRINUSE') {
                    this._connectionType = null;
                    try {
                        await this.zudp.disconnect();
                    } catch (disconnectErr) {
                        console.error('Error disconnecting UDP:', disconnectErr);
                    }
                    throw new ZkError(err as Error, 'UDP CONNECT', this.ip);
                }

                this._connectionType = 'udp';
                return true;
            }
        }
    }

    async getUsers(): Promise<{ data: User[] | UserData28[]}> {
        return this.functionWrapper(
            () => this.ztcp.getUsers(),
            () => this.zudp.getUsers(),
            'GET_USERS'
        );
    }

    async getTime(): Promise<Date> {
        return this.functionWrapper(
            () => this.ztcp.getTime(),
            () => this.zudp.getTime(),
            'GET_TIME'
        );
    }

    async setTime(t: Date | string): Promise<boolean> {
        return this.functionWrapper(
            () => this.ztcp.setTime(t),
            () => this.zudp.setTime(t),
            'SET_TIME'
        );
    }

    async voiceTest(): Promise<void> {
        return this.functionWrapper(
            () => this.ztcp.voiceTest(),
            async () => { throw new Error('UDP voice test not supported'); },
            'VOICE_TEST'
        );
    }

    async getProductTime(): Promise<Date> {
        return this.functionWrapper(
            () => this.ztcp.getProductTime(),
            async () => { throw new Error('UDP get product time not supported'); },
            'GET_PRODUCT_TIME'
        );
    }

    async getVendor(): Promise<string> {
        return this.functionWrapper(
            () => this.ztcp.getVendor(),
            async () => { throw new Error('UDP get vendor not supported'); },
            'GET_VENDOR'
        );
    }

    async getMacAddress(): Promise<string> {
        return this.functionWrapper(
            () => this.ztcp.getMacAddress(),
            async () => { throw new Error('UDP get MAC address not supported'); },
            'GET_MAC_ADDRESS'
        );
    }

    async getSerialNumber(): Promise<string> {
        return this.functionWrapper(
            () => this.ztcp.getSerialNumber(),
            async () => { throw new Error('UDP get serial number not supported'); },
            'GET_SERIAL_NUMBER'
        );
    }

    async getDeviceVersion(): Promise<string> {
        return this.functionWrapper(
            () => this.ztcp.getDeviceVersion(),
            async () => { throw new Error('UDP get device version not supported'); },
            'GET_DEVICE_VERSION'
        );
    }

    async getDeviceName(): Promise<string> {
        return this.functionWrapper(
            () => this.ztcp.getDeviceName(),
            async () => { throw new Error('UDP get device name not supported'); },
            'GET_DEVICE_NAME'
        );
    }

    async getPlatform(): Promise<string> {
        return this.functionWrapper(
            () => this.ztcp.getPlatform(),
            async () => { throw new Error('UDP get platform not supported'); },
            'GET_PLATFORM'
        );
    }

    async getOS(): Promise<string> {
        return this.functionWrapper(
            () => this.ztcp.getOS(),
            async () => { throw new Error('UDP get OS not supported'); },
            'GET_OS'
        );
    }

    async getWorkCode(): Promise<string> {
        return this.functionWrapper(
            () => this.ztcp.getWorkCode(),
            async () => { throw new Error('UDP get work code not supported'); },
            'GET_WORK_CODE'
        );
    }

    async getPIN(): Promise<string> {
        return this.functionWrapper(
            () => this.ztcp.getPIN(),
            async () => { throw new Error('UDP get PIN not supported'); },
            'GET_PIN'
        );
    }

    async getFaceOn(): Promise<string> {
        return this.functionWrapper(
            () => this.ztcp.getFaceOn(),
            async () => { throw new Error('UDP get face on not supported'); },
            'GET_FACE_ON'
        );
    }

    async getSSR(): Promise<string> {
        return this.functionWrapper(
            () => this.ztcp.getSSR(),
            async () => { throw new Error('UDP get SSR not supported'); },
            'GET_SSR'
        );
    }

    async getFirmware(): Promise<string> {
        return this.functionWrapper(
            () => this.ztcp.getFirmware(),
            async () => { throw new Error('UDP get firmware not supported'); },
            'GET_FIRMWARE'
        );
    }

    async setUser(
        uid: number,
        userid: string,
        name: string,
        password: string,
        role: number = 0,
        cardno: number = 0
    ): Promise<boolean> {
        return this.functionWrapper(
            () => this.ztcp.setUser(uid, userid, name, password, role, cardno),
            async () => { throw new Error('UDP set user not supported'); },
            'SET_USER'
        );
    }

    async deleteUser(uid: number): Promise<boolean> {
        return this.functionWrapper(
            () => this.ztcp.deleteUser(uid),
            async () => { throw new Error('UDP delete user not supported'); },
            'DELETE_USER'
        );
    }

    async getAttendanceSize(): Promise<number> {
        return this.functionWrapper(
            () => this.ztcp.getAttendanceSize(),
            async () => { throw new Error('UDP get attendance size not supported'); },
            'GET_ATTENDANCE_SIZE'
        );
    }

    async getAttendances(cb?: (progress: number, total: number) => void): Promise<{ data: Attendance[] | RecordData16[]; err?: Error | null }> {
        return this.functionWrapper(
            () => this.ztcp.getAttendances(cb),
            () => this.zudp.getAttendances(cb),
            'GET_ATTENDANCES'
        );
    }

    async getRealTimeLogs(cb: (log: any) => void): Promise<void> {
        return this.functionWrapper(
            () => this.ztcp.getRealTimeLogs(cb),
            () => this.zudp.getRealTimeLogs(cb),
            'GET_REAL_TIME_LOGS'
        );
    }

    async getTemplates(): Promise<Finger[]> {
        return this.functionWrapper(
            () => this.ztcp.getTemplates(),
            async () => { throw new Error('UDP get templates not supported'); },
            'GET_TEMPLATES'
        );
    }

    async saveUserTemplate(user: User, fingers: Finger[] = []): Promise<void> {
        return await this.functionWrapper(
            async () => await this.ztcp.saveUserTemplate(user, fingers),
            async () => { throw new Error('UDP save user template not supported'); },
            'SAVE_USER_TEMPLATE'
        );
    }

    async deleteFinger(uid: number, fid: number): Promise<boolean> {
        if (fid > 9 || 0 > fid) throw new Error("fid params out of index")
        if (uid > 3000 || uid < 1) throw new Error("fid params out of index")
        return this.functionWrapper(
            () => this.ztcp.deleteFinger(uid, fid),
            async () => { throw new Error('UDP delete finger not supported'); },
            'DELETE_FINGER'
        );
    }

    async enrollUser(uid: number, temp_id: number, user_id: string): Promise<boolean> {
        if (temp_id < 0 || temp_id > 9) throw new Error("temp_id out of range 0-9")
        if (uid < 1 || uid > 3000) throw new Error("uid out of range 1-3000")
        return this.functionWrapper(
            () => this.ztcp.enrollUser(uid, temp_id, user_id),
            async () => { throw new Error('UDP enroll user not supported'); },
            'ENROLL_USER'
        );
    }

    async verifyUser(uid: number): Promise<boolean> {
        return this.functionWrapper(
            () => this.ztcp.verifyUser(uid),
            async () => { throw new Error('UDP verify user not supported'); },
            'VERIFY_USER'
        );
    }

    async restartDevice(): Promise<void> {
        return this.functionWrapper(
            () => this.ztcp.restartDevice(),
            async () => { throw new Error('UDP restart device not supported'); },
            'RESTART_DEVICE'
        );
    }

    async getSizes(): Promise<DeviceInfo> {
        return this.functionWrapper(
            () => this.ztcp.getSizes(),
            () => this.zudp.getInfo(),
            'GET_SIZES'
        );
    }

    async disconnect(): Promise<void> {
        return this.functionWrapper(
            () => this.ztcp.disconnect(),
            () => this.zudp.disconnect(),
            'DISCONNECT'
        );
    }


    async freeData(): Promise<boolean> {
        return this.functionWrapper(
            () => this.ztcp.freeData(),
            () => this.zudp.freeData(),
            'FREE_DATA'
        );
    }

    async disableDevice(): Promise<boolean> {
        return this.functionWrapper(
            () => this.ztcp.disableDevice(),
            () => this.zudp.disableDevice(),
            'DISABLE_DEVICE'
        );
    }

    async enableDevice(): Promise<boolean> {
        return this.functionWrapper(
            () => this.ztcp.enableDevice(),
            () => this.zudp.enableDevice(),
            'ENABLE_DEVICE'
        );
    }

    async getInfo(): Promise<DeviceInfo> {
        return this.functionWrapper(
            () => this.ztcp.getInfo(),
            () => this.zudp.getInfo(),
            'GET_INFO'
        );
    }

    async clearAttendanceLog(): Promise<any> {
        return this.functionWrapper(
            () => this.ztcp.clearAttendanceLog(),
            () => this.zudp.clearAttendanceLog(),
            'CLEAR_ATTENDANCE_LOG'
        );
    }

    async clearData(): Promise<any> {
        return this.functionWrapper(
            () => this.ztcp.clearData(),
            () => this.zudp.clearData(),
            'CLEAR_DATA'
        );
    }

    async executeCmd(command: number, data: string | Buffer = ''): Promise<Buffer> {
        return this.functionWrapper(
            () => this.ztcp.executeCmd(command, data),
            () => this.zudp.executeCmd(command, data),
            'EXECUTE_CMD'
        );
    }
}

export type { Attendance, User, Finger, DeviceInfo, Zklib }