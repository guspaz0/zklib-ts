import Zkteco from "../src";
import { ZkError } from "../src/exceptions/handler";

const DEVICE_IP = process.env.DEVICE_IP;
const DEVICE_PORT = +process.env.DEVICE_PORT;
const TIMEOUT = 10000;
const INPORT = 4000;
const COMM_KEY = +process.env.DEVICE_PASSWORD;

describe('Zkteco Enrollment Tests', () => {
    const TEST_UID = 200;
    const TEST_FID = 9;
    const TEST_USERID = '200';

    let zkInstance: Zkteco;

    beforeAll(async () => {
        zkInstance = new Zkteco(DEVICE_IP, DEVICE_PORT, TIMEOUT, INPORT, COMM_KEY);
        await zkInstance.createSocket();
        // Clean up test user if exists
        try {
            const users = await zkInstance.getUsers();
            if (users.data.some(u => u.uid === TEST_UID)) {
                await zkInstance.deleteUser(TEST_UID);
            }
        } catch (error) {
            console.warn('Cleanup warning:', error);
        }

        // Create test user
        await zkInstance.setUser(TEST_UID, TEST_USERID, 'TEST_USER', '123456');
    });

    afterAll(async () => {
        if (zkInstance) {
            try {
                await zkInstance.disconnect();
                console.log('Successfully disconnected from device');
            } catch (error) {
                console.error('Error disconnecting:', error);
            }
        }
    });

    test('should enroll a user fingerprint', async () => {

        // Test enrollment
        try {
            const result = await zkInstance.enrollUser(TEST_UID, TEST_FID, TEST_USERID);
            expect(result).toBe(true);
        } catch (error) {
            expect(error).toBeInstanceOf(ZkError || Error)
        } finally {
            // Verify the fingerprint was enrolled
            const templates = await zkInstance.getTemplates();
            const userTemplates = templates.filter((t: any) => 
                t.uid === TEST_UID && t.fid === TEST_FID
            );
            expect(userTemplates.length).toBe(1);
        }
    });

    test('should fail enrollment for invalid user', async () => {
        await expect(zkInstance.enrollUser(9999, TEST_FID, 'INVALID'))
            .rejects
            .toThrow();
    });

    test('should fail enrollment for invalid finger ID', async () => {
        await expect(zkInstance.enrollUser(TEST_UID, 10, TEST_USERID))
            .rejects
            .toThrow();
    });
});

jest.setTimeout(15000);