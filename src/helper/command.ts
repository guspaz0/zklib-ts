export enum COMMANDS {
    CMD_ACK_DATA = 2002,
    /** There was an error when processing the request.*/
    CMD_ACK_ERROR = 2001,
    CMD_ACK_ERROR_CMD = 65533,
    CMD_ACK_ERROR_DATA = 65531,
    CMD_ACK_ERROR_INIT = 65532,
    /** [0xD0, 0x07] The request was processed sucessfully. */
    CMD_ACK_OK = 2000,
    CMD_ACK_REPEAT = 2004,
    CMD_ACK_RETRY = 2003,
    /** [0xD5, 0x07] Connection not authorized. */
    CMD_ACK_UNAUTH = 2005,
    /** Received unknown command. */
    CMD_ACK_UNKNOWN = 65535,
    /** Request attendance log. */
    CMD_ATTLOG_RRQ = 13,
    /** [0x4E, 0x04] Request to begin session using commkey. */
    CMD_AUTH = 1102,
    /** Disable normal authentication of users. */
    CMD_CANCELCAPTURE = 62,
    /** Capture fingerprint picture. */
    CMD_CAPTUREFINGER = 1009,
    /** Capture the entire image. */
    CMD_CAPTUREIMAGE = 1012,
    /** Change transmission speed. */
    CMD_CHANGE_SPEED = 1101,
    /** [0x77, 0x00] Get checksum of machine's buffer. */
    CMD_CHECKSUM_BUFFER = 119,
    /** Restore access control to default. */
    CMD_CLEAR_ACC = 32,
    /** Clears admins privileges. */
    CMD_CLEAR_ADMIN = 20,
    /** Delete attendance record. */
    CMD_CLEAR_ATTLOG = 15,
    /** Delete data. */
    CMD_CLEAR_DATA = 14,
    /** Clear screen captions. */
    CMD_CLEAR_LCD = 67,
    /** Delete operations log. */
    CMD_CLEAR_OPLOG = 33,
    /** [0xE8, 0x03] Begin connection. */
    CMD_CONNECT = 1000,
    /** [0xDD, 0x05] Data packet. */
    CMD_DATA = 1501,
    /** Indicates that it is ready to receive data. */
    CMD_DATA_RDY = 1504,
    /** Read/Write a large data set. */
    CMD_DATA_WRRQ = 1503,
    /** Read saved data. */
    CMD_DB_RRQ = 7,
    /** Deletes fingerprint template. */
    CMD_DEL_FPTMP = 134,
    /** Delete short message. */
    CMD_DELETE_SMS = 72,
    /** Delete user short message. */
    CMD_DELETE_UDATA = 74,
    /** Delete user. */
    CMD_DELETE_USER = 18,
    /** Delete user fingerprint template. */
    CMD_DELETE_USERTEMP = 19,
    /** Disables fingerprint, rfid reader and keyboard. */
    CMD_DISABLEDEVICE = 1003,
    /** Get door state. */
    CMD_DOORSTATE_RRQ = 75,
    /** Clear Mifare card. */
    CMD_EMPTY_MIFARE = 78,
    /** Enables the ":" in screen clock. */
    CMD_ENABLE_CLOCK = 57,
    /** Change machine state to "normal work". */
    CMD_ENABLEDEVICE = 1002,
    /** [0xE9, 0x03] Disconnect. */
    CMD_EXIT = 1001,
    /** [0xDE, 0x05] Release buffer used for data transmission. */
    CMD_FREE_DATA = 1502,
    /** Request machine status (remaining space). */
    CMD_GET_FREE_SIZES = 50,
    /** Request max size for users id. */
    CMD_GET_PINWIDTH = 69,
    /** Request machine time. */
    CMD_GET_TIME = 201,
    CMD_GET_USERTEMP = 88,
    /** Request the firmware edition. */
    CMD_GET_VERSION = 1100,
    /** Get group timezone. */
    CMD_GRPTZ_RRQ = 25,
    /** Set group timezone. */
    CMD_GRPTZ_WRQ = 26,
    /** Read operations log. */
    CMD_OPLOG_RRQ = 34,
    /** Read configuration value of the machine. */
    CMD_OPTIONS_RRQ = 11,
    /** Change configuration value of the machine. */
    CMD_OPTIONS_WRQ = 12,
    /** Shut-down machine. */
    CMD_POWEROFF = 1005,
    /** [0xDC, 0x05] Prepare for data transmission. */
    CMD_PREPARE_DATA = 1500,
    /** [0xF5, 0x03] Refresh the machine stored data. */
    CMD_REFRESHDATA = 1013,
    /** Refresh the configuration parameters. */
    CMD_REFRESHOPTION = 1014,
    /** Realtime events. */
    CMD_REG_EVENT = 500,
    /** Restart machine. */
    CMD_RESTART = 1004,
    /** Change machine state to "awaken". */
    CMD_RESUME = 1007,
    /** Set machine time. */
    CMD_SET_TIME = 202,
    /** Change machine state to "idle". */
    CMD_SLEEP = 1006,
    /** Download short message. */
    CMD_SMS_RRQ = 71,
    /** Upload short message. */
    CMD_SMS_WRQ = 70,
    /** Start enroll procedure. */
    CMD_STARTENROLL = 61,
    /** Set the machine to authentication state. */
    CMD_STARTVERIFY = 60,
    /** Query state. */
    CMD_STATE_RRQ = 64,
    /** Test if fingerprint exists. */
    CMD_TEST_TEMP = 1011,
    /** Test voice. */
    CMD_TESTVOICE = 1017,
    /** [0x77, 0x00] Transfer fp template from buffer. */
    CMD_TMP_WRITE = 87,
    /** Get device timezones. */
    CMD_TZ_RRQ = 27,
    /** Set device timezones. */
    CMD_TZ_WRQ = 28,
    /** Set user short message. */
    CMD_UDATA_WRQ = 73,
    /** Get group combination to unlock. */
    CMD_ULG_RRQ = 29,
    /** Set group combination to unlock. */
    CMD_ULG_WRQ = 30,
    /** Unlock door for a specified amount of time. */
    CMD_UNLOCK = 31,
    /** Upload user data. */
    CMD_USER_WRQ = 8,
    /** Read user group. */
    CMD_USERGRP_RRQ = 21,
    /** Set user group. */
    CMD_USERGRP_WRQ = 22,
    /** [0x09, 0x00] Read user fingerprint template. */
    CMD_USERTEMP_RRQ = 9,
    /** Upload user fingerprint template. */
    CMD_USERTEMP_WRQ = 10,
    /** Get user timezones. */
    CMD_USERTZ_RRQ = 23,
    /** Set the user timezones. */
    CMD_USERTZ_WRQ = 24,
    /** Read verification style of a given user. */
    CMD_VERIFY_RRQ = 80,
    /** Change verification style of a given user. */
    CMD_VERIFY_WRQ = 79,
    /** Prints chars to the device screen. */
    CMD_WRITE_LCD = 66,
    /** Write data to Mifare card. */
    CMD_WRITE_MIFARE = 76,
    /** Triggered alarm. */
    EF_ALARM = 512,
    /** Attendance entry. */
    EF_ATTLOG = 1,
    /** Pressed keyboard key. */
    EF_BUTTON = 16,
    /** Upload user data. */
    EF_ENROLLFINGER = 8,
    /** Enrolled user. */
    EF_ENROLLUSER = 4,
    /** Pressed finger. */
    EF_FINGER = 2,
    /** Fingerprint score in enroll procedure. */
    EF_FPFTR = 256,
    /** Restore access control to default. */
    EF_UNLOCK = 32,
    /** Registered user placed finger. */
    EF_VERIFY = 128,
}

