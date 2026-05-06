[![NPM](https://nodei.co/npm/zklib-ts.png?downloads=true&stars=true)](https://www.npmjs.com/package/is-electron)
<h1 align="center">zklib ts</h1>
<p align="center">An unofficial library that provides a robust solution for Node.js developers to interface with ZKTeco Devices.</p>
<p align="center">
    <img src="https://img.shields.io/badge/node-latest-green?style=flat-square"/>
    <img src="https://img.shields.io/badge/TypeScript-latest-blue?style=flat-square"/>
    <img src="https://img.shields.io/badge/Jest-latest-red?style=flat-square"/>
    <img src="https://img.shields.io/badge/npm-red?style=flat-square"/>
</p>

> [!WARNING]
> This repository is currently in development and may contain bugs or incomplete features. Use at your own risk and do not deploy to a production environment

## 📋 **Index**
1. [Installation](#-installation)
2. [⚙️ Usage](#-usage)
3. [🛠️ Testing](#-testing)
4. [🗄️ Alternatives](#-alternatives)
5. [📄 Documentation](#-documentation)


## **Installation**
You must have Node.js ^18 before run the command down below:
```js
npm i zklib-ts
```

## ⚙️ **Usage**

### Connection
Constructor receives `(ip, timeout, inport, port, comm_key)`. `createSocket` auto-selects TCP or UDP.
```js
import Zklib from 'zklib-ts'

const zk = new Zklib("10.0.0.10", 10000, 10000, 4370, 0)

await zk.createSocket()
await zk.disconnect()
```

### User Management
```js
const { data: users } = await zk.getUsers()

// create or update a user
await zk.setUser(
    "144",   // user id/pin
    "John",  // name
    "1234",  // password
    0,       // role (0 = normal user)
    0        // card number
)

await zk.deleteUser("144")
await zk.verifyUser("144")
```

### Attendance
```js
const { data: attendances } = await zk.getAttendances()

await zk.getAttendanceSize()  // total stored records count
await zk.clearAttendanceLog() // delete all attendance records from device
```

### Realtime Events
```js
import Zklib, { AttendanceState } from 'zklib-ts'

await zk.getRealTimeLogs((log) => {
    console.log(log.user_id)      // user id/pin
    console.log(log.record_time)  // Date
    console.log(log.state)        // AttendanceState enum value

    // AttendanceState values:
    // CHECK_IN  = 0
    // CHECK_OUT = 1
    // BREAK_OUT = 2
    // BREAK_IN  = 3
    // OT_IN     = 4
    // OT_OUT    = 5
})
```

### Fingerprint Templates
```js
const templates = await zk.getTemplates()

const data = await zk.getUserTemplate(
    "144", // user id/pin
    1      // finger index (0-9)
)

const uploaded = await zk.uploadFingerTemplate(
    "144",                      // user id/pin
    "this_is_a_very_long_string", // finger template in Base64 string
    1,                          // finger id/index (0-9)
    1                           // finger flag (1=valid, 3=duress)
)

// save user with fingerprint templates
await zk.saveUserTemplate("144", fingers) // (user_id, Finger[])

// start enroll procedure on device for a given finger index
await zk.enrollUser("144", 5) // user_id, fid (0-9)

// delete a single finger template
await zk.deleteFinger("144", 1) // user_id, fid (0-9)
```

### Device Info
```js
await zk.getInfo()          // { userCounts, logCounts, logCapacity }
await zk.getSizes()         // free space breakdown
await zk.getTime()          // Date
await zk.setTime(new Date())
await zk.getDeviceName()
await zk.getSerialNumber()
await zk.getFirmware()
await zk.getMacAddress()
await zk.getPlatform()
await zk.getOS()
await zk.getVendor()
await zk.getNetworkParams()
```

### Device Control
```js
await zk.disableDevice()   // pause device operations
await zk.enableDevice()    // resume device operations
await zk.restartDevice()
await zk.clearData()       // WARNING: deletes all data on device
```

## 🛠️ **Testing**

The repo uses Jest. There is a mock file for test without having a phisical device connected. Before start you will need to install dependencies.
```js
npm i
```
for testing your phisical device first create .env file in root directory with the values down below:
```
DEVICE_IP=10.10.10.1
DEVICE_PORT=4370
DEVICE_PASSWORD=1234
```
and then run tests:
```
npm t
```

for testing especific file after "npm t" type some name that matches a test file ...
for example the next command will execute "Generic.test.ts"
```
npm t Generic
```

## 🗄️ **Alternatives**
#### Javascript
- [caobo171/node-zklib](https://github.com/caobo171/node-zklib)
- [conding-libs/zkteco-js](https://github.com/coding-libs/zkteco-js)
#### Python:
- [dnaextrim/python_zklib](https://github.com/dnaextrim/python_zklib)
- [fananimi/pyzk](https://github.com/fananimi/pyzk)
#### ☕ Java:
- [mkhoudary/ZKTeco4J](https://github.com/mkhoudary/ZKTeco4J)

## 📄 **Documentation**
- [adrobinoga/zk-protocol](https://github.com/adrobinoga/zk-protocol)


## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.

