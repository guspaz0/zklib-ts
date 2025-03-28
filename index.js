/**
 *
 * Author: coding-libs
 * Date: 2024-07-01
 */

const ZTCP = require('./src/ztcp')
const ZUDP = require('./src/zudp')
const {User} = require('./src/helper/models/User')
const {Finger} = require('./src/helper/models/Finger')

const {ZkError, ERROR_TYPES} = require('./src/exceptions/handler')

class ZktecoJs {
    /** 
    * @param {string} ip ip address of device
    * @param {number} port port number of device
    * @param {number} timeout connection timout
    * @param {number} inport Required Only for UDP connection
    * @param {number} comm_key communication key of device (if the case)
    * @return Zkteco socket connection instance
    */
    constructor(ip, port, timeout, inport = 10000, comm_key = 0) {
        this.connectionType = null

        this.ztcp = new ZTCP(ip, port, timeout, comm_key)
        this.zudp = new ZUDP(ip, port, timeout, inport)
        this.interval = null
        this.timer = null
        this.isBusy = false
        this.ip = ip
        this.comm_key = comm_key
    }

    async functionWrapper(tcpCallback, udpCallback, command) {
        try {
            switch (this.connectionType) {
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
            // Wrap the error in a ZkError and include context
            throw new ZkError(
                err,
                `[${this.connectionType.toUpperCase()}] ${command}`,
                this.ip
            );
        }
    }

    async createSocket(cbErr, cbClose) {
        try {
            if (this.ztcp.socket) {
                // If TCP socket already exists, try to connect
                try {
                    await this.ztcp.connect();
                    console.log('TCP reconnection successful');
                    this.connectionType = 'tcp';
                    return true; // Return true if TCP connection is successful
                } catch (err) {
                    throw new ZkError(err, 'TCP CONNECT', this.ip);
                }
            } else {
                // Attempt to create and connect TCP socket
                try {
                    await this.ztcp.createSocket(cbErr, cbClose);
                    await this.ztcp.connect();
                    console.log('TCP connection successful');
                    this.connectionType = 'tcp';
                    return true; // Return true if TCP connection is successful
                } catch (err) {
                    throw new ZkError(err, 'TCP CONNECT', this.ip);
                }
            }
        } catch (err) {
            // Attempt to disconnect TCP if there was an error
            try {
                if (this.ztcp.socket) await this.ztcp.disconnect();
            } catch (disconnectErr) {
                // Log or handle disconnection error if needed
            }

            if (err.code !== ERROR_TYPES.ECONNREFUSED) {
                return Promise.reject(new ZkError(err, 'TCP CONNECT', this.ip));
            }

            // Try to establish UDP connection if TCP fails
            try {
                if (!this.zudp.socket) {
                    await this.zudp.createSocket(cbErr, cbClose);
                }
                await this.zudp.connect();
                console.log('UDP connection successful');
                this.connectionType = 'udp';
                return true; // Return true if UDP connection is successful
            } catch (err) {
                // Handle UDP connection error
                if (err.code !== 'EADDRINUSE') {
                    this.connectionType = null;
                    try {
                        await this.zudp.disconnect();
                    } catch (disconnectErr) {
                        // Log or handle disconnection error if needed
                    }
                    return Promise.reject(new ZkError(err, 'UDP CONNECT', this.ip));
                }

                // Handle EADDRINUSE specifically
                this.connectionType = 'udp';
                return true; // Return true if UDP connection is successful after handling EADDRINUSE error
            }
        }
    }


    async getUsers() {
        return await this.functionWrapper(
            () => this.ztcp.getUsers(),
            () => this.zudp.getUsers()
        )
    }

    async getTime() {
        return await this.functionWrapper(
            () => this.ztcp.getTime(),
            () => this.zudp.getTime()
        )
    }

    async setTime(t) {
        return await this.functionWrapper(
            () => this.ztcp.setTime(t),
            () => this.zudp.setTime(t)
        )
    }

    async voiceTest() {
        return await this.functionWrapper(
            () => this.ztcp.voiceTest()
        )
    }

    async getProductTime() {
        return await this.functionWrapper(
            () => this.ztcp.getProductTime()
        )
    }

    async getVendor() {
        return await this.functionWrapper(
            () => this.ztcp.getVendor()
        )
    }

    async getMacAddress() {
        return await this.functionWrapper(
            () => this.ztcp.getMacAddress()
        )
    }

    async getSerialNumber() {
        return await this.functionWrapper(
            () => this.ztcp.getSerialNumber()
        )
    }

    async getDeviceVersion() {
        return await this.functionWrapper(
            () => this.ztcp.getDeviceVersion()
        )
    }

    async getDeviceName() {
        return await this.functionWrapper(
            () => this.ztcp.getDeviceName()
        )
    }

    async getPlatform() {
        return await this.functionWrapper(
            () => this.ztcp.getPlatform()
        )
    }

    async getOS() {
        return await this.functionWrapper(
            () => this.ztcp.getOS()
        )
    }

    async getWorkCode() {
        return await this.functionWrapper(
            () => this.ztcp.getWorkCode()
        )
    }

    async getPIN() {
        return await this.functionWrapper(
            () => this.ztcp.getPIN()
        )
    }

    async getFaceOn() {
        return await this.functionWrapper(
            () => this.ztcp.getFaceOn()
        )
    }

    async getSSR() {
        return await this.functionWrapper(
            () => this.ztcp.getSSR()
        )
    }

    async getFirmware() {
        return await this.functionWrapper(
            () => this.ztcp.getFirmware()
        )
    }

    /** 
    * @param {number} uid internal uid
    * @param {string} userid userid for external reference
    * @param {string} name user name
    * @param {string} password user password
    * @param {number} role user role permission.
    * @param {number} carno user card number
    * @return {*} Zkteco TCP socket connection instance
    */
    async setUser(uid, userid, name, password, role = 0, cardno = 0) {
        return await this.functionWrapper(
            () => this.ztcp.setUser(uid, userid, name, password, role, cardno)
        )
    }
    /** 
    * @param {number} uid internal user id
    * @return void
    */
    async deleteUser(uid) {
        return await this.functionWrapper(
            () => this.ztcp.deleteUser(uid)
        )
    }
    /** 
    * @return the number size of attendance records
    */
    async getAttendanceSize() {
        return await this.functionWrapper(
            () => this.ztcp.getAttendanceSize()
        )
    }

    /** 
    * @return Array with All attendance records in device
    */
    async getAttendances(cb) {
        return await this.functionWrapper(
            () => this.ztcp.getAttendances(cb),
            () => this.zudp.getAttendances(cb),
        )
    }

    async getRealTimeLogs(cb) {
        return await this.functionWrapper(
            () => this.ztcp.getRealTimeLogs(cb),
            () => this.zudp.getRealTimeLogs(cb)
        )
    }

    /** 
    * @return Array of all Finger objects
    */
    async getTemplates(){
        return await this.functionWrapper(
            () => this.ztcp.getTemplates()
        )
    }
    /**
     * save user and template
     * 
     * @param {User} user user object
     * @param {Finger[]} fingers Array of fingers. `0 <= index <= 9`
     */
    async saveUserTemplate(user, fingers=[]){
        return await this.functionWrapper(
            () => this.ztcp.saveUserTemplate(user,fingers)
        )
    }

    /**
     * Deletes a single fingerprint for the given `uid`
     * @param {number} uid user identifier
     * @param {number} fid finger identifier `0 <= fid <= 9`
     */
    async deleteFinger(uid, fid){
        return await this.functionWrapper(
            ()=> this.ztcp.deleteFinger(uid,fid)
        )
    }

        /**
     * Start enroll user
     * @param {number} uid - user ID number
     * @param {number} fid - finger template ID
     * @param {string} user_id - user ID string
     * @returns {Promise<boolean>}
     */
    async enrollUser(uid, temp_id, user_id){
        return await this.functionWrapper(
            ()=> this.ztcp.enrollUser(uid, temp_id, user_id)
        )
    }

    async verifyUser(uid) {
        return await this.functionWrapper(
            ()=> this.ztcp.verifyUser(uid)
        )
    }
    /**
     * Reboot device
     */
    async restartDevice(){
        return await this.functionWrapper(
            ()=> this.ztcp.restartDevice()
        )
    }

    /** 
    * @return attendance, user, fingerprint and face capacity, available and counts.
    */
    async getSizes() {
        return await this.functionWrapper(
            () => this.ztcp.getSizes()
        )
    }

    async disconnect() {
        return await this.functionWrapper(
            () => this.ztcp.disconnect(),
            () => this.zudp.disconnect()
        )
    }

    async connect() {
        return await this.functionWrapper(
            () => this.ztcp.connect(),
            () => this.zudp.connect()
        )
    }

    async freeData() {
        return await this.functionWrapper(
            () => this.ztcp.freeData(),
            () => this.zudp.freeData()
        )
    }


    async disableDevice() {
        return await this.functionWrapper(
            () => this.ztcp.disableDevice(),
            () => this.zudp.disableDevice()
        )
    }


    async enableDevice() {
        return await this.functionWrapper(
            () => this.ztcp.enableDevice(),
            () => this.zudp.enableDevice()
        )
    }


    async getInfo() {
        return await this.functionWrapper(
            () => this.ztcp.getInfo(),
            () => this.zudp.getInfo()
        )
    }


    async getSocketStatus() {
        return await this.functionWrapper(
            () => this.ztcp.getSocketStatus(),
            () => this.zudp.getSocketStatus()
        )
    }

    async clearAttendanceLog() {
        return await this.functionWrapper(
            () => this.ztcp.clearAttendanceLog(),
            () => this.zudp.clearAttendanceLog()
        )
    }

    async clearData() {
        return await this.functionWrapper(
            () => this.ztcp.clearData(),
            () => this.zudp.clearData()
        )
    }

    async executeCmd(command, data = '') {
        return await this.functionWrapper(
            () => this.ztcp.executeCmd(command, data),
            () => this.zudp.executeCmd(command, data)
        )
    }

    setIntervalSchedule(cb, timer) {
        this.interval = setInterval(cb, timer)
    }


    setTimerSchedule(cb, timer) {
        this.timer = setTimeout(cb, timer)
    }

}


module.exports = ZktecoJs




