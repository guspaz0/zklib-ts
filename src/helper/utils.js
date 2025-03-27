/**
 *
 * Author: coding-libs
 * Date: 2024-07-01
 */

const {USHRT_MAX, COMMANDS} = require('./command')
const {log} = require('../logs/log')
const {User} = require('./models/User')

const parseTimeToDate = (time) => {
    const second = time % 60;
    time = (time - second) / 60;
    const minute = time % 60;
    time = (time - minute) / 60;
    const hour = time % 24;
    time = (time - hour) / 24;
    const day = time % 31 + 1;
    time = (time - (day - 1)) / 31;
    const month = time % 12;
    time = (time - month) / 12;
    const year = time + 2000;

    return new Date(year, month, day, hour, minute, second);
}

const parseHexToTime = (hex) => {
    const time = {
        year: hex.readUIntLE(0, 1),
        month: hex.readUIntLE(1, 1),
        date: hex.readUIntLE(2, 1),
        hour: hex.readUIntLE(3, 1),
        minute: hex.readUIntLE(4, 1),
        second: hex.readUIntLE(5, 1)
    }

    return new Date(2000 + time.year, time.month - 1, time.date, time.hour, time.minute, time.second)
}

const createChkSum = (buf) => {
    let chksum = 0;
    for (let i = 0; i < buf.length; i += 2) {
        if (i == buf.length - 1) {
            chksum += buf[i];
        } else {
            chksum += buf.readUInt16LE(i);
        }
        chksum %= USHRT_MAX;
    }
    chksum = USHRT_MAX - chksum - 1;

    return chksum;
}

module.exports.createUDPHeader = (command, sessionId, replyId, data) => {
    const dataBuffer = Buffer.from(data);
    const buf = Buffer.alloc(8 + dataBuffer.length);

    buf.writeUInt16LE(command, 0);
    buf.writeUInt16LE(0, 2);

    buf.writeUInt16LE(sessionId, 4);
    buf.writeUInt16LE(replyId, 6);
    dataBuffer.copy(buf, 8);

    const chksum2 = createChkSum(buf);
    buf.writeUInt16LE(chksum2, 2);

    replyId = (replyId + 1) % USHRT_MAX;
    buf.writeUInt16LE(replyId, 6);

    return buf
}

module.exports.createTCPHeader = (command, sessionId, replyId, data) => {
    const dataBuffer = Buffer.from(data);
    const buf = Buffer.alloc(8 + dataBuffer.length);

    buf.writeUInt16LE(command, 0);
    buf.writeUInt16LE(0, 2);

    buf.writeUInt16LE(sessionId, 4);
    buf.writeUInt16LE(replyId, 6);
    dataBuffer.copy(buf, 8);

    const chksum2 = createChkSum(buf);
    buf.writeUInt16LE(chksum2, 2);

    replyId = (replyId + 1) % USHRT_MAX;
    buf.writeUInt16LE(replyId, 6);


    const prefixBuf = Buffer.from([0x50, 0x50, 0x82, 0x7d, 0x13, 0x00, 0x00, 0x00])

    prefixBuf.writeUInt16LE(buf.length, 4)

    return Buffer.concat([prefixBuf, buf]);
}

const removeTcpHeader = (buf) => {
    if (buf.length < 8) {
        return buf;
    }

    if (buf.compare(Buffer.from([0x50, 0x50, 0x82, 0x7d]), 0, 4, 0, 4) !== 0) {
        return buf;
    }

    return buf.slice(8);
}

module.exports.removeTcpHeader = removeTcpHeader

module.exports.decodeUserData28 = (userData) => {
    const user = {
        uid: userData.readUIntLE(0, 2),
        role: userData.readUIntLE(2, 1),
        name: userData
            .slice(8, 8 + 8)
            .toString('ascii')
            .split('\0')
            .shift(),
        userId: userData.readUIntLE(24, 4)
    };
    return user;
}

module.exports.decodeUserData72 = (userData) => {
    const user = new User(
        uid = userData.readUIntLE(0, 2),
        name = userData
        .slice(11)
        .toString('ascii')
        .split('\0')
        .shift(),
        privilege = userData.readUIntLE(2, 1),
        password = userData
            .subarray(3, 3 + 8)
            .toString('ascii')
            .split('\0')
            .shift(),
        group_id = userData.readUIntLE(39,1),
        user_id = userData
            .slice(48, 48 + 9)
            .toString('ascii')
            .split('\0')
            .shift(),
        cardno = userData.readUIntLE(35, 4),
        );
    return user;
}

