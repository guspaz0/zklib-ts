/**
 * SDK Parameters Enum
 * 
 * Generated from SDK parameter table with the following structure:
 * - Keys: Parameter names in uppercase without ~ prefix
 * - Values: Original parameter names
 * - JSDoc: Includes description, permissions, and notes
 */
export enum SdkParameter {
  
  /**
   * Device ID.
   * Permissions: RW
   * Notes: Value ranges from 1 to 254.
   */
  DEVICE_ID = 'DeviceID',
  
  /**
   * Language.
   * Permissions: RW
   * Notes: For english it is 97.
   */
  NEW_LNG = 'NewLng',
  
  /**
   * The machine will enter standby state or power off, after this time elapses.
   * Permissions: RW
   * Notes: Given in minutes.
   */
  IDLE_MINUTE = 'IdleMinute',
  
  /**
   * Lock control time.
   * Permissions: RW
   * Notes: Given in seconds.
   */
  LOCK_ON = 'LockOn',
  
  /**
   * Attendance record quantity alarm.
   * Permissions: RW
   * Notes: 
   */
  ALARM_ATT_LOG = 'AlarmAttLog',
  
  /**
   * Operation record quantity alarm.
   * Permissions: RW
   * Notes: 
   */
  ALARM_OP_LOG = 'AlarmOpLog',
  
  /**
   * Minimun time to record the same attendance state.
   * Permissions: RW
   * Notes: Units are unknown.
   */
  ALARM_RE_REC = 'AlarmReRec',
  
  /**
   * Baud rate for RS232/485.
   * Permissions: RW
   * Notes: Valid values are 1200, 2400, 4800, 9600, 19200, 38400 57600, 115200.
   */
  RS232_BAUD_RATE = 'RS232BaudRate',
  
  /**
   * Enable flag for network functions.
   * Permissions: RW
   * Notes: 
   */
  NETWORK_ON = 'NetworkOn',
  
  /**
   * Enable flag for RS232.
   * Permissions: RW
   * Notes: 
   */
  RS232_ON = 'RS232On',
  
  /**
   * Enable flag for RS485.
   * Permissions: RW
   * Notes: 
   */
  RS485_ON = 'RS485On',
  
  /**
   * Enable announcements(voice).
   * Permissions: RW
   * Notes: 
   */
  VOICE_ON = 'VoiceOn',
  
  /**
   * Perform high-speed comparison.
   * Permissions: RW
   * Notes: Value codification is unknown.
   */
  MSPEED = 'MSpeed',
  
  /**
   * Idle mode.
   * Permissions: RW
   * Notes: 87 indicates shutdown and 88 indicates hibernation.
   */
  IDLE_POWER = 'IdlePower',
  
  /**
   * Automatic shutdown time.
   * Permissions: RW
   * Notes: Value 255 indicates the machine to not shutdown automatically.
   */
  AUTO_POWER_OFF = 'AutoPowerOff',
  
  /**
   * Automatic startup time.
   * Permissions: RW
   * Notes: Value 255 indicates the machine to not startup automatically.
   */
  AUTO_POWER_ON = 'AutoPowerOn',
  
  /**
   * Automatic hibernation time.
   * Permissions: RW
   * Notes: Value 255 indicates the machine to not suspend automatically.
   */
  AUTO_POWER_SUSPEND = 'AutoPowerSuspend',
  
  /**
   * Alarm 1 time.
   * Permissions: RW
   * Notes: Value 65535 disables the alarm(t).
   */
  AUTO_ALARM1 = 'AutoAlarm1',
  
  /**
   * 1:N comparison threshold.
   * Permissions: RW
   * Notes: Integer.
   */
  MTHRESHOLD = 'MThreshold',
  
  /**
   * Registration threshold.
   * Permissions: RW
   * Notes: Integer.
   */
  ETHRESHOLD = 'EThreshold',
  
  /**
   * 1:1 comparison threshold.
   * Permissions: RW
   * Notes: Integer.
   */
  VTHRESHOLD = 'VThreshold',
  
  /**
   * Display matching score during verification.
   * Permissions: RW
   * Notes: Bool.
   */
  SHOW_SCORE = 'ShowScore',
  
  /**
   * Number of people that may unlock the door at the same time.
   * Permissions: RW
   * Notes: Integer.
   */
  UNLOCK_PERSON = 'UnlockPerson',
  
  /**
   * Verify only the card number.
   * Permissions: RW
   * Notes: Bool.
   */
  ONLY_PIN_CARD = 'OnlyPINCard',
  
  /**
   * Network speed.
   * Permissions: RW
   * Notes: Value correspondence: 1=100M-H, 4=10M-F, 5=100M-F, 8=Auto, others=10M-H.
   */
  HI_SPEED_NET = 'HiSpeedNet',
  
  /**
   * Accept only registered cards.
   * Permissions: RW
   * Notes: Bool.
   */
  MUST_ENROLL = 'MustEnroll',
  
