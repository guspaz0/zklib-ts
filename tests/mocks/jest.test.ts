import ZktecoJs from "../../src/index";

jest.mock("../../src/index");

it("should mock class ZktecoJs", () => {
    const getTimeMock = jest.fn();
    jest.spyOn(ZktecoJs.prototype, "getTime").mockImplementation(getTimeMock);
});