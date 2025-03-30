/**
 * Represents an Attendance Records
 */

export class Attendance {
    private sn: number;
    private user_id: string;
    private record_time: Date;
    private type?: number;
    private state?: number;
    private ip?: string;

    constructor(sn: number, user_id: string, record_time: Date, type?: number, state?: number) {
        this.sn = sn;
        this.user_id = user_id;
        this.record_time = record_time;
        this.type = type;
        this.state = state;

    }
}