module.exports.decodeRecordData40 = (recordData) => {
    const record = {
        sn: recordData.readUIntLE(0, 2),
        user_id: recordData
            .slice(2, 2 + 9)
            .toString('ascii')
            .split('\0')
            .shift(),
        record_time: parseTimeToDate(recordData.readUInt32LE(27)).toString(),
        type: recordData.readUIntLE(26, 1),
        state: recordData.readUIntLE(31, 1),
    }
    return record
}

module.exports.decodeRecordData16 = (recordData) => {
    const record = {
        user_id: recordData.readUIntLE(0, 2), record_time: parseTimeToDate(recordData.readUInt32LE(4))
    }
    return record
}

module.exports.decodeRecordRealTimeLog18 = (recordData) => {
    const userId = recordData.readUIntLE(8, 1)
    const attTime = parseHexToTime(recordData.subarray(12, 18))
    return {userId, attTime}
}

module.exports.decodeRecordRealTimeLog52 = (recordData) => {
    const payload = removeTcpHeader(recordData)

    const recvData = payload.subarray(8)

    const userId = recvData.slice(0, 9)
        .toString('ascii')
        .split('\0')
        .shift()


    const attTime = parseHexToTime(recvData.subarray(26, 26 + 6))

    return {userId, attTime}

}

module.exports.decodeUDPHeader = (header) => {
    const commandId = header.readUIntLE(0, 2)
    const checkSum = header.readUIntLE(2, 2)
    const sessionId = header.readUIntLE(4, 2)
    const replyId = header.readUIntLE(6, 2)
    return {commandId, checkSum, sessionId, replyId}
}
module.exports.decodeTCPHeader = (header) => {
    const recvData = header.subarray(8)
    const payloadSize = header.readUIntLE(4, 2)

    const commandId = recvData.readUIntLE(0, 2)
    const checkSum = recvData.readUIntLE(2, 2)
    const sessionId = recvData.readUIntLE(4, 2)
    const replyId = recvData.readUIntLE(6, 2)
    return {commandId, checkSum, sessionId, replyId, payloadSize}

}


module.exports.exportErrorMessage = (commandValue) => {
    const keys = Object.keys(COMMANDS)
    for (let i = 0; i < keys.length; i++) {
        if (COMMANDS[keys[i]] === commandValue) {
            return keys[i].toString()
        }
    }

    return 'AN UNKNOWN ERROR'
}

module.exports.checkNotEventTCP = (data) => {
    try {
        data = removeTcpHeader(data)
        const commandId = data.readUIntLE(0, 2)
        const event = data.readUIntLE(4, 2)
        return event === COMMANDS.EF_ATTLOG && commandId === COMMANDS.CMD_REG_EVENT
    } catch (err) {
        log(`[228] : ${err.toString()} ,${data.toString('hex')} `)
        return false
    }
}

module.exports.checkNotEventUDP = (data) => {
    const commandId = this.decodeUDPHeader(data.subarray(0, 8)).commandId
    return commandId === COMMANDS.CMD_REG_EVENT
}

function makeKey(key, sessionId) {
    let k = 0;

    // Bit manipulation similar to the Java version
    for (let i = 0; i < 32; i++) {
        if ((key & (1 << i)) !== 0) {
            k = (k << 1) | 1;
        } else {
            k = k << 1;
        }
    }

    k += sessionId;

    let hex = k.toString(16).padStart(8, "0");

    let response = new Uint8Array(4);
    let index = 3;

    while (hex.length > 0) {
        response[index] = parseInt(hex.substring(0, 2), 16);
        index--;
        hex = hex.substring(2);
    }

    // XOR with 'ZKSO'
    response[0] ^= 'Z'.charCodeAt(0);
    response[1] ^= 'K'.charCodeAt(0);
    response[2] ^= 'S'.charCodeAt(0);
    response[3] ^= 'O'.charCodeAt(0);

    let finalKey =
        response[0] +
        (response[1] << 8) +
        (response[2] << 16) +
        (response[3] << 24);

    // Swap high and low 16 bits
    let swp = finalKey >>> 16;
    finalKey = (finalKey << 16) | swp;

    return finalKey >>> 0; // Ensure unsigned 32-bit
}

module.exports.authKey = (comKey, sessionId) => {
    let k = makeKey(comKey, sessionId) >>> 0; // Convert to unsigned 32-bit
    let rand = Math.floor(Math.random() * 256); // Random 8-bit number

    let hex = k.toString(16).padStart(8, "0");
    let response = new Uint8Array(4);
    let index = 3;

    while (index >= 0) {
        response[index] = parseInt(hex.substring(0, 2), 16);
        index--;
        hex = hex.substring(2);
    }

    // XOR with random number
    response[0] ^= rand;
    response[1] ^= rand;
    response[2] = rand;
    response[3] ^= rand;

    return Array.from(response);
}