  /**
   * Timeout to return to the initial state.
   * Permissions: RW
   * Notes: Given in seconds.
   */
  TO_STATE = 'TOState',
  
  /**
   * Timeout to return to the initial state if there are no inputs after entering PIN.
   * Permissions: RW
   * Notes: Given in seconds.
   */
  TO_STATE_PIN = 'TOState',
  
  /**
   * Timeout to return to the initial state if there are no inputs after entering menu.
   * Permissions: RW
   * Notes: Given in seconds.
   */
  TO_MENU = 'TOMenu',
  
  /**
   * Time format.
   * Permissions: NA
   * Notes: Value codification is unknown.
   */
  DT_FMT = 'DtFmt',
  
  /**
   * Flag for mandatory 1:1 comparison.
   * Permissions: RW
   * Notes: Bool.
   */
  MUST_1TO1 = 'Must1To1',
  
  /**
   * Alarm 2 time.
   * Permissions: RW
   * Notes: Value 65535 disables the alarm(t).
   */
  AUTO_ALARM2 = 'AutoAlarm2',
  
  /**
   * Alarm 3 time.
   * Permissions: RW
   * Notes: Value 65535 disables the alarm(t).
   */
  AUTO_ALARM3 = 'AutoAlarm3',
  
  /**
   * Alarm 4 time.
   * Permissions: RW
   * Notes: Value 65535 disables the alarm(t).
   */
  AUTO_ALARM4 = 'AutoAlarm4',
  
  /**
   * Alarm 5 time.
   * Permissions: RW
   * Notes: Value 65535 disables the alarm(t).
   */
  AUTO_ALARM5 = 'AutoAlarm5',
  
  /**
   * Alarm 6 time.
   * Permissions: RW
   * Notes: Value 65535 disables the alarm(t).
   */
  AUTO_ALARM6 = 'AutoAlarm6',
  
  /**
   * Automatic status changing times.
   * Permissions: ?
   * Notes: -1 value indicates that the status will not change automatically.
   */
  AS1 = 'AS1',
  
  /**
   * Automatic status changing times.
   * Permissions: ?
   * Notes: -1 value indicates that the status will not change automatically.
   */
  AS2 = 'AS2',
  
  /**
   * Automatic status changing times.
   * Permissions: ?
   * Notes: -1 value indicates that the status will not change automatically.
   */
  AS3 = 'AS3',
  
  /**
   * Automatic status changing times.
   * Permissions: ?
   * Notes: -1 value indicates that the status will not change automatically.
   */
  AS4 = 'AS4',
  
  /**
   * Automatic status changing times.
   * Permissions: ?
   * Notes: -1 value indicates that the status will not change automatically.
   */
  AS5 = 'AS5',
  
  /**
   * Automatic status changing times.
   * Permissions: ?
   * Notes: -1 value indicates that the status will not change automatically.
   */
  AS6 = 'AS6',
  
  /**
   * Automatic status changing times.
   * Permissions: ?
   * Notes: -1 value indicates that the status will not change automatically.
   */
  AS7 = 'AS7',
  
  /**
   * Automatic status changing times.
   * Permissions: ?
   * Notes: -1 value indicates that the status will not change automatically.
   */
  AS8 = 'AS8',
  
  /**
   * Automatic status changing times.
   * Permissions: ?
   * Notes: -1 value indicates that the status will not change automatically.
   */
  AS9 = 'AS9',
  
  /**
   * Automatic status changing times.
   * Permissions: ?
   * Notes: -1 value indicates that the status will not change automatically.
   */
  AS10 = 'AS10',
  
  /**
   * Automatic status changing times.
   * Permissions: ?
   * Notes: -1 value indicates that the status will not change automatically.
   */
  AS11 = 'AS11',
  
  /**
   * Automatic status changing times.
   * Permissions: ?
   * Notes: -1 value indicates that the status will not change automatically.
   */
  AS12 = 'AS12',
  
  /**
   * Automatic status changing times.
   * Permissions: ?
   * Notes: -1 value indicates that the status will not change automatically.
   */
  AS13 = 'AS13',
  
  /**
   * Automatic status changing times.
   * Permissions: ?
   * Notes: -1 value indicates that the status will not change automatically.
   */
  AS14 = 'AS14',
  
  /**
   * Automatic status changing times.
   * Permissions: ?
   * Notes: -1 value indicates that the status will not change automatically.
   */
  AS15 = 'AS15',
  
  /**
   * Automatic status changing times.
   * Permissions: ?
   * Notes: -1 value indicates that the status will not change automatically.
   */
  AS16 = 'AS16',
  
  /**
   * Wiegand failure ID.
   * Permissions: ?
   * Notes: 
   */
  WG_FAILED_ID = 'WGFailedID',
  
  /**
   * Wiegand duress ID.
   * Permissions: ?
   * Notes: 
   */
  WG_DURESS_ID = 'WGDuressID',
  
  /**
   * Wiegand zone bit.
   * Permissions: ?
   * Notes: 
   */
  WG_SITE_CODE = 'WGSiteCode',
  
  /**
   * Pulse width of Wiegand outputs.
   * Permissions: ?
   * Notes: 
   */
  WG_PULSE_WIDTH = 'WGPulseWidth',
  
  /**
   * Pulse interval for Wiegand outputs.
   * Permissions: ?
   * Notes: 
   */
  WG_PULSE_INTERVAL = 'WGPulseInterval',
  
  /**
   * ID of the start sector on the Mifare card where fingerprints are stored.
   * Permissions: ?
   * Notes: 
   */
  RF_START = 'RFSStart',
  
  /**
   * Total number of sectors on the Mifare card where fingerprints are stored.
   * Permissions: ?
   * Notes: 
   */
  RF_LEN = 'RFSLen',
  
  /**
   * Number of fingerprints stored on the Mifare card.
   * Permissions: ?
   * Notes: 
   */
  RF_FPC = 'RFFPC',
  
  /**
   * Forbidden.
   * Permissions: NA
   * Notes: 
   */
  FORBIDDEN = 'Forbidden',
  
  /**
   * Wheter to display the attendance status.
   * Permissions: RW
   * Notes: 
   */
  SHOW_STATE = '~ShowState',

  /**
   * TCP Port.
   * Permissions: ?
   * Notes: 
   */
  TCP_PORT = 'TCPPort',
  
  /**
   * UDP Port.
   * Permissions: ?
   * Notes: 
   */
  UDP_PORT = 'UDPPort',
  
  /**
   * Fingerprint algorithm version.
   * Permissions: R
   * Notes: 
   */
  ZK_FP_VERSION = '~ZKFPVersion',
  
  /**
   * Face algorithm version.
   * Permissions: R
   * Notes: 
   */
  ZK_FACE_VERSION = '~ZKFaceVersion',
  
  /**
   * Finger vein version.
   * Permissions: R
   * Notes: 
   */
  ZK_FV_VERSION = '~ZKFVVersion',
  
  /**
   * Face function.
   * Permissions: R
   * Notes: 
   */
  FACE_FUN_ON = '~FaceFunOn',
  
  /**
   * User id max length.
   * Permissions: R
   * Notes: 
   */
  PIN2_WIDTH = '~PIN2Width',
  
  /**
   * Does the user id support chars.
   * Permissions: R
   * Notes: 
   */
  IS_SUPPORT_ABC_PIN = 'IsSupportABCPin',
  
  /**
   * ?
   * Permissions: ?
   * Notes: 
   */
  IME_FUN_ON = 'IMEFunOn',
  
  /**
   * ?
   * Permissions: ?
   * Notes: 
   */
  IS_SUPPORT_ALARM_EXT = 'IsSupportAlarmExt',
  
  /**
   * ?
   * Permissions: ?
   * Notes: 
   */
  DCTZ = '~DCTZ',
  
  /**
   * ?
   * Permissions: ?
   * Notes: 
   */
  DOTZ = '~DOTZ',

    /**
   * -
   * Permissions: ?
   * Notes:
   */
  EXTEND_OP_LOG = 'ExtendOPLog',

  /**
   * Bool
   * Permissions: RW
   * Notes:
   */
  WORK_CODE = 'WorkCode',

  /**
   * Integer
   * Permissions: RW
   * Notes:
   */
  LANGUAGE = 'Language',

  /**
   * -
   * Permissions: ?
   * Notes:
   */
  BIOMETRIC_TYPE = 'BiometricType',

  /**
   * Bool
   * Permissions: RW
   * Notes:
   */
  FINGER_FUN_ON = 'FingerFunOn',

  /**
   * Bool
   * Permissions: ?
   * Notes:
   */
  IS_ONLY_RF_MACHINE = '~IsOnlyRFMachine',

  /**
   * Vendor name
   * Permissions: ?
   * Notes:
   */
  OEM_VENDOR = '~OEMVendor',

  /**
   * Device name
   * Permissions: ?
   * Notes:
   */
  DEVICE_NAME = '~DeviceName',

  /**
   * MAC address
   * Permissions: ?
   * Notes:
   */
  MAC = 'MAC',

  /**
   * Serial number
   * Permissions: ?
   * Notes:
   */
  SERIAL_NUMBER = '~SerialNumber',

  /**
   * Date string
   * Permissions: ?
   * Notes:
   */
  PRODUCT_TIME = '~ProductTime',

  /**
   * Bool
   * Permissions: ?
   * Notes:
   */
  IS_ABC_PIN_ENABLE = '~IsABCPinEnable',

  /**
   * Bool
   * Permissions: ?
   * Notes:
   */
  T9_FUN_ON = '~T9FunOn',

  /**
   * Date Time
   * Permissions: RW
   */
  DATETIME = 'DateTime',
  
  /**
   * 
   */
  OS = '~OS'
}