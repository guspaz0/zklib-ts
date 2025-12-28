import {ZTCP} from "../ztcp";
import {COMMANDS, REQUEST_DATA} from "../helper/command";
import {decodeRecordData40} from "../helper/utils";

export class TransactionService {
    _zkTcp: ZTCP;
    constructor(zkTcp: ZTCP) {
        this._zkTcp = zkTcp;
    }

    async getAttendances(callbackInProcess: any = () => {}) {
        try {
            // Free any existing buffer data to prepare for a new request
            if (this._zkTcp.socket) {
                await this._zkTcp.freeData();
            }

            // Request attendance logs and handle chunked data
            const data = await this._zkTcp.readWithBuffer(REQUEST_DATA.GET_ATTENDANCE_LOGS, callbackInProcess);

            // Free buffer data after receiving the attendance logs
            if (this._zkTcp.socket) {
                await this._zkTcp.freeData();
            }

            // Constants for record processing
            const RECORD_PACKET_SIZE = 40;

            // Ensure data.data is a valid buffer
            if (!data.data || !(data.data instanceof Buffer)) {
                throw new Error('Invalid data received');
            }

            // Process the record data
            let recordData = data.data.subarray(4); // Skip header
            const records = [];

            // Process each attendance record
            while (recordData.length >= RECORD_PACKET_SIZE) {
                const record = decodeRecordData40(recordData.subarray(0, RECORD_PACKET_SIZE));
                records.push({ ...record, ip: this._zkTcp.ip }); // Add IP address to each record
                recordData = recordData.subarray(RECORD_PACKET_SIZE); // Move to the next packet
            }

            // Return the list of attendance records
            return { data: records };

        } catch (err) {
            // Log and re-throw the error
            console.error('Error getting attendance records:', err);
            throw err; // Re-throw the error for handling by the caller
        }
    }

    // Clears the attendance logs on the device
    async clearAttendanceLog() {
        try {
            // Execute the command to clear attendance logs
            await this._zkTcp.disableDevice()

            const buf = await this._zkTcp.executeCmd(COMMANDS.CMD_CLEAR_ATTLOG, '');

            await this._zkTcp.refreshData()

            await this._zkTcp.enableDevice()

            return !!buf
        } catch (err) {
            // Log the error for debugging purposes
            console.error('Error clearing attendance log:', err);
            // Re-throw the error to be handled by the caller
            throw err;
        }
    }
}