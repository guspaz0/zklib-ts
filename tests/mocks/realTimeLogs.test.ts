import Zklib, { AttendanceState, RealTimeLog } from '../../src';
import { Socket } from 'net';

const makeRealTimeLogs = (cb: (log: RealTimeLog) => void) => {
    cb({
        user_id: '144',
        record_time: new Date('2024-01-01T08:00:00'),
        state: AttendanceState.CHECK_IN,
    });
    return Promise.resolve();
};

jest.mock('../../src/ztcp', () => ({
    ZTCP: jest.fn().mockImplementation(() => ({
        socket: Socket,
        createSocket: jest.fn().mockResolvedValue(true),
        connect: jest.fn().mockResolvedValue(true),
        disconnect: jest.fn().mockResolvedValue(true),
        getRealTimeLogs: jest.fn().mockImplementation(makeRealTimeLogs),
    })),
}));

jest.mock('../../src/zudp', () => ({
    ZUDP: jest.fn().mockImplementation(() => ({
        socket: Socket,
        createSocket: jest.fn().mockResolvedValue(true),
        connect: jest.fn().mockResolvedValue(true),
        disconnect: jest.fn().mockResolvedValue(true),
        getRealTimeLogs: jest.fn().mockImplementation(makeRealTimeLogs),
    })),
}));

describe('getRealTimeLogs', () => {
    describe('TCP', () => {
        let device: Zklib;

        beforeAll(async () => {
            device = new Zklib('192.168.1.1', 5000, 5000, 4370, 0);
            await device.createSocket();
        });

        afterAll(async () => {
            await device.disconnect();
        });

        test('calls callback with user_id, record_time, and state', async () => {
            const received: RealTimeLog[] = [];
            await device.getRealTimeLogs((log) => received.push(log));

            expect(received).toHaveLength(1);
            expect(received[0].user_id).toBe('144');
            expect(received[0].record_time).toEqual(new Date('2024-01-01T08:00:00'));
            expect(received[0].state).toBe(AttendanceState.CHECK_IN);
        });

        test('AttendanceState enum values are correct', () => {
            expect(AttendanceState.CHECK_IN).toBe(0);
            expect(AttendanceState.CHECK_OUT).toBe(1);
            expect(AttendanceState.BREAK_OUT).toBe(2);
            expect(AttendanceState.BREAK_IN).toBe(3);
            expect(AttendanceState.OT_IN).toBe(4);
            expect(AttendanceState.OT_OUT).toBe(5);
        });

        test('state can be used in a switch statement', async () => {
            let label = '';
            await device.getRealTimeLogs((log) => {
                switch (log.state) {
                    case AttendanceState.CHECK_IN:  label = 'Check-In';  break;
                    case AttendanceState.CHECK_OUT: label = 'Check-Out'; break;
                    case AttendanceState.BREAK_OUT: label = 'Break-Out'; break;
                    case AttendanceState.BREAK_IN:  label = 'Break-In';  break;
                    case AttendanceState.OT_IN:     label = 'OT-In';     break;
                    case AttendanceState.OT_OUT:    label = 'OT-Out';    break;
                }
            });
            expect(label).toBe('Check-In');
        });
    });

    describe('UDP', () => {
        let tcpDevice: Zklib;
        let udpDevice: Zklib;

        beforeAll(async () => {
            // Force UDP path by making TCP connect throw, then UDP succeed
            const { ZTCP } = jest.requireMock('../../src/ztcp');
            const { ZUDP } = jest.requireMock('../../src/zudp');

            ZTCP.mockImplementationOnce(() => ({
                socket: null,
                createSocket: jest.fn().mockRejectedValue({ code: 'ECONNREFUSED' }),
                connect: jest.fn().mockRejectedValue({ code: 'ECONNREFUSED' }),
                disconnect: jest.fn().mockResolvedValue(true),
                getRealTimeLogs: jest.fn(),
            }));

            ZUDP.mockImplementationOnce(() => ({
                socket: Socket,
                createSocket: jest.fn().mockResolvedValue(true),
                connect: jest.fn().mockResolvedValue(true),
                disconnect: jest.fn().mockResolvedValue(true),
                getRealTimeLogs: jest.fn().mockImplementation(makeRealTimeLogs),
            }));

            udpDevice = new Zklib('192.168.1.2', 5000, 5000, 4370, 0);
            await udpDevice.createSocket().catch(() => {});
            // Manually force UDP connection type for the mock scenario
            (udpDevice as any)._connectionType = 'udp';
            (udpDevice as any).zudp.socket = Socket;
        });

        afterAll(async () => {
            await udpDevice.disconnect().catch(() => {});
        });

        test('calls callback with user_id, record_time, and state over UDP', async () => {
            const received: RealTimeLog[] = [];
            await udpDevice.getRealTimeLogs((log) => received.push(log));

            expect(received).toHaveLength(1);
            expect(received[0].user_id).toBe('144');
            expect(received[0].state).toBe(AttendanceState.CHECK_IN);
        });
    });
});
