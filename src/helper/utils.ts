import { COMMANDS, RTEvent } from "./command";
import { Constants } from "./command";
import { log } from "../logs/log";
import { User } from "../models/User";
import { Attendance } from "../models/Attendance";

interface ParsedTime {
  year: number;
  month: number;
  date: number;
  hour: number;
  minute: number;
  second: number;
}

export interface DeviceInfo {
  userCounts: number;
  logCounts: number;
  logCapacity: number;
}

export type UserData28 = Omit<
  User,
  "password" | "group_id" | "card" | "repack29" | "repack73"
>;

export interface RecordData16 {
  record_time: Date;
  user_id: string;
  ip?: string;
}

export interface AlarmEvent {
  /** Misoperation [0x3A], Tamper [0x37], Exit Button [0x35] */
  alarm_type: any;
  /** indicates cause, 20 = Duress, 22 = Passback */
  alarm_cause: any;
  /** user serial number */
  user_uid: any;
  /** matching way */
  match_type: any;
}

export interface EnrolledFingerEvent {
  /** Error code */
  result: number;
  /** finger size */
  size: number;
  /** user pin, storedAsString  */
  pin: string;
  /** finger index */
  fid: number;
}

export interface FingerScoreEvent {
  /** a number between 0 [0x00] and 100 [0x64] indicating the quality ofThe finger during enrolling process */
  score: number;
}

export type RealTimeLog = {
  event: RTEvent;
  payload?: RecordData16 | EnrolledFingerEvent | AlarmEvent | FingerScoreEvent;
};

interface UDPHeader {
  commandId: number;
  checkSum: number;
  sessionId: number;
  replyId: number;
}

interface TCPHeader extends UDPHeader {
  payloadSize: number;
}

export type FreeSizes = {
  /** Number of users */
  userCounts: number;
  /** Number of logs */
  logCounts: number;
  /** Number of fingerprints */
  fingerCount: number;
  /** Number of admins */
  adminCount: number;
  /** Number or opLogs, maybe access control events? */
  opLogCount: number;
  /** Capacity of logs in bytes */
  logCapacity: number;
  /** Capacity of fingerprints */
  fingerCapacity: number;
  /** Capacity of users */
  userCapacity: number;
  /** Capacity of oplog */
  attLogCapacity: number;
  /** Number of available finger templates */
  fingerAvailable: number;
  /** Number of available Users */
  userAvailable: number;
  /** Number of attendanceLog available */
  attLogAvailable: number;
  /** Number of faces */
  faceCount: number;
  /** Capacity of faces */
  faceCapacity: number;
};

const parseHexToTime = (hex: Buffer): Date => {
  const time: ParsedTime = {
    year: hex.readUIntLE(0, 1),
    month: hex.readUIntLE(1, 1),
    date: hex.readUIntLE(2, 1),
    hour: hex.readUIntLE(3, 1),
    minute: hex.readUIntLE(4, 1),
    second: hex.readUIntLE(5, 1),
  };

  return new Date(
    2000 + time.year,
    time.month - 1,
    time.date,
    time.hour,
    time.minute,
    time.second,
  );
};

const createChkSum = (buf: Buffer): number => {
  let chksum = 0;
  for (let i = 0; i < buf.length; i += 2) {
    if (i === buf.length - 1) {
      chksum += buf[i];
    } else {
      chksum += buf.readUInt16LE(i);
    }
    chksum %= Constants.USHRT_MAX;
  }
  chksum = Constants.USHRT_MAX - chksum - 1;

  return chksum;
};

export const createUDPHeader = (
  command: number,
  sessionId: number,
  replyId: number,
  data: any,
): Buffer => {
  const dataBuffer = Buffer.from(data);
  const buf = Buffer.alloc(8 + dataBuffer.length);

  buf.writeUInt16LE(command, 0);
  buf.writeUInt16LE(0, 2);

  buf.writeUInt16LE(sessionId, 4);
  buf.writeUInt16LE(replyId, 6);
  dataBuffer.copy(buf, 8);

  const chksum2 = createChkSum(buf);
  buf.writeUInt16LE(chksum2, 2);

  replyId = (replyId + 1) % Constants.USHRT_MAX;
  buf.writeUInt16LE(replyId, 6);

  return buf;
};