export enum DISCOVERED_CMD {
    /** Returned when the Finger id not exists in the user uid, when attempting to download single finger template */
    FID_NOT_FOUND = 4993,
}

export type CommandKeys = keyof typeof COMMANDS;
export type CommandValues = typeof COMMANDS[CommandKeys];

export enum Constants {
    USHRT_MAX = 65535,
    MAX_CHUNK = 65472,
    MACHINE_PREPARE_DATA_1 = 20560,
    MACHINE_PREPARE_DATA_2 = 32130
}


interface RequestData {
    /** Fixed buffer to start every TCP packet */
    START_TAG: Buffer;
    DISABLE_DEVICE: Buffer;
    GET_REAL_TIME_EVENT: Buffer;
    GET_ATTENDANCE_LOGS: Buffer;
    GET_USERS: Buffer;
    GET_TEMPLATES: Buffer;
}

export const REQUEST_DATA: RequestData = {
    START_TAG: Buffer.from([0x50, 0x50, 0x82, 0x7d]),
    DISABLE_DEVICE: Buffer.from([0, 0, 0, 0]),
    GET_REAL_TIME_EVENT: Buffer.from([0x01, 0x00, 0x00, 0x00]),
    GET_ATTENDANCE_LOGS: Buffer.from([0x01, 0x0d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    GET_USERS: Buffer.from([0x01, 0x09, 0x00, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    GET_TEMPLATES: Buffer.from([0x01, 0x07, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
};