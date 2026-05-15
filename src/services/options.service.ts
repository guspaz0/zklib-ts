import { COMMANDS } from "../helper/command";
import { ZTCP } from "../ztcp";
import timeParser from "../helper/time";
import { SdkParameter as Sdk } from "../helper/terminal";

export class OptionsService {
  _zkTcp: ZTCP;
  constructor(zkTcp: ZTCP) {
    this._zkTcp = zkTcp;
  }

  /** Ask if the device doesn't support alphanumeric symbols for user id values. */
  async isAbcPinEnable() {
    const keyword = "~IsABCPinEnable";

    try {
      // Execute the command to get the PIN information
      const data = await this._zkTcp.executeCmd(
        COMMANDS.CMD_OPTIONS_RRQ,
        keyword,
      );
      // Extract and format the PIN information from the response data
      return data
        .slice(8) // Skip the first 8 bytes (header)
        .toString("ascii") // Convert buffer to ASCII string
        .replace(`${keyword}=`, "") // Remove the keyword prefix
        .replace(/\u0000/g, ""); // Remove null characters 0x00
    } catch (err) {
      // Log the error for debugging
      console.error("Error getting PIN:", err);
      // Re-throw the error to be handled by the caller
      throw err;
    }
  }

  /** Ask if the device doesn't support alphanumeric symbols for user id values. */
  async isT9FunOn() {
    const keyword = "~T9FunOn";

    try {
      // Execute the command to get the PIN information
      const data = await this._zkTcp.executeCmd(
        COMMANDS.CMD_OPTIONS_RRQ,
        keyword,
      );

      // Extract and format the PIN information from the response data
      return data
        .slice(8) // Skip the first 8 bytes (header)
        .toString("ascii") // Convert buffer to ASCII string
        .replace(`${keyword}=`, "") // Remove the keyword prefix
        .replace(/\u0000/g, ""); // Remove null characters 0x00
    } catch (err) {
      // Log the error for debugging
      console.error("Error getting PIN:", err);
      // Re-throw the error to be handled by the caller
      throw err;
    }
  }

  async getDeviceId() {
    const keyword = Sdk.DEVICE_ID;
    try {
      let result;
      let retry = true;
      while (retry) {
        // Execute the command to get the device name
        const data = await this._zkTcp.executeCmd(
          COMMANDS.CMD_OPTIONS_RRQ,
          keyword,
        );
        // Extract and format the device name from the response data
        result = data
          .slice(8) // Skip the first 8 bytes (header)
          .toString("ascii") // Convert buffer to ASCII string
          .replace(`${keyword}=`, "") // Remove the keyword prefix
          .replace(/\u0000/g, ""); // Remove null characters
        retry = result.includes("=");
      }
      return result;
    } catch (err: any) {
      // Log the error for debugging
      console.error("Error getting vendor:", err);
      // Re-throw the error for higher-level handling
      throw err;
    }
  }
  /**
   * Change Device ID
   * @param id a number between 1 and 254
   */
  async setDeviceId(id: number) {
    if (id < 1 || id > 254)
      throw new Error("Device ID must be a number between 1 and 254");
    const data = await this._zkTcp.executeCmd(
      COMMANDS.CMD_OPTIONS_WRQ,
      `DeviceID=${id}\x00`,
    );
    return data.readUInt16LE(0) === COMMANDS.CMD_ACK_OK;
  }
  async getVendor() {
    const keyword = "~OEMVendor";
    try {
      let result;
      let retry = true;
      while (retry) {
        // Execute the command to get the device name
        const data = await this._zkTcp.executeCmd(
          COMMANDS.CMD_OPTIONS_RRQ,
          keyword,
        );
        // Extract and format the device name from the response data
        result = data
          .slice(8) // Skip the first 8 bytes (header)
          .toString("ascii") // Convert buffer to ASCII string
          .replace(`${keyword}=`, "") // Remove the keyword prefix
          .replace(/\u0000/g, ""); // Remove null characters
        retry = result.includes("=");
      }
      return result;
    } catch (err) {
      // Log the error for debugging
      console.error("Error getting vendor:", err);
      // Re-throw the error for higher-level handling
      throw err;
    }
  }

  async getProductTime() {
    const keyword = "~ProductTime";

    try {
      // Execute the command to get serial number
      const data = await this._zkTcp.executeCmd(
        COMMANDS.CMD_OPTIONS_RRQ,
        keyword,
      );

      // Extract and format the serial number from the response data
      const ProductTime = data
        .slice(8) // Skip the first 8 bytes (header)
        .toString("ascii") // Convert buffer to string
        .replace(`${keyword}=`, "") // Remove the keyword prefix
        .replace(/\u0000/g, ""); // Remove null characters

      return new Date(ProductTime);
    } catch (err) {
      // Log the error for debugging
      console.error("Error getting Product Time:", err);
      // Re-throw the error for higher-level handling
      throw err;
    }
  }