export const createTCPHeader = (
  command: number,
  sessionId: number,
  replyId: number,
  data: any,
): Buffer => {
  const buf = createUDPHeader(command, sessionId, replyId, data);

  const prefixBuf = Buffer.from([
    0x50, 0x50, 0x82, 0x7d, 0x13, 0x00, 0x00, 0x00,
  ]);
  prefixBuf.writeUInt16LE(buf.length, 4);

  return Buffer.concat([prefixBuf, buf]);
};

export const removeTcpHeader = (buf: Buffer): Buffer => {
  if (buf.length < 8) {
    return buf;
  }

  if (buf.compare(Buffer.from([0x50, 0x50, 0x82, 0x7d]), 0, 4, 0, 4) !== 0) {
    return buf;
  }

  return buf.slice(8);
};

export const parseTimeToDate = (time: number): Date => {
  const second = time % 60;
  time = (time - second) / 60;
  const minute = time % 60;
  time = (time - minute) / 60;
  const hour = time % 24;
  time = (time - hour) / 24;
  const day = (time % 31) + 1;
  time = (time - (day - 1)) / 31;
  const month = time % 12;
  time = (time - month) / 12;
  const year = time + 2000;

  return new Date(Date.UTC(year, month, day, hour, minute, second));
};

export const decodeUserData28 = (userData: Buffer): UserData28 => {
  return {
    uid: userData.readUIntLE(0, 2),
    privilege: userData.readUIntLE(2, 1),
    name:
      userData
        .slice(8, 8 + 8)
        .toString("ascii")
        .split("\0")
        .shift() || "",
    user_id: userData.readUIntLE(24, 4).toString(),
  };
};

export const decodeUserData72 = (userData: Buffer): User => {
  return new User(
    userData.readUIntLE(0, 2),
    userData.slice(11).toString("ascii").split("\0").shift() || "",
    userData.readUIntLE(2, 1),
    userData
      .subarray(3, 3 + 8)
      .toString("ascii")
      .split("\0")
      .shift() || "",
    userData.readUIntLE(39, 1),
    userData
      .slice(48, 48 + 9)
      .toString("ascii")
      .split("\0")
      .shift() || "",
    userData.readUIntLE(35, 4),
  );
};

export const decodeRecordData40 = (recordData: Buffer): Attendance => {
  return new Attendance(
    recordData.readUIntLE(0, 2),
    recordData
      .slice(2, 2 + 9)
      .toString("ascii")
      .split("\0")
      .shift() || "",
    recordData.readUIntLE(26, 1),
    parseTimeToDate(recordData.readUInt32LE(27)),
    recordData.readUIntLE(31, 1),
  );
};

export const decodeRecordData16 = (recordData: Buffer): RecordData16 => {
  return {
    user_id: recordData.readUIntLE(0, 2).toString(),
    record_time: parseTimeToDate(recordData.readUInt32LE(4)),
  };
};

export const decodeRecordRealTimeLog18 = (recordData: Buffer): RecordData16 => {
  const user_id = recordData.readUIntLE(8, 1).toString();
  const record_time = parseHexToTime(recordData.subarray(12, 18));
  return { user_id, record_time };
};

export const decodeUDPHeader = (header: Buffer): UDPHeader => {
  return {
    commandId: header.readUIntLE(0, 2),
    checkSum: header.readUIntLE(2, 2),
    sessionId: header.readUIntLE(4, 2),
    replyId: header.readUIntLE(6, 2),
  };
};

export const decodeTCPHeader = (header: Buffer): TCPHeader => {
  const recvData = header.subarray(8);
  const payloadSize = header.readUIntLE(4, 2);

  return {
    commandId: recvData.readUIntLE(0, 2),
    checkSum: recvData.readUIntLE(2, 2),
    sessionId: recvData.readUIntLE(4, 2),
    replyId: recvData.readUIntLE(6, 2),
    payloadSize,
  };
};

export const exportErrorMessage = (commandValue: number): string => {
  const keys = Object.keys(COMMANDS);
  for (const key of keys) {
    if (COMMANDS[key as keyof typeof COMMANDS] === commandValue) {
      return key.toString();
    }
  }

  return "AN UNKNOWN ERROR";
};
const isRTEvent = (event: number) => Object.values(RTEvent).includes(event);
export const checkNotEventTCP = (data: Buffer): boolean => {
  try {
    const cleanedData = removeTcpHeader(data);
    const commandId = cleanedData.readUIntLE(0, 2);
    const event = cleanedData.readUIntLE(4, 2);
    return isRTEvent(event) && commandId === COMMANDS.CMD_REG_EVENT;
  } catch (err) {
    log(`[228] : ${(err as Error).toString()} ,${data.toString("hex")} `);
    return false;
  }
};

