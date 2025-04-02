/**
 * Represents an Attendance Records
 */ import {type} from "node:os";

export class Attendance {
    sn: number;
    user_id: string;
    record_time: Date;
    type?: number;
    state?: number;
    ip?: string;

    constructor(sn: number, user_id: string, record_time: Date, type?: number, state?: number) {
        this.sn = sn;
        this.user_id = user_id;
        this.record_time = record_time;
        this.type = type;
        this.state = state;
    }
}