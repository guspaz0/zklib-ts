import {Socket} from 'net'
import { COMMANDS, REQUEST_DATA } from "./helper/command"
import { Constants } from './helper/command';
import timeParser from './helper/time';

import {
    authKey,
    checkNotEventTCP,
    createTCPHeader,
    decodeRecordData40,
    decodeRecordRealTimeLog52,
    decodeTCPHeader,
    decodeUserData72,
    exportErrorMessage, RealTimeLog,
    removeTcpHeader
} from './helper/utils';

import {Finger} from './models/Finger';
import {User} from './models/User';
import {ZkError} from './exceptions/handler';
import { TimerOptions } from 'timers';
import {UserService} from "./services/user.service";
import {TransactionService} from "./services/transaction.service";


export class ZTCP {
    /** 
    * @param_ip ip address of device
    * @param_port port number of device
    * @param_timeout connection timout
    * @param_comm_key communication key of device (if the case)
    * @return Zkteco TCP socket connection instance
    */
    ip: string;
    private port: number;
    timeout: number;
    sessionId: number = 0;
    replyId: number = 0;
    socket: Socket | undefined;
    private comm_key: number;

    private user_count: number = 0;
    fp_count: number = 0;
    private pwd_count: number = 0;
    private oplog_count: number = 0;
    private attlog_count: number = 0;
    private fp_cap: number = 0;
    private user_cap: number = 0;
    private attlog_cap: number = 0;
    private fp_av: number = 0;
    private user_av: number = 0;
    private attlog_av: number = 0;
    private face_count: number = 0;
    private face_cap: number = 0;
    userPacketSize: number = 72
    verbose: boolean = false

    private packetNumber: number = 0;
    private replyData: Buffer = Buffer.from([]);
    _userService: UserService;
    _transactionService: TransactionService;

    constructor(ip: string, port: number, timeout: number, comm_key: number, verbose: boolean) {
        this.ip = ip;
        this.port = port;
        this.timeout = timeout? timeout : 10000;
        this.replyId = 0;
        this.comm_key = comm_key;
        this.verbose = verbose;
        this._userService = new UserService(this)
        this._transactionService = new TransactionService(this)
    }
    

    createSocket(cbError, cbClose) {
        return new Promise((resolve, reject) => {
            this.socket = new Socket();

            // Handle socket error
            this.socket.once('error', (err) => {
                this.socket = undefined; // Ensure socket reference is cleared
                reject(err);
                if (typeof cbError === 'function') cbError(err);
            });

            // Handle successful connection
            this.socket.once('connect', () => {
                resolve(this.socket);
            });

            // Handle socket closure
            this.socket.once('close', () => {
                this.socket = undefined; // Ensure socket reference is cleared
                if (typeof cbClose === 'function') cbClose('tcp');
            });

            // Set socket timeout if provided
            if (this.timeout) {
                this.socket.setTimeout(this.timeout);
            }

            // Initiate connection
            this.socket.connect(this.port, this.ip);
        });
    }

    async connect() {
        try {
            let reply = await this.executeCmd(COMMANDS.CMD_CONNECT, '');

            if (reply.readUInt16LE(0) === COMMANDS.CMD_ACK_OK) {
                return true
            }
            if (reply.readUInt16LE(0) === COMMANDS.CMD_ACK_UNAUTH) {
                const hashedCommkey = authKey(this.comm_key, this.sessionId) as any
                reply = await this.executeCmd(COMMANDS.CMD_AUTH, hashedCommkey)
                
                if (reply.readUInt16LE(0) === COMMANDS.CMD_ACK_OK) {
                    return true
                } else {
                    throw new Error("error de authenticacion")
                }
            } else {
                // No reply received; throw an error
                throw new Error('NO_REPLY_ON_CMD_CONNECT');
            }
        } catch (err) {
            // Log the error for debugging, if necessary
            console.error('Failed to connect:', err);
            // Re-throw the error for handling by the caller
            throw err;
        }
    }

