import {parseTimeToDate} from "../utils";
/**
 * Represents an Attendance Records
 */

export class Attendance {
    private _sn: number;
    private _user_id: string;    //legajo
    private _record_time: Date;
    private _type?: number;
    private _state?: number;
    private _ip?: string;

    constructor(sn: number, user_id: string, record_time: number, type?: number, state?: number) {
        this._sn = sn;
        this._user_id = user_id;
        this._record_time = parseTimeToDate(record_time);
        this._type = type;
        this._state = state;

    }

    get sn(): number {
        return this._sn;
    }

    set sn(value: number) {
        this._sn = value;
    }

    get user_id(): string {
        return this._user_id;
    }

    set user_id(value: string) {
        this._user_id = value;
    }

    get record_time(): Date {
        return this._record_time;
    }

    set record_time(value: Date) {
        this._record_time = value;
    }

    get type(): number {
        return this._type;
    }

    set type(value: number) {
        this._type = value;
    }

    get state(): number {
        return this._state;
    }

    set state(value: number) {
        this._state = value;
    }

    get ip(): string {
        return this._ip;
    }

    set ip(value: string) {
        this._ip = value;
    }

}