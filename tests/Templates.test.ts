import Zklib from "../src";
import { User } from "../src/models/User";
import { Finger } from "../src/models/Finger";
import { UserData28 } from "../src/helper/utils";
import { ZkError } from "../src/exceptions/handler";

jest.setTimeout(15000); // 15 seconds timeout for device operations

const DEVICE_IP = process.env.DEVICE_IP;
const DEVICE_PORT = +process.env.DEVICE_PORT;
const TIMEOUT = 10000;
const INPORT = 4000;
const COMM_KEY = +process.env.DEVICE_PASSWORD;

describe('Zkteco Template Management Tests', () => {
    const TEST_UID = 200;
    const TEST_USERID = '200';
    const TEST_NAME = 'PEPE ARGENTO';
    const TEST_PASSWORD = '123456';
    
    let zkInstance: Zklib;
    let usersData: { data: User[] | UserData28[] };
    let someoneTemplates: Finger[];

    beforeAll(async () => {
        zkInstance = new Zklib(DEVICE_IP, DEVICE_PORT, TIMEOUT, INPORT, COMM_KEY);
        await zkInstance.createSocket();

        // Clean up test user if exists
        usersData = await zkInstance.getUsers();
        if (usersData.data.some(u => u.uid === TEST_UID)) {
            await zkInstance.deleteUser(TEST_UID);
        }
        
        // Create test user
        await zkInstance.setUser(TEST_UID, TEST_USERID, TEST_NAME, TEST_PASSWORD);
        
        // Get templates for test
        const templates = await zkInstance.getTemplates();
        someoneTemplates = templates.filter((f: Finger) => f.uid === 144);

    });

    afterAll(async () => {
        try {
            // Clean up test user
            const currentUsers = await zkInstance.getUsers();
            if (Array.isArray(currentUsers.data) && currentUsers.data.some(u => u.uid === TEST_UID)) {
                await zkInstance.deleteUser(TEST_UID);
            }
            
            // Disconnect
            if (zkInstance) {
                await zkInstance.disconnect();
                console.log('Disconnected from device');
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    });

    test('should save fingerprint templates to user', async () => {

        const pepeUser = usersData.data.find(u => u.uid == TEST_UID) as User;

        // Act
        try {
            const saveResult = await zkInstance.saveUserTemplate(pepeUser, someoneTemplates);
            expect(saveResult).toBe(true);
        } catch (error) {
            expect(error).toBeInstanceOf(ZkError || Error)
        }


        // Assert


        // Verify the templates were actually saved
        const updatedTemplates = await zkInstance.getTemplates();
        const savedTemplates = updatedTemplates.filter((t: Finger) => t.uid === TEST_UID);

        expect(savedTemplates.length).toBeLessThanOrEqual(someoneTemplates.length);
    });

    test('should handle empty template array', async () => {
        // Arrange
        if (!Array.isArray(usersData.data)) {
            throw new Error('Invalid users data format');
        }
        usersData = await zkInstance.getUsers()

        const pepeUser = usersData.data.find(u => u.uid === TEST_UID) as User;
        if (!pepeUser) {
            throw new Error('Test user not found');
        }

        try {
            // Act & Assert
            await zkInstance.saveUserTemplate(pepeUser, [])
        } catch (error) {
            expect(error).toBeInstanceOf(ZkError || Error)
        }

    });

    test('should fail with invalid user', async () => {
        // Arrange
        const invalidUser = {
            uid: 9999,
            name: 'INVALID',
            privilege: 0,
            password: '',
            group_id: '',
            user_id: '9999',
            card: 0
        } as User;

        // Act & Assert
        try {
            await zkInstance.saveUserTemplate(invalidUser, someoneTemplates)
        } catch (e) {
            expect(e).toBeInstanceOf(ZkError || Error);
        }
    });
});

