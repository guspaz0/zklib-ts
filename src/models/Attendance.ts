/**
 * Represents an Attendance Records
 */ import {type} from "node:os";

export class Attendance {
    /** Internal serial number for the user */
    sn: number;
    /** User ID/Pin stored as a string */
    user_id: string;
    /** Verification type */
    type?: number;
    /** Time of the attendance event */
    record_time: Date;
    /** Verify state */
    state?: number;

    ip?: string;

    constructor(sn: number, user_id: string, type: number, record_time: Date, state?: number) {
        this.sn = sn;
        this.user_id = user_id;
        this.type = type || undefined;
        this.record_time = record_time;
        this.state = state || undefined;
    }
}