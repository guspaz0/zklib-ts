import Zklib from "../src";

const DEVICE_IP = process.env.DEVICE_IP as string;
const DEVICE_PORT = +process.env.DEVICE_PORT as number;
const TIMEOUT = 10000;
const INPORT = 4000;
const COMM_KEY = +process.env.DEVICE_PASSWORD as number;

jest.setTimeout(15000); // 15 seconds timeout for device operations

describe('Zkteco Device Integration Tests', () => {
    let zkInstance: Zklib;
    const testUsername = `Test_User`;
    const testUid = 200;

    beforeAll(async () => {
        zkInstance = new Zklib(DEVICE_IP, DEVICE_PORT, TIMEOUT, INPORT, COMM_KEY);
        await zkInstance.createSocket();
    });

    afterAll(async () => {
        if (zkInstance) {
            await zkInstance.disconnect();
        }
    });

    test('should get device information', async () => {
        const info = await zkInstance.getInfo();
        console.log("Device Info:", info);
        expect(info).toHaveProperty('userCounts');
        expect(info).toHaveProperty('logCounts');
        expect(info).toHaveProperty('logCapacity');
    });

    test('should get device vendor information', async () => {
        const vendor = await zkInstance.getVendor();
        console.log("Vendor:", vendor);
        expect(typeof vendor).toBe('string');
    });

    test('should get device time', async () => {
        const deviceTime = await zkInstance.getTime();
        console.log("Device Time:", deviceTime);
        expect(deviceTime).toBeInstanceOf(Date);
    });

    test('should set and verify device time', async () => {
        const currentTime = new Date();
        await zkInstance.setTime(currentTime);
        const deviceTime = await zkInstance.getTime();
        
        // Compare with 1 second tolerance
        expect(deviceTime.getTime()).toBeCloseTo(currentTime.getTime(), -1000);
    });

    test('should perform voice test', async () => {
        await expect(zkInstance.voiceTest()).resolves.not.toThrow();
    });

    describe('User Management', () => {
        test('should create, verify and delete a user', async () => {
            const usersResponse = await zkInstance.getUsers();
            let created: boolean;
            // if test user already exists, then skip create method
            created = usersResponse.data.some(user => user.user_id == testUid.toString())
            if (!created) {
                created = await zkInstance.setUser(testUid, testUid.toString(), testUsername, '123456');
            }
            
            // Verify user exists
            if (created) {
                //fetch users
                const usersUpdate = await zkInstance.getUsers();
                const createdUser = usersUpdate.data.find(user => user.user_id == testUid.toString());
                expect(createdUser).toBeDefined();
                expect(createdUser?.name).toBe(testUsername);
                // Delete user
                await zkInstance.deleteUser(testUid);
                // Verify user deleted
                const usersAfterDelete = await zkInstance.getUsers();
                expect(usersAfterDelete.data.some(user => user.user_id === testUid.toString())).toBe(false);
            }
        });
    });

    test('should get attendance logs', async () => {
        const attendances = await zkInstance.getAttendances();
        console.log(`Found ${attendances.data.length} attendance records`);
        expect(attendances.data).toBeInstanceOf(Array);
    });

    test('should get device serial number', async () => {
        const serialNo = await zkInstance.getSerialNumber();
        console.log("Serial Number:", serialNo);
        expect(typeof serialNo).toBe('string');
    });

    test('should get device MAC address', async () => {
        const macAddress = await zkInstance.getMacAddress();
        console.log("MAC Address:", macAddress);
        expect(typeof macAddress).toBe('string');
    });

    test('should get device firmware version', async () => {
        const firmware = await zkInstance.getFirmware();
        console.log("Firmware:", firmware);
        expect(typeof firmware).toBe('string');
    });
});