  async getMacAddress() {
    const keyword = "MAC";

    try {
      // Execute the command to get serial number
      const data = await this._zkTcp.executeCmd(
        COMMANDS.CMD_OPTIONS_RRQ,
        keyword,
      );

      // Extract and format the serial number from the response data
      const macAddr = data
        .slice(8) // Skip the first 8 bytes (header)
        .toString("ascii") // Convert buffer to string
        .replace(`${keyword}=`, "") // Remove the keyword prefix
        .replace(/\u0000/g, ""); // Remove null characters

      return macAddr;
    } catch (err) {
      // Log the error for debugging
      console.error("Error getting MAC address:", err);
      // Re-throw the error for higher-level handling
      throw err;
    }
  }

  async getNetworkParams() {
    try {
      const params = {
        IPAddress: "",
        NetMask: "",
        GATEIPAddress: "",
        TCPPort: "",
      };
      const keywords = Object.keys(params);
      for await (const keyword of keywords) {
        const data = await this._zkTcp.executeCmd(
          COMMANDS.CMD_OPTIONS_RRQ,
          keyword,
        );
        params[keyword as keyof typeof params] = data
          .slice(8)
          .toString("utf-8")
          .replace(`${keyword}=`, "") // Remove the keyword prefix
          .replace(/\u0000/g, "")
          .replace("=", "."); // Replace equal simbol to dot, due to sometimes there are parsing errors
      }

      return params;
    } catch (err) {
      console.error("Error getting Network Params: ", err);
      throw err;
    }
  }

  async getSerialNumber() {
    const keyword = "~SerialNumber";
    let serialNumber = "";
    let count = 10;
    try {
      // Execute the command to get serial number
      /**
       * @dev implemented a counter and a while loop because sometimes serial number parses wrong for some reason
       * */
      while (serialNumber.length !== 13 && count > 0) {
        const data = await this._zkTcp.executeCmd(
          COMMANDS.CMD_OPTIONS_RRQ,
          keyword,
        );

        // Extract and format the serial number from the response data
        const SN = data
          .slice(8) // Skip the first 8 bytes (header)
          .toString("utf-8") // Convert buffer to string
          .replace(`${keyword}=`, "") // Remove the keyword prefix
          .replace("=", "") // Remove sometines last number is a character equal to = or unknow character
          .replace(/\u0000/g, ""); // Remove null characters
        count--;
        serialNumber = SN;
      }
      return serialNumber;
    } catch (err) {
      // Log the error for debugging
      console.error("Error getting serial number:", err);
      // Re-throw the error for higher-level handling
      throw err;
    }
  }

  /**
   * get Zkteko Template version
   * @returns number
   */
  async getDeviceVersion() {
    const keyword = "~ZKFPVersion";

    try {
      // Execute the command to get device version
      const data = await this._zkTcp.executeCmd(
        COMMANDS.CMD_OPTIONS_RRQ,
        keyword,
      );

      // Extract and format the device version from the response data
      // Remove null characters
      return data
        .slice(8) // Skip the first 8 bytes (header)
        .toString("ascii") // Convert buffer to ASCII string
        .replace(`${keyword}=`, "") // Remove the keyword prefix
        .replace(/\u0000/g, "");
    } catch (err) {
      // Log the error for debugging
      console.error("Error getting device version:", err);
      // Re-throw the error for higher-level handling
      throw err;
    }
  }
  /**
   * get Device/Model Name
   * @returns
   */
  async getDeviceName() {
    const keyword = "~DeviceName";
    try {
      let result;
      let retry = true;
      while (retry) {
        // Execute the command to get the device name
        const data = await this._zkTcp.executeCmd(
          COMMANDS.CMD_OPTIONS_RRQ,
          keyword,
        );
        // Extract and format the device name from the response data
        result = data
          .slice(8) // Skip the first 8 bytes (header)
          .toString("ascii") // Convert buffer to ASCII string
          .replace(`${keyword}=`, "") // Remove the keyword prefix
          .replace(/\u0000/g, ""); // Remove null characters
        retry = result.includes("=");
      }
      return result;
    } catch (err) {
      // Log the error for debugging
      console.error("Error getting device name:", err);
      // Re-throw the error for higher-level handling
      throw err;
    }
  }

  async getPlatform() {
    const keyword = "~Platform";

    try {
      let result;
      let retry = true;
      while (retry) {
        // Execute the command to get the device name
        const data = await this._zkTcp.executeCmd(
          COMMANDS.CMD_OPTIONS_RRQ,
          keyword,
        );
        // Extract and format the device name from the response data
        result = data
          .slice(8) // Skip the first 8 bytes (header)
          .toString("ascii") // Convert buffer to ASCII string
          .replace(`${keyword}=`, "") // Remove the keyword prefix
          .replace(/\u0000/g, ""); // Remove null characters
        retry = result.includes("=");
      }
      return result;
    } catch (err) {
      // Log the error for debugging
      console.error("Error getting platform information:", err);
      // Re-throw the error for higher-level handling
      throw err;
    }
  }