    async closeSocket(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            // If no socket is present, resolve immediately
            if (!this.socket) {
                return resolve(true);
            }

            // Clean up listeners to avoid potential memory leaks or duplicate handling
            this.socket.removeAllListeners('data');

            // Set a timeout to handle cases where socket.end might not resolve
            const timer = setTimeout(() => {
                this.socket.destroy(); // Forcibly close the socket if not closed properly
                resolve(true); // Resolve even if the socket was not closed properly
            }, 2000);

            // Close the socket and clear the timeout upon successful completion
            this.socket.end(() => {
                clearTimeout(timer);
                resolve(true); // Resolve once the socket has ended
            });

            // Handle socket errors during closing
            this.socket.once('error', (err) => {
                clearTimeout(timer);
                reject(err); // Reject the promise with the error
            });
        });
    }

    writeMessage(msg: Buffer, connect: boolean): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            // Check if the socket is initialized
            if (!this.socket) {
                return reject(new Error('Socket is not initialized'));
            }

            // Define a variable for the timeout reference
            let timer = null;

            // Handle incoming data
            const onData = (data) => {
                // Check if the socket is still valid before trying to remove the listener
                if (this.socket) {
                    this.socket.removeListener('data', onData); // Remove the data event listener
                }
                clearTimeout(timer);    // Clear the timeout once data is received
                resolve(data);          // Resolve the promise with the received data
            };

            // Attach the data event listener
            this.socket.once('data', onData);

            // Attempt to write the message to the socket
            this.socket.write(msg, null, (err) => {
                if (err) {
                    // Check if the socket is still valid before trying to remove the listener
                    if (this.socket) {
                        this.socket.removeListener('data', onData); // Clean up listener on write error
                    }
                    return reject(err); // Reject the promise with the write error
                }

                // If a timeout is set, configure it
                if (this.timeout) {
                    timer = setTimeout(() => {
                        // Check if the socket is still valid before trying to remove the listener
                        if (this.socket) {
                            this.socket.removeListener('data', onData); // Remove listener on timeout
                        }
                        reject(new Error('TIMEOUT_ON_WRITING_MESSAGE')); // Reject the promise on timeout
                    }, connect ? 2000 : this.timeout);
                }
            });
        });
    }


    async requestData(msg: Buffer): Promise<Buffer> {
        try {
            return await new Promise((resolve, reject) => {
                let timer = null;
                let replyBuffer = Buffer.from([]);

                // Internal callback to handle data reception
                const internalCallback = (data_1) => {
                    if (this.socket) {
                        this.socket.removeListener('data', handleOnData); // Clean up listener
                    }
                    if (timer) clearTimeout(timer); // Clear the timeout
                    resolve(data_1); // Resolve the promise with the data
                };

                // Handle incoming data
                const handleOnData = (data_3) => {
                    replyBuffer = Buffer.concat([replyBuffer, data_3]); // Accumulate data


                    // Check if the data is a valid TCP event
                    if (checkNotEventTCP(data_3)) return;

                    // Decode the TCP header
                    const header = decodeTCPHeader(replyBuffer.subarray(0, 16));
                    if (this.verbose) {
                        console.log("linea 232: replyId: ", header.replyId, "      command:    ",
                            header.commandId, Object.keys(COMMANDS).find(c => COMMANDS[c] == header.commandId));
                    }
                    // Handle based on command ID
                    if (header.commandId === COMMANDS.CMD_DATA) {
                        // Set a timeout to handle delayed responses
                        timer = setTimeout(() => {
                            internalCallback(replyBuffer); // Resolve with accumulated buffer
                        }, 1000);
                    } else {
                        // Set a timeout to handle errors
                        timer = setTimeout(() => {
                            if (this.socket) {
                                this.socket.removeListener('data', handleOnData); // Clean up listener on timeout
                            }
                            reject(new Error('TIMEOUT_ON_RECEIVING_REQUEST_DATA')); // Reject on timeout
                        }, this.timeout);

                        // Extract packet length and handle accordingly
                        const packetLength = data_3.readUIntLE(4, 2);
                        if (packetLength > 8) {
                            internalCallback(data_3); // Resolve immediately if sufficient data
                        }
                    }
                };

                // Ensure the socket is valid before attaching the listener
                if (this.socket) {
                    this.socket.on('data', handleOnData);

                    // Write the message to the socket
                    this.socket.write(msg, null, (err) => {
                        if (err) {
                            if (this.socket) {
                                this.socket.removeListener('data', handleOnData); // Clean up listener on error
                            }
                            return reject(err); // Reject the promise with the error
                        }

                        // Set a timeout to handle cases where no response is received
                        timer = setTimeout(() => {
                            if (this.socket) {
                                this.socket.removeListener('data', handleOnData); // Clean up listener on timeout
                            }
                            reject(new Error('TIMEOUT_IN_RECEIVING_RESPONSE_AFTER_REQUESTING_DATA')); // Reject on timeout
                        }, this.timeout);
                    });
                } else {
                    reject(new Error('SOCKET_NOT_INITIALIZED')); // Reject if socket is not initialized
                }
            });
        } catch (err_1) {
            console.error("Promise Rejected:", err_1); // Log the rejection reason
            throw err_1; // Re-throw the error to be handled by the caller
        }
    }


    /**
     *
     * @param {*} command
     * @param {*} data
     *
     *
     * reject error when command fail and resolve data when success
     */

    async executeCmd(command: number, data: Buffer | string | ArrayBuffer): Promise<Buffer> {
        // Reset sessionId and replyId for connection commands
        if (command === COMMANDS.CMD_CONNECT) {
            this.sessionId = 0;
            this.replyId = 0;
        } else {
            this.replyId++;
        }

        const buf = createTCPHeader(command, this.sessionId, this.replyId, data);

        try {
            // Write the message to the socket and wait for a response
            const reply = await this.writeMessage(buf, command === COMMANDS.CMD_CONNECT || command === COMMANDS.CMD_EXIT);
            if (this.verbose) {
                let headers = decodeTCPHeader(reply)
                console.log('command: ',COMMANDS[headers.commandId], 'replyid: ', headers.replyId )
            }
            // Remove TCP header from the response
            const rReply = removeTcpHeader(reply);

            // Update sessionId for connection command responses
            if (command === COMMANDS.CMD_CONNECT && rReply && rReply.length >= 6) { // Assuming sessionId is located at offset 4 and is 2 bytes long
                this.sessionId = rReply.readUInt16LE(4);
            }

            return rReply;
        } catch (err) {
            // Log or handle the error if necessary
            console.error('Error executing command:', err);
            throw err; // Re-throw the error for handling by the caller
        }
    }

    async sendChunkRequest(start:number, size:number) {
        this.replyId++;
        const reqData = Buffer.alloc(8);
        reqData.writeUInt32LE(start, 0);
        reqData.writeUInt32LE(size, 4);
        const buf = createTCPHeader(COMMANDS.CMD_DATA_RDY, this.sessionId, this.replyId, reqData);

        try {
            await new Promise((resolve, reject)  => {
                this.socket.write(buf, null, (err) => {
                    if (err) {
                        console.error(`[TCP][SEND_CHUNK_REQUEST] Error sending chunk request: ${err.message}`);
                        reject(err); // Reject the promise if there is an error
                    } else {
                        resolve(true); // Resolve the promise if the write operation succeeds
                    }
                });
            });
        } catch (err) {
            // Handle or log the error as needed
            console.error(`[TCP][SEND_CHUNK_REQUEST] Exception: ${err.message}`);
            throw err; // Re-throw the error for handling by the caller
        }
    }

    /**
     *
     * @param {Buffer} reqData - indicate the type of data that need to receive ( user or attLog)
     * @param {Function} cb - callback is triggered when receiving packets
     *
     * readWithBuffer will reject error if it'wrong when starting request data
     * readWithBuffer will return { data: replyData , err: Error } when receiving requested data
     */
    readWithBuffer(reqData: Buffer | string, cb: Function = null): Promise<Record<string, Buffer | number>> {
        return new Promise(async (resolve, reject) => {

            this.replyId++;
            const buf = createTCPHeader(COMMANDS.CMD_DATA_WRRQ, this.sessionId, this.replyId, reqData)
            let reply = null;

            try {
                reply = await this.requestData(buf)

            } catch (err) {
                reject(err)
            }

            const header = decodeTCPHeader(reply.subarray(0, 16))
            switch (header.commandId) {
                case COMMANDS.CMD_DATA: {
                    resolve({data: reply.subarray(16), mode: 8})
                    break;
                }
                case COMMANDS.CMD_ACK_OK:
                case COMMANDS.CMD_PREPARE_DATA: {
                    // this case show that data is prepared => send command to get these data
                    // reply variable includes information about the size of following data
                    const recvData = reply.subarray(16)
                    const size = recvData.readUIntLE(1, 4)

                    // We need to split the data to many chunks to receive , because it's to large
                    // After receiving all chunk data , we concat it to TotalBuffer variable , that 's the data we want
                    let remain = size % Constants.MAX_CHUNK
                    let numberChunks = Math.round(size - remain) / Constants.MAX_CHUNK
                    this.packetNumber = numberChunks + (remain > 0 ? 1 : 0)
                    //let replyData = Buffer.from([])

                    let totalBuffer = Buffer.from([])
                    let realTotalBuffer = Buffer.from([])

                    let timer = setTimeout(() => {
                        internalCallback(this.replyData, new Error('TIMEOUT WHEN RECEIVING PACKET'))
                    }, this.timeout)

                    const internalCallback = (replyData: Buffer, err = null) => {
                        this.socket && this.socket.removeAllListeners('data')
                        timer && clearTimeout(timer)
                        resolve({data: replyData, err})
                    }

                    this.socket.once('close', () => {
                        internalCallback(this.replyData, new Error('Socket is disconnected unexpectedly'))
                    })

                    for (let i = 0; i <= numberChunks;i++) {
                        const data = await new Promise((resolve2, reject2) => {
                            try {
                                this.sendChunkRequest(i * Constants.MAX_CHUNK,
                                    (i === numberChunks)
                                        ? remain
                                        : Constants.MAX_CHUNK
                                    )
                                this.socket.on('data', (reply: Buffer)=> {
                                    clearTimeout(timer)
                                    timer = setTimeout(() => {
                                        internalCallback(this.replyData,
                                            new Error(`TIME OUT !! ${this.packetNumber} PACKETS REMAIN !`))
                                    }, this.timeout)
                                    const headers = decodeTCPHeader(reply)
                                    if (COMMANDS[headers.commandId]) {
                                        switch(headers.commandId) {
                                            case COMMANDS.CMD_ACK_OK:
                                            case COMMANDS.CMD_DATA:
                                                this.verbose && console.log("CMD received: ",COMMANDS[headers.commandId])
                                                break
                                            case COMMANDS.CMD_PREPARE_DATA:
                                                this.verbose && console.log("CMD received: ",COMMANDS[headers.commandId])
                                                this.verbose && console.log(`recieve chunk: prepare data size is ${headers.payloadSize}`)
                                                break
                                            default:
                                                break
                                        }
                                    }
                                    totalBuffer = Buffer.concat([totalBuffer, reply])
                                    const packetLength = totalBuffer.readUIntLE(4, 2)
                                    if (totalBuffer.length >= 8 + packetLength) {
                                        realTotalBuffer = Buffer.concat([realTotalBuffer, totalBuffer.subarray(16, 8 + packetLength)])
                                        totalBuffer = totalBuffer.subarray(8 + packetLength)

                                        if ((this.packetNumber > 1 && realTotalBuffer.length === (Constants.MAX_CHUNK + 8))
                                            || (this.packetNumber === 1 && realTotalBuffer.length === remain + 8)) {

                                            this.packetNumber--
                                            cb && cb(realTotalBuffer.length, size)

                                            resolve2(realTotalBuffer.subarray(8))

                                            totalBuffer = Buffer.from([])
                                            realTotalBuffer = Buffer.from([])
                                        }
                                    }
                                });
                            } catch (e) {
                                reject2(e)
                            }
                        })
                        this.replyData = Buffer.concat([this.replyData, data as Uint8Array])
                        this.socket.removeAllListeners('data')
                        if (this.packetNumber <= 0) {
                            resolve({data: this.replyData})
                        }
                    }
                    break;
                }
                default: {
                    reject(new Error('ERROR_IN_UNHANDLE_CMD ' + exportErrorMessage(header.commandId)))
                }
            }
        })
    }
    /**
     *  reject error when starting request data
     *  @return {Record<string, User[] | Error>} when receiving requested data
     */
    async getUsers(): Promise<{data: User[]}> {
        return { data: await this._userService.getUsers() }
    }

    /**
     *
     * @param {*} callbackInProcess
     *  reject error when starting request data
     *  return { data: records, err: Error } when receiving requested data
     */

    async getAttendances(callbackInProcess: any = () => {}) {
        return await this._transactionService.getAttendances(callbackInProcess)
    }

    async freeData() {
        try {
            const resp = await this.executeCmd(COMMANDS.CMD_FREE_DATA, '');
            return !!resp;
        } catch (err) {
            console.error('Error freeing data:', err);
            throw err;  // Optionally, re-throw the error if you need to handle it upstream
        }
    }

    async disableDevice() {
        try {
            const resp = await this.executeCmd(COMMANDS.CMD_DISABLEDEVICE, REQUEST_DATA.DISABLE_DEVICE);
            return !!resp;
        } catch (err) {
            console.error('Error disabling device:', err);
            throw err;  // Optionally, re-throw the error if you need to handle it upstream
        }
    }

    async enableDevice() {
        try {
            const resp = await this.executeCmd(COMMANDS.CMD_ENABLEDEVICE, '');
            return !!resp;
        } catch (err) {
            console.error('Error enabling device:', err);
            throw err;  // Optionally, re-throw the error if you need to handle it upstream
        }
    }

    async disconnect(): Promise<void> {
        try {
            // Attempt to execute the disconnect command
            await this.executeCmd(COMMANDS.CMD_EXIT, '');
        } catch (err) {
            // Log any errors encountered during command execution
            console.error('Error during disconnection:', err);
            // Optionally, add more handling or recovery logic here
        }

        // Attempt to close the socket and return the result
        try {
            await this.closeSocket();
        } catch (err) {
            // Log any errors encountered while closing the socket
            console.error('Error during socket closure:', err);
            // Optionally, rethrow or handle the error if necessary
            throw err; // Re-throwing to propagate the error
        }
    }


    async getInfo() {
        try {
            // Execute the command to retrieve free sizes from the device
            const data = await this.executeCmd(COMMANDS.CMD_GET_FREE_SIZES, '');

            // Parse the response data to extract and return relevant information
            return {
                userCounts: data.readUIntLE(24, 4), // Number of users
                logCounts: data.readUIntLE(40, 4),  // Number of logs
                logCapacity: data.readUIntLE(72, 4) // Capacity of logs in bytes
            };
        } catch (err) {
            // Log the error for debugging purposes
            console.error('Error getting device info:', err);
            // Re-throw the error to allow upstream error handling
            throw err;
        }
    }

    async getSizes() {
        try {
            // Execute the command to retrieve free sizes from the device
            const data = await this.executeCmd(COMMANDS.CMD_GET_FREE_SIZES, '');

            // Parse the response data to extract and return relevant information
            const buf = data.slice(8) // remove header
            this.user_count = buf.readUIntLE(16, 4)
            this.fp_count = buf.readUIntLE(24,4)
            this.pwd_count = buf.readUIntLE(52,4)
            this.oplog_count = buf.readUIntLE(40,4)
            this.attlog_count = buf.readUIntLE(32,4)
            this.fp_cap = buf.readUIntLE(56,4)
            this.user_cap = buf.readUIntLE(60,4)
            this.attlog_cap = buf.readUIntLE(64,4)
            this.fp_av = buf.readUIntLE(68,4)
            this.user_av = buf.readUIntLE(72,4)
            this.attlog_av = buf.readUIntLE(76,4)
            this.face_count = buf.readUIntLE(80,4)
            this.face_cap = buf.readUIntLE(88,4)

            return {
                userCounts: this.user_count, // Number of users
                logCounts: this.attlog_count,  // Number of logs
                fingerCount: this.fp_count,
                adminCount: this.pwd_count,
                opLogCount: this.oplog_count,
                logCapacity:  this.attlog_cap, // Capacity of logs in bytes
                fingerCapacity: this.fp_cap,
                userCapacity: this.user_cap,
                attLogCapacity: this.attlog_cap,
                fingerAvailable: this.fp_av,
                userAvailable: this.user_av,
                attLogAvailable: this.attlog_av,
                faceCount: this.face_count,
                faceCapacity: this.face_cap
            };
        } catch (err) {
            // Log the error for debugging purposes
            console.error('Error getting device info:', err);
            // Re-throw the error to allow upstream error handling
            throw err;
        }
    }


    async getVendor() {
        const keyword = '~OEMVendor';

        try {
            // Execute the command to get oem vendor
            const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

            // Extract and format the oem bendor from the response data
            const vendor = data.slice(8) // Skip the first 8 bytes (header)
                .toString('ascii')              // Convert buffer to string
                .replace(`${keyword}=`, '')     // Remove the keyword prefix
                .replace(/\u0000/g, '');        // Remove null characters

            return vendor;
        } catch (err) {
            // Log the error for debugging
            console.error('Error getting vendor:', err);
            // Re-throw the error for higher-level handling
            throw err;
        }
    }


    async getProductTime() {
        const keyword = '~ProductTime';

        try {
            // Execute the command to get serial number
            const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

            // Extract and format the serial number from the response data
            const ProductTime = data.slice(8) // Skip the first 8 bytes (header)
                .toString('ascii')              // Convert buffer to string
                .replace(`${keyword}=`, '')     // Remove the keyword prefix
                .replace(/\u0000/g, '');        // Remove null characters

            return new Date(ProductTime);

        } catch (err) {
            // Log the error for debugging
            console.error('Error getting Product Time:', err);
            // Re-throw the error for higher-level handling
            throw err;
        }
    }

    async getMacAddress() {
        const keyword = 'MAC';

        try {
            // Execute the command to get serial number
            const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

            // Extract and format the serial number from the response data
            const macAddr = data.slice(8) // Skip the first 8 bytes (header)
                .toString('ascii')              // Convert buffer to string
                .replace(`${keyword}=`, '')     // Remove the keyword prefix
                .replace(/\u0000/g, '');        // Remove null characters

            return macAddr;
        } catch (err) {
            // Log the error for debugging
            console.error('Error getting MAC address:', err);
            // Re-throw the error for higher-level handling
            throw err;
        }
    }

    async getNetworkParams() {
        try {
            const params = {
                IPAddress: this.ip,
                NetMask: '',
                GATEIPAddress: ''
            }
            const keywords = Object.keys(params)
            for await (const keyword of keywords) {
                const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword)
                params[keyword] = data.slice(8)
                    .toString('utf-8')
                    .replace(`${keyword}=`, '')     // Remove the keyword prefix
                    .replace(/\u0000/g, '')
                    .replace('=','.')               // Replace equal simbol to dot, due to sometimes there are parsing errors
            }

            return params;
        } catch (err) {
            console.error("Error getting Network Params: ", err);
            throw err;
        }
    }


    async getSerialNumber() {
        const keyword = '~SerialNumber';
        let serialNumber = ''
        let count = 10;
        try {
            // Execute the command to get serial number
            /**
             * @dev implemented a counter and a while loop because sometimes serial number parses wrong for some reason
             * */
            while (serialNumber.length !== 13 && count > 0) {
                const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

                // Extract and format the serial number from the response data
                const SN = data.slice(8) // Skip the first 8 bytes (header)
                    .toString('utf-8')                             // Convert buffer to string
                    .replace(`${keyword}=`, '')     // Remove the keyword prefix
                    .replace('=','')                // Remove sometines last number is a character equal to = or unknow character
                    .replace(/\u0000/g, '');        // Remove null characters
                if (serialNumber.length !== 13 && this.verbose) {
                    console.warn('Serial number length not equal to 13, check')
                }
                count--;
                serialNumber = SN;
            }
            return serialNumber;
        } catch (err) {
            // Log the error for debugging
            console.error('Error getting serial number:', err);
            // Re-throw the error for higher-level handling
            throw err;
        }
    }


    async getDeviceVersion() {
        const keyword = '~ZKFPVersion';

        try {
            // Execute the command to get device version
            const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

            // Extract and format the device version from the response data
                        // Remove null characters
            return data.slice(8)      // Skip the first 8 bytes (header)
                .toString('ascii')                  // Convert buffer to ASCII string
                .replace(`${keyword}=`, '')         // Remove the keyword prefix
                .replace(/\u0000/g, '');
        } catch (err) {
            // Log the error for debugging
            console.error('Error getting device version:', err);
            // Re-throw the error for higher-level handling
            throw err;
        }
    }


    async getDeviceName() {
        const keyword = '~DeviceName';

        try {
            // Execute the command to get the device name
            const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

            // Extract and format the device name from the response data
                      // Remove null characters
            return data.slice(8)      // Skip the first 8 bytes (header)
                .toString('ascii')                // Convert buffer to ASCII string
                .replace(`${keyword}=`, '')       // Remove the keyword prefix
                .replace(/\u0000/g, '');
        } catch (err) {
            // Log the error for debugging
            console.error('Error getting device name:', err);
            // Re-throw the error for higher-level handling
            throw err;
        }
    }


    async getPlatform() {
        const keyword = '~Platform';

        try {
            // Execute the command to get the platform information
            const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

            // Extract and format the platform information from the response data
                          // Remove null characters
            return data.slice(8)              // Skip the first 8 bytes (header)
                .toString('ascii')                    // Convert buffer to ASCII string
                .replace(`${keyword}=`, '')           // Remove the keyword prefix
                .replace(/\u0000/g, '');
        } catch (err) {
            // Log the error for debugging
            console.error('Error getting platform information:', err);
            // Re-throw the error for higher-level handling
            throw err;
        }
    }


    async getOS() {
        const keyword = '~OS';

        try {
            // Execute the command to get the OS information
            const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

            // Extract and format the OS information from the response data
                          // Remove null characters
            return data.slice(8)              // Skip the first 8 bytes (header)
                .toString('ascii')                    // Convert buffer to ASCII string
                .replace(`${keyword}=`, '')           // Remove the keyword prefix
                .replace(/\u0000/g, '');
        } catch (err) {
            // Log the error for debugging
            console.error('Error getting OS information:', err);
            // Re-throw the error for higher-level handling
            throw err;
        }
    }


    async getWorkCode() {
        const keyword = 'WorkCode';

        try {
            // Execute the command to get the WorkCode information
            const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

            // Extract and format the WorkCode information from the response data
                          // Remove null characters
            return data.slice(8)            // Skip the first 8 bytes (header)
                .toString('ascii')                  // Convert buffer to ASCII string
                .replace(`${keyword}=`, '')        // Remove the keyword prefix
                .replace(/\u0000/g, '');
        } catch (err) {
            // Log the error for debugging
            console.error('Error getting WorkCode:', err);
            // Re-throw the error to be handled by the caller
            throw err;
        }
    }


    async getPIN() {
        const keyword = '~PIN2Width';

        try {
            // Execute the command to get the PIN information
            const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

            // Extract and format the PIN information from the response data
                          // Remove null characters
            return data.slice(8)            // Skip the first 8 bytes (header)
                .toString('ascii')              // Convert buffer to ASCII string
                .replace(`${keyword}=`, '')    // Remove the keyword prefix
                .replace(/\u0000/g, '');
        } catch (err) {
            // Log the error for debugging
            console.error('Error getting PIN:', err);
            // Re-throw the error to be handled by the caller
            throw err;
        }
    }


    async getFaceOn() {
        const keyword = 'FaceFunOn';

        try {
            // Execute the command to get the face function status
            const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

            // Extract and process the status from the response data
            const status = data.slice(8)                        // Skip the first 8 bytes (header)
                .toString('ascii')                            // Convert buffer to ASCII string
                .replace(`${keyword}=`, '');                  // Remove the keyword prefix

            // Determine and return the face function status
            return status.includes('0') ? 'No' : 'Yes';
        } catch (err) {
            // Log the error for debugging
            console.error('Error getting face function status:', err);
            // Re-throw the error to be handled by the caller
            throw err;
        }
    }


    async getSSR() {
        const keyword = '~SSR';

        try {
            // Execute the command to get the SSR value
            const data = await this.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, keyword);

            // Extract and process the SSR value from the response data
                         // Remove the keyword prefix
            // Return the SSR value
            return data.slice(8)                // Skip the first 8 bytes (header)
                .toString('ascii')                       // Convert buffer to ASCII string
                .replace(`${keyword}=`, '');
        } catch (err) {
            // Log the error for debugging
            console.error('Error getting SSR value:', err);
            // Re-throw the error to be handled by the caller
            throw err;
        }
    }


    async getFirmware() {
        try {
            // Execute the command to get firmware information
            const data = await this.executeCmd(1100, '');

            // Extract and return the firmware version from the response data
            return data.slice(8) // Skip the first 8 bytes (header)
                .toString('ascii') // convert to ASCII string
                .replace(/\u0000/g, ''); // remove x00
        } catch (err) {
            // Log the error for debugging
            console.error('Error getting firmware version:', err);
            // Re-throw the error to be handled by the caller
            throw err;
        }
    }


    async getTime() {
        try {
            // Execute the command to get the current time
            const response = await this.executeCmd(COMMANDS.CMD_GET_TIME, '');

            // Check if the response is valid
            if (!response || response.length < 12) {
                throw new Error('Invalid response received for time command');
            }

            // Extract and decode the time value from the response
            const timeValue = response.readUInt32LE(8); // Read 4 bytes starting at offset 8
            return timeParser.decode(timeValue); // Parse and return the decoded time
        } catch (err) {
            // Log the error for debugging
            console.error('Error getting time:', err);

            // Re-throw the error for the caller to handle
            throw err;
        }
    }


    async setTime(tm: Date | string) {
        try {
            // Validate the input time
            if (!(tm instanceof Date) && typeof tm !== 'number') {
                throw new TypeError('Invalid time parameter. Must be a Date object or a timestamp.');
            }

            // Convert the input time to a Date object if it's not already
            const date = (tm instanceof Date) ? tm : new Date(tm);

            // Encode the time into the required format
            const encodedTime = timeParser.encode(date);

            // Create a buffer and write the encoded time
            const commandString = Buffer.alloc(32);
            commandString.writeUInt32LE(encodedTime, 0);

            // Send the command to set the time
            const time = await this.executeCmd(COMMANDS.CMD_SET_TIME, commandString);
            return !!time
        } catch (err) {
            // Log the error for debugging
            console.error('Error setting time:', err);
            // Re-throw the error for the caller to handle
            throw err;
        }
    }


    async voiceTest() {
        try {
            // Define the command data for the voice test
            const commandData = Buffer.from('\x00\x00', 'binary');
            await this.executeCmd(COMMANDS.CMD_TESTVOICE, commandData);
            // Execute the command and return the result
        } catch (err) {
            // Log the error for debugging purposes
            console.error('Error executing voice test:', err);

            // Re-throw the error to be handled by the caller
            throw err;
        }
    }


    async setUser(uid: number, userid: string, name: string, password: string, role: number = 0, cardno: number = 0) {
        try {
            // Validate input parameters
            if (
                uid <= 0 || uid > 3000 ||
                userid.length > 9 ||
                name.length > 24 ||
                password.length > 8 ||
                typeof role !== 'number' ||
                cardno.toString().length > 10
            ) {
                throw new Error('Invalid input parameters');
            }

            // Allocate and initialize the buffer
            const commandBuffer = Buffer.alloc(72);

            // Fill the buffer with user data
            commandBuffer.writeUInt16LE(uid, 0);
            commandBuffer.writeUInt16LE(role, 2);
            commandBuffer.write(password.padEnd(8, '\0'), 3, 8); // Ensure password is 8 bytes
            commandBuffer.write(name.padEnd(24, '\0'), 11, 24); // Ensure name is 24 bytes
            commandBuffer.writeUInt16LE(cardno, 35);
            commandBuffer.writeUInt32LE(0, 40); // Placeholder or reserved field
            commandBuffer.write(userid.padEnd(9, '\0'), 48, 9); // Ensure userid is 9 bytes

            // Send the command and return the result
            const created = await this.executeCmd(COMMANDS.CMD_USER_WRQ, commandBuffer);
            return !!created

        } catch (err) {
            // Log error details for debugging
            console.error('Error setting user:', err);

            // Re-throw error for upstream handling
            throw err;
        }
    }

    async deleteUser(uid: number) {
        return await this._userService.DeleteUser(uid);
    }

    async getUserTemplate(uid: number, fid: number) {
        try {
            return await this._userService.DownloadFp(uid, fid);
        } catch (err) {
            throw err
        }  finally {
            await this.refreshData()
        }
    }

    async getAttendanceSize() {
        try {
            // Execute command to get free sizes
            const data = await this.executeCmd(COMMANDS.CMD_GET_FREE_SIZES, '');

            // Parse and return the attendance size
            return data.readUIntLE(40, 4); // Assuming data at offset 40 represents the attendance size

        } catch (err) {
            // Log error details for debugging
            console.error('Error getting attendance size:', err);

            // Re-throw the error to be handled by the caller
            throw err;
        }
    }


    // Clears the attendance logs on the device
    async clearAttendanceLog() {
        return await this._transactionService.clearAttendanceLog()
    }

    /**
     * Clears all data on the device
     * @value 1 Attendance records
     * @value 2 Fingerprint templates
     * @value 3 None
     * @value 4 Operation records
     * @value 5 User information
     * @default 0 Delete all
     */
    async clearData(value?: number) {
        try {
            // Execute the command to clear all data
            await this.disableDevice()
            if (!value) value = 3
            const buf =  await this.executeCmd(COMMANDS.CMD_CLEAR_DATA, value.toString());

            await this.refreshData()

            await this.enableDevice()

            return !!buf
        } catch (err) {
            // Log the error for debugging purposes
            console.error('Error clearing data:', err);
            // Re-throw the error to be handled by the caller
            throw err;
        }
    }

    async getRealTimeLogs(cb = (realTimeLog: RealTimeLog) => {}) {
        this.replyId++; // Increment the reply ID for this request

        try {
            // Create a buffer with the command header to request real-time logs
            const buf = createTCPHeader(COMMANDS.CMD_REG_EVENT, this.sessionId, this.replyId, Buffer.from([0x01, 0x00, 0x00, 0x00]));

            // Send the request to the device
            this.socket.write(buf, null, (err) => {
                if (err) {
                    // Log and reject the promise if there is an error writing to the socket
                    console.error('Error sending real-time logs request:', err);
                    throw err;
                }
            });
            // Ensure data listeners are added only once
            if (this.socket.listenerCount('data') === 0) {
                this.socket.on('data', (data) => {
                    // Check if the data is an event and not just a regular response
                    if (checkNotEventTCP(data)) {
                        // Process the data if it is of the expected length
                        if (data.length > 16) {
                            // Decode and pass the log to the callback
                            cb(decodeRecordRealTimeLog52(data));
                        }
                    }
                });
            }
        } catch (err) {
            // Handle errors and reject the promise
            console.error('Error getting real-time logs:', err);
            throw err;
        }
    }

    /**
     * Get all Finger objects
     * @returns {Record<string, Finger[]>}
     */
    async getTemplates(callbackInProcess: any = () => {}): Promise<Record<string, Finger[]>>{
        return await this._userService.getTemplates(callbackInProcess);
    }

    /**
     * Return size
     * @param packet 
     */
    testTcpTop(packet) {
        // Check if packet is too small
        if (packet.length <= 8) return 0;
        
        // Extract header values using little-endian format
        const headerValue1 = packet.readUInt16LE(0);
        const headerValue2 = packet.readUInt16LE(2);
        const size = packet.readUInt32LE(4);
        
        // Check if magic numbers match
        if (headerValue1 === Constants.MACHINE_PREPARE_DATA_1 && 
            headerValue2 === Constants.MACHINE_PREPARE_DATA_2) {
            return size;
        }
        
        return 0;
    }

    async refreshData(){
        try {
            const reply = await this.executeCmd(COMMANDS.CMD_REFRESHDATA,'')
            return !!reply
        } catch (err) {
            console.error('Error getting user templates: ', err);
            throw err;
        }
    }
    async sendWithBuffer(buffer: Buffer) {
        const MAX_CHUNK = 1024;
        const size = buffer.length;
        await this.freeData();
        
        const commandString = Buffer.alloc(4); // 'I' is 4 bytes
        commandString.writeUInt32LE(size, 0);
        try {
            const cmdResponse = await this.executeCmd(COMMANDS.CMD_PREPARE_DATA, commandString);
            // responds with 2000 = CMD_ACK_OK
            if (!cmdResponse) {
                throw new Error("Can't prepare data");
            }
        } catch(e) { console.error(e) }
        const remain = size % MAX_CHUNK;
        const packets = Math.floor((size - remain) / MAX_CHUNK);
        let start = 0;
        try {
            for (let i = 0; i < packets; i++) {
                const resp = await this.sendChunk(buffer.slice(start, start + MAX_CHUNK));
                if (resp) {
                    start += MAX_CHUNK;
                    if (i == packets-1 && remain) {
                        const lastPacket = await this.sendChunk(buffer.slice(start, start + remain));
                        return lastPacket
                    }
                }
            }
        } catch(e) {
            console.error(e)
        }
    }
    
    async sendChunk(commandString: Buffer) {
        try {
            return await new Promise((resolve,reject) => {
                resolve(this.executeCmd(COMMANDS.CMD_DATA, commandString))
            })
        } catch(e){
            throw new ZkError(e,COMMANDS.CMD_DATA,this.ip);
        }
    }
    /**
     * save user and template
     * 
     * @param {string} user - user_id for customer
     * @param {Finger[]} fingers - Array of finger class. `0 <= index <= 9`
     */
    async saveUserTemplate(user: string, fingers: Finger[] = []) {
        return await this._userService.saveTemplates(user, fingers);
    }
    /** Delete finger templates
     * @warn WARNING: if no params are provided, deletes ALL!
     * @param {number} uid the internal user id in device
     * @param {number} fid the finger id which is a number between 0 and 9
     */
    async deleteFinger(uid?: number, fid?: number) {
        return await this._userService.deleteFinger(uid, fid);
    }

    async uploadFingerTemplate(user_id: string, fp_template: string, fid: number, valid: number) {
        return await this._userService.uploadFingerTemplate(user_id, fp_template, fid, valid)
    }

    async enrollUser(uid: number , tempId: number, userId: string = '') {
        return await this._userService.enrollInfo(uid, tempId);
    }

    async readSocket(length: number, cb=null): Promise<any> {
        let replyBufer = Buffer.from([])
        let totalPackets = 0;
        return new Promise((resolve,reject)=> {
            let timer = setTimeout(() => {
                internalCallback(replyBufer, new Error('TIMEOUT WHEN RECEIVING PACKET'))
            }, this.timeout)

            const internalCallback = (replyData, err = null) => {
                this.socket && this.socket.removeListener('data', onDataEnroll)
                timer && clearTimeout(timer)
                resolve({data: replyData, err: err})
            }

            function onDataEnroll(data) {
                clearTimeout(timer)
                timer = setTimeout(() => {
                    internalCallback(replyBufer,
                        new Error(`TIME OUT !! ${totalPackets} PACKETS REMAIN !`))
                }, this.timeout)
                replyBufer = Buffer.concat([replyBufer, data], replyBufer.length+data.length)
                if (data.length == length) {
                    internalCallback(data)
                }
            }
            this.socket.once('close', () => {
                internalCallback(replyBufer, new Error('Socket is disconnected unexpectedly'))
            })

            this.socket.on('data', onDataEnroll);
        }).catch((err) => {
            console.error("Promise Rejected:", err); // Log the rejection reason
            throw err; // Re-throw the error to be handled by the caller
        });
    }
    /**
     * Register events
     * @param {number} flags - Event flags
     * @returns {Promise<void>}
     * @throws {ZKErrorResponse} If registration fails
     */
    async regEvent(flags: number): Promise<void> {
        try {
            const commandString = Buffer.alloc(4); // 'I' format is 4 bytes
            commandString.writeUInt32LE(flags, 0); // Little-endian unsigned int
            const cmdResponse = await this.executeCmd(COMMANDS.CMD_REG_EVENT, commandString);
            if (this.verbose) console.log("regEvent: ", cmdResponse.readUInt16LE(0))
        } catch (e) {
            throw new ZkError(e,COMMANDS.CMD_REG_EVENT,this.ip);
        }
    }

    async ackOk(){
        try {
            const buf = createTCPHeader(COMMANDS.CMD_ACK_OK, this.sessionId, Constants.USHRT_MAX-1, Buffer.from([]))
            this.socket.write(buf)
        } catch (e) {
            throw new ZkError(e,COMMANDS.CMD_ACK_OK, this.ip)
        }
    }

    async cancelCapture(){
        try {
            const reply = await this.executeCmd(COMMANDS.CMD_CANCELCAPTURE,'')
            return !!reply
        } catch (e){
            throw new ZkError(e,COMMANDS.CMD_CANCELCAPTURE,this.ip)
        }
    }

    async verifyUser(uid: number){
        return this._userService.verify(uid)
    }
    async restartDevice(){
        try {
            await this.executeCmd(COMMANDS.CMD_RESTART,'')
        } catch (e) {
            throw new ZkError(e,COMMANDS.CMD_RESTART,this.ip)
        }
    }
}