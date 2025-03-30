import ZktecoJs from '../../src';
import {Socket} from "net";

jest.mock("../../src/ztcp", () => ({
    ZTCP: jest.fn().mockImplementation(() => ({
        socket: Socket,
        createSocket: jest.fn().mockResolvedValue(true),
        connect: jest.fn().mockResolvedValue(true),
        getUsers: jest.fn().mockResolvedValue({ data: [{ uid: 1, name: "Test User" }] }),
        disconnect: jest.fn().mockResolvedValue(true),
        executeCmd: jest.fn().mockResolvedValue(Buffer.from("Mocked Response"))
    }))
}));

jest.mock("../../src/zudp", () => ({
    ZUDP: jest.fn().mockImplementation(() => ({
        socket: Socket,
        createSocket: jest.fn().mockResolvedValue(true),
        connect: jest.fn().mockResolvedValue(true),
        getUsers: jest.fn().mockResolvedValue({ data: [{ uid: 2, name: "UDP User" }] }),
        disconnect: jest.fn().mockResolvedValue(true),
        executeCmd: jest.fn().mockResolvedValue(Buffer.from("Mocked Response"))
    }))
}));

describe("ZktecoJs", () => {
    let device: ZktecoJs;
    beforeAll(async () => {
        device = new ZktecoJs("192.168.1.1", 4370, 5000);
        const result = await device.createSocket();
        expect(result).toBe(true);
    });

    afterAll(async () => {
            console.log("before disconnect: ",device.connectionType)
            const disconnected = await device.disconnect();
            console.log("afeter disconnect: ",device.connectionType)
            expect(disconnected).toBe(true);
    })

    test("should retrieve users", async () => {
        const users = await device.getUsers();
        expect(users.data).toHaveLength(1);
        expect(users.data[0]).toEqual({ uid: 1, name: "Test User" });
    });

    test("should execute command", async () => {
        const response = await device.executeCmd(100, "test data");
        expect(response).toBeInstanceOf(Buffer);
        expect(response.toString()).toBe("Mocked Response");
    });
});
