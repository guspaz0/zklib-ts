export enum COMMANDS {
    CMD_ACK_DATA = 2002,
    CMD_ACK_ERROR = 2001, //There was an error when processing the request.
    CMD_ACK_ERROR_CMD = 65533,
    CMD_ACK_ERROR_DATA = 65531,
    CMD_ACK_ERROR_INIT = 65532,
    CMD_ACK_OK = 2000, //The request was processed sucessfully.
    CMD_ACK_REPEAT = 2004,
    CMD_ACK_RETRY = 2003,
    CMD_ACK_UNAUTH = 2005, //Connection not authorized.
    CMD_ACK_UNKNOWN = 65535, //Received unknown command.
    CMD_ATTLOG_RRQ = 13, //Request attendance log.
    CMD_AUTH = 1102, //Request to begin session using commkey.
    CMD_CANCELCAPTURE = 62, //Disable normal authentication of users.
    CMD_CAPTUREFINGER = 1009, //Capture fingerprint picture.
    CMD_CAPTUREIMAGE = 1012, //Capture the entire image.
    CMD_CHANGE_SPEED = 1101, //Change transmission speed.
    CMD_CHECKSUM_BUFFER = 119, //Get checksum of machine's buffer.
    CMD_CLEAR_ACC = 32, //Restore access control to default.
    CMD_CLEAR_ADMIN = 20, //Clears admins privileges.
    CMD_CLEAR_ATTLOG = 15, //Delete attendance record.
    CMD_CLEAR_DATA = 14, //Delete data.
    CMD_CLEAR_LCD = 67, //Clear screen captions.
    CMD_CLEAR_OPLOG = 33, //Delete operations log.
    CMD_CONNECT = 1000, //Begin connection.
    CMD_DATA = 1501, //Data packet.
    CMD_DATA_RDY = 1504, //Indicates that it is ready to receive data.
    CMD_DATA_WRRQ = 1503, //Read/Write a large data set.
    CMD_DB_RRQ = 7, //Read saved data.
    CMD_DEL_FPTMP = 134, //Deletes fingerprint template.
    CMD_DELETE_SMS = 72, //Delete short message.
    CMD_DELETE_UDATA = 74, //Delete user short message.
    CMD_DELETE_USER = 18, //Delete user.
    CMD_DELETE_USERTEMP = 19, //Delete user fingerprint template.
    CMD_DISABLEDEVICE = 1003, //Disables fingerprint, rfid reader and keyboard.
    CMD_DOORSTATE_RRQ = 75, //Get door state.
    CMD_EMPTY_MIFARE = 78, //Clear Mifare card.
    CMD_ENABLE_CLOCK = 57, //Enables the ":" in screen clock.
    CMD_ENABLEDEVICE = 1002, //Change machine state to "normal work".
    CMD_EXIT = 1001, //Disconnect.
    CMD_FREE_DATA = 1502, //Release buffer used for data transmission.
    CMD_GET_FREE_SIZES = 50, //Request machine status (remaining space).
    CMD_GET_PINWIDTH = 69, //Request max size for users id.
    CMD_GET_TIME = 201, //Request machine time.
    CMD_GET_USERTEMP = 88,
    CMD_GET_VERSION = 1100, //Request the firmware edition.
    CMD_GRPTZ_RRQ = 25, //Get group timezone.
    CMD_GRPTZ_WRQ = 26, //Set group timezone.
    CMD_OPLOG_RRQ = 34, //Read operations log.
    CMD_OPTIONS_RRQ = 11, //Read configuration value of the machine.
    CMD_OPTIONS_WRQ = 12, //Change configuration value of the machine.
    CMD_POWEROFF = 1005, //Shut-down machine.
    CMD_PREPARE_DATA = 1500, //Prepare for data transmission.
    CMD_REFRESHDATA = 1013, //Refresh the machine stored data.
    CMD_REFRESHOPTION = 1014, //Refresh the configuration parameters.
    CMD_REG_EVENT = 500, //Realtime events.
    CMD_RESTART = 1004, //Restart machine.
    CMD_RESUME = 1007, //Change machine state to "awaken".
    CMD_SET_TIME = 202, //Set machine time.
    CMD_SLEEP = 1006, //Change machine state to "idle".
    CMD_SMS_RRQ = 71, //Download short message.
    CMD_SMS_WRQ = 70, //Upload short message.
    CMD_STARTENROLL = 61, //Start enroll procedure.
    CMD_STARTVERIFY = 60, //Set the machine to authentication state.
    CMD_STATE_RRQ = 64, //Query state.
    CMD_TEST_TEMP = 1011, //Test if fingerprint exists.
    CMD_TESTVOICE = 1017, //Test voice.
    CMD_TMP_WRITE = 87, //Transfer fp template from buffer.
    CMD_TZ_RRQ = 27, //Get device timezones.
    CMD_TZ_WRQ = 28, //Set device timezones.
    CMD_UDATA_WRQ = 73, //Set user short message.
    CMD_ULG_RRQ = 29, //Get group combination to unlock.
    CMD_ULG_WRQ = 30, //Set group combination to unlock.
    CMD_UNLOCK = 31, //Unlock door for a specified amount of time.
    CMD_USER_WRQ = 8, //Upload user data.
    CMD_USERGRP_RRQ = 21, //Read user group.
    CMD_USERGRP_WRQ = 22, //Set user group.
    CMD_USERTEMP_RRQ = 9, //Read user fingerprint template.
    CMD_USERTEMP_WRQ = 10, //Upload user fingerprint template.
    CMD_USERTZ_RRQ = 23, //Get user timezones.
    CMD_USERTZ_WRQ = 24, //Set the user timezones.
    CMD_VERIFY_RRQ = 80, //Read verification style of a given user.
    CMD_VERIFY_WRQ = 79, //Change verification style of a given user.
    CMD_WRITE_LCD = 66, //Prints chars to the device screen.
    CMD_WRITE_MIFARE = 76, //Write data to Mifare card.
    EF_ALARM = 512, //Triggered alarm.
    EF_ATTLOG = 1, //Attendance entry.
    EF_BUTTON = 16, //Pressed keyboard key.
    EF_ENROLLFINGER = 8, //Upload user data.
    EF_ENROLLUSER = 4, //Enrolled user.
    EF_FINGER = 2, //Pressed finger.
    EF_FPFTR = 256, //Fingerprint score in enroll procedure.
    EF_UNLOCK = 32, //Restore access control to default.
    EF_VERIFY = 128, //Registered user placed finger.
};

export type CommandKeys = keyof typeof COMMANDS;
export type CommandValues = typeof COMMANDS[CommandKeys];

export enum Constants {
    USHRT_MAX = 65535,
    MAX_CHUNK = 65472,
    MACHINE_PREPARE_DATA_1 = 20560,
    MACHINE_PREPARE_DATA_2 = 32130
}


interface RequestData {
    DISABLE_DEVICE: Buffer;
    GET_REAL_TIME_EVENT: Buffer;
    GET_ATTENDANCE_LOGS: Buffer;
    GET_USERS: Buffer;
    GET_TEMPLATES: Buffer;
}

export const REQUEST_DATA: RequestData = {
    DISABLE_DEVICE: Buffer.from([0, 0, 0, 0]),
    GET_REAL_TIME_EVENT: Buffer.from([0x01, 0x00, 0x00, 0x00]),
    GET_ATTENDANCE_LOGS: Buffer.from([0x01, 0x0d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    GET_USERS: Buffer.from([0x01, 0x09, 0x00, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    GET_TEMPLATES: Buffer.from([0x01, 0x07, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
};