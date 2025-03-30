jest.mock("../../src", () => {
    return jest.fn()
    .mockImplementation(() => ({
            createSocket: jest.fn().mockResolvedValue(true),
            deleteFinger: jest.fn()
                .mockImplementationOnce((uid, fid) => true) // Success case
                .mockImplementationOnce((uid, fid) => { throw new Error('Fingerprint not found') }), // Error case
            disconnect: jest.fn().mockResolvedValue(true)
        })
    );
});