  async getOS() {
    const keyword = "~OS";
    const data = await this._zkTcp.executeCmd(
      COMMANDS.CMD_OPTIONS_RRQ,
      keyword,
    );
    return data
      .slice(8) // Skip the first 8 bytes (header)
      .toString("ascii") // Convert buffer to ASCII string
      .replace(`${keyword}=`, "") // Remove the keyword prefix
      .replace(/\u0000/g, "");
  }

  async getWorkCode() {
    const keyword = "WorkCode";
    const data = await this._zkTcp.executeCmd(
      COMMANDS.CMD_OPTIONS_RRQ,
      keyword,
    );

    // Extract and format the WorkCode information from the response data
    // Remove null characters
    return data
      .slice(8) // Skip the first 8 bytes (header)
      .toString("ascii") // Convert buffer to ASCII string
      .replace(`${keyword}=`, "") // Remove the keyword prefix
      .replace(/\u0000/g, "");
  }

  /**
   * get User ID max length
   * @returns
   */
  async getPIN() {
    const keyword = "~PIN2Width";
    const data = await this._zkTcp.executeCmd(
      COMMANDS.CMD_OPTIONS_RRQ,
      keyword,
    );
    return data
      .slice(8) // Skip the first 8 bytes (header)
      .toString("ascii") // Convert buffer to ASCII string
      .replace(`${keyword}=`, "") // Remove the keyword prefix
      .replace(/\u0000/g, "");
  }

  async getFaceOn() {
    const keyword = "FaceFunOn";
    const data = await this._zkTcp.executeCmd(
      COMMANDS.CMD_OPTIONS_RRQ,
      keyword,
    );
    const status = data
      .slice(8) // Skip the first 8 bytes (header)
      .toString("ascii") // Convert buffer to ASCII string
      .replace(`${keyword}=`, ""); // Remove the keyword prefix
    // Determine and return the face function status
    return status.includes("0") ? "No" : "Yes";
  }

  async getSSR() {
    const keyword = "~SSR";
    const data = await this._zkTcp.executeCmd(
      COMMANDS.CMD_OPTIONS_RRQ,
      keyword,
    );
    return data
      .slice(8) // Skip the first 8 bytes (header)
      .toString("ascii") // Convert buffer to ASCII string
      .replace(`${keyword}=`, "");
  }

  async getFirmware() {
    try {
      // Execute the command to get firmware information
      const data = await this._zkTcp.executeCmd(1100, "");

      // Extract and return the firmware version from the response data
      return data.slice(8).toString("ascii"); // Skip the first 8 bytes (header) and convert to ASCII string
    } catch (err) {
      // Log the error for debugging
      console.error("Error getting firmware version:", err);
      // Re-throw the error to be handled by the caller
      throw err;
    }
  }

  async getTime() {
    try {
      // Execute the command to get the current time
      const response = await this._zkTcp.executeCmd(COMMANDS.CMD_GET_TIME, "");

      // Check if the response is valid
      if (!response || response.length < 12) {
        throw new Error("Invalid response received for time command");
      }

      // Extract and decode the time value from the response
      const timeValue = response.readUInt32LE(8); // Read 4 bytes starting at offset 8
      const time = timeParser.decode(timeValue); // Parse and return the decoded time

      return time;
    } catch (err) {
      // Log the error for debugging
      console.error("Error getting time:", err);

      // Re-throw the error for the caller to handle
      throw err;
    }
  }

  async setTime(tm: Date | string) {
    try {
      // Validate the input time
      if (!(tm instanceof Date) && typeof tm !== "number") {
        throw new TypeError(
          "Invalid time parameter. Must be a Date object or a timestamp.",
        );
      }

      // Convert the input time to a Date object if it's not already
      const date = tm instanceof Date ? tm : new Date(tm);

      // Encode the time into the required format
      const encodedTime = timeParser.encode(date);

      // Create a buffer and write the encoded time
      const commandString = Buffer.alloc(32);
      commandString.writeUInt32LE(encodedTime, 0);

      // Send the command to set the time
      const time = await this._zkTcp.executeCmd(
        COMMANDS.CMD_SET_TIME,
        commandString,
      );
      return !!time;
    } catch (err) {
      // Log the error for debugging
      console.error("Error setting time:", err);
      // Re-throw the error for the caller to handle
      throw err;
    }
  }

  async voiceTest() {
    try {
      // Define the command data for the voice test
      const commandData = Buffer.from("\x00\x00", "binary");
      await this._zkTcp.executeCmd(COMMANDS.CMD_TESTVOICE, commandData);
      // Execute the command and return the result
    } catch (err) {
      // Log the error for debugging purposes
      console.error("Error executing voice test:", err);

      // Re-throw the error to be handled by the caller
      throw err;
    }
  }
}