export const checkNotEventUDP = (data: Buffer): boolean => {
  const { commandId } = decodeUDPHeader(data.subarray(0, 8));
  return commandId === COMMANDS.CMD_REG_EVENT;
};

export const decodeRTEvent = (data: Buffer) => {
  const header = decodeTCPHeader(data);
  console.log(header);
  const event = header.sessionId as RTEvent;
  const recvData = data.subarray(16);
  const build = {
    alarm4bytes: function (data: Buffer): AlarmEvent {
      return {
        alarm_type: data.readUintLE(0, 4),
        alarm_cause: data.readUintLE(4, 2),
        user_uid: data.readUintLE(6, 2),
        match_type: data.readUintLE(8, 4),
      };
    },
    enrolledFinger: function (data: Buffer): EnrolledFingerEvent {
      return {
        result: data.readUIntLE(0, 2),
        size: data.readUintLE(2, 2),
        pin: data.subarray(4, 4 + 9).toString("ascii"),
        fid: data.readUIntLE(1, 13),
      };
    },
    fingerScore: function (data: Buffer): FingerScoreEvent {
      return { score: data.readUintLE(0, 1) };
    },
  };
  switch (event) {
    case RTEvent.EF_FINGER:
      return { event };
    case RTEvent.EF_FPFTR:
      return { event, payload: build.fingerScore(recvData) };
    default:
      console.log("utils linea 284");
      break;
  }
};

export const decodeRecordRealTimeLog52 = (recordData: Buffer): RecordData16 => {
  const payload = removeTcpHeader(recordData);
  const recvData = payload.subarray(8);

  const user_id =
    recvData.slice(0, 9).toString("ascii").split("\0").shift() || "";

  const record_time = parseHexToTime(recvData.subarray(26, 26 + 6));

  return { user_id, record_time };
};

const makeKey = (key: number, sessionId: number): number => {
  let k = 0;

  for (let i = 0; i < 32; i++) {
    if ((key & (1 << i)) !== 0) {
      k = (k << 1) | 1;
    } else {
      k = k << 1;
    }
  }

  k += sessionId;

  let hex = k.toString(16).padStart(8, "0");
  const response = new Uint8Array(4);
  let index = 3;

  while (hex.length > 0) {
    response[index] = parseInt(hex.substring(0, 2), 16);
    index--;
    hex = hex.substring(2);
  }

  response[0] ^= "Z".charCodeAt(0);
  response[1] ^= "K".charCodeAt(0);
  response[2] ^= "S".charCodeAt(0);
  response[3] ^= "O".charCodeAt(0);

  let finalKey =
    response[0] +
    (response[1] << 8) +
    (response[2] << 16) +
    (response[3] << 24);

  const swp = finalKey >>> 16;
  finalKey = (finalKey << 16) | swp;

  return finalKey >>> 0;
};

export const authKey = (comKey: number, sessionId: number): number[] => {
  const k = makeKey(comKey, sessionId) >>> 0;
  const rand = Math.floor(Math.random() * 256);

  let hex = k.toString(16).padStart(8, "0");
  const response = new Uint8Array(4);
  let index = 3;

  while (index >= 0) {
    response[index] = parseInt(hex.substring(0, 2), 16);
    index--;
    hex = hex.substring(2);
  }

  response[0] ^= rand;
  response[1] ^= rand;
  response[2] = rand;
  response[3] ^= rand;

  return Array.from(response);
};

/** Some Tcp packets receibed by the socket client can be merged in one single data event by the OS, and we need to split to handle correctly */
export const splitTcpPackets = (data: Buffer) => {
  const packets: Buffer[] = [];
  let unProcessed = data;
  while (unProcessed.length > 0) {
    const headers = decodeTCPHeader(unProcessed);
    packets.push(unProcessed.subarray(0, headers.payloadSize + 8));
    unProcessed = unProcessed.subarray(headers.payloadSize + 8);
  }
  return packets;
};

