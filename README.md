<h1 align="center">zklib ts</h1>
<p align="center">An unofficial library that provides a robust solution for Node.js developers to interface with ZKTeco Devices.</p>
<p align="center">
    <img src="https://img.shields.io/badge/node-latest-green?style=flat-square"/>
    <img src="https://img.shields.io/badge/TypeScript-latest-blue?style=flat-square"/>
    <img src="https://img.shields.io/badge/Jest-latest-red?style=flat-square"/>
    <img src="https://img.shields.io/badge/npm-red?style=flat-square"/>
</p>
<p align="center">
    <b style="color:red;">Disclaimer</b>
    <b>⚠️ This repository is not recommended for use in production. ⚠️</b>
    This repository is currently in development and may contain bugs or incomplete features. Use at your own risk and do not deploy to a production environment
</p>

## 📋 **Index**
1. [Installation](#-installation)
1. [⚙️ Usage](#-usage)
2. [🛠️ Testing](#-testing)
3. [🗄️Alternatives](#-alternatives)
4. [📄 Documentation](#-documentation)


## **Installaction**
You must have Node.js 18 > before run the command down below:
```js
npm i zklib-ts
```

## 🛠️ **Usage**
create a connection. <b>constructor</b> receives `(ip, timeout, inport, port, comm_key) `
```js
import Zklib from 'zklib-ts'

const zkInstance = new Zklib("10.0.0.10",10000,10000,4370,0)

await zkInstance.createSocket()

```
Get <b>all</b> users:
```js

const users = await zkInstance.getUsers()

```
Get <b>all</b> attendances:
```js

const attendances = await zkInstance.getAttendances()

```
get All templates
```js
const templates = await zkInstance.getTemplates() 
```

save user templates. receives a `User` instance class and an array of `Finger` class. currently only save one template per call.
```js
const templates = await zkInstance.saveUserTemplate(user, templates) 
```


enrollUser: receives a user `user_id` and finger ID `fid` where `0 <= fid <= 9`
```js
await zkInstance.enrollUser(50,5)
```
delete template. receives user id `uid` and finger id where `0 <= fid <= 9`
```js
await zkInstance.deleteTemplate(50,5)
```
<b>Check the Testing section for more functionalities coverage.</b>

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
