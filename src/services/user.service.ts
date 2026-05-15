import { User } from "../models/User";
import { ZTCP } from "../ztcp";
import {
  createTCPHeader,
  decodeTCPHeader,
  decodeUserData72,
  RealTimeLog,
  splitTcpPackets,
} from "../helper/utils";
import {
  COMMANDS,
  DISCOVERED_CMD,
  REQUEST_DATA,
  RTEvent,
} from "../helper/command";
import { Finger } from "../models/Finger";

export class UserService {
  _zkTcp: ZTCP;
  _users: Map<string, User>;

  constructor(zkTcp: ZTCP) {
    this._zkTcp = zkTcp;
  }

  async getUserByUserId(user_id: string) {
    if (!this._users) {
      await this.getUsers();
    }
    if (this._users.has(String(user_id))) {
      return this._users.get(String(user_id));
    } else throw new Error("user_id not exists");
  }

  async getUsers() {
    try {
      // Free any existing buffer data to prepare for a new request
      if (this._users) {
        return { data: Array.from(this._users.values()) };
      } else {
        this._users = new Map([]);
      }
      if (this._zkTcp.socket) {
        await this._zkTcp.freeData();
      }
      await this._zkTcp.disableDevice();
      const users = await new Promise<User[]>((resolve, reject) => {
        // Request user data
        this._zkTcp
          .readWithBuffer(REQUEST_DATA.GET_USERS)
          .then(async (data) => {
            // Ensure data.data is a valid buffer
            if (!data.data || !(data.data instanceof Buffer)) {
              reject(new Error("Invalid data received"));
              return;
            }

            let userData = data.data.subarray(4); // Skip the first 4 bytes (headers)
            const users = [];

            // Constants for user data processing
            const USER_PACKET_SIZE = 72;

            // Process each user packet
            while (userData.length >= USER_PACKET_SIZE) {
              // Decode user data and add to the users array
              const user = decodeUserData72(
                userData.subarray(0, USER_PACKET_SIZE),
              );
              users.push(user);
              this._users.set(user.user_id, user);
              userData = userData.subarray(USER_PACKET_SIZE); // Move to the next packet
            }
            resolve(users);
          })
          .catch(reject);
      });

      // Free buffer data after receiving the data
      if (this._zkTcp.socket && users) {
        await this._zkTcp.enableDevice();
        await this._zkTcp.freeData();
      }
      // Return the list of users
      return { data: users };
    } catch (err) {
      // Log the error for debugging
      console.error("Error getting users:", err);
      // Re-throw the error to be handled by the caller
      throw err;
    }
  }

  async setUser(
    user_id: string,
    name: string,
    password: string,
    role: number = 0,
    cardno: number = 0,
  ) {
    try {
      // Validate input parameters
      if (
        user_id.length > 9 ||
        name.length > 24 ||
        password.length > 8 ||
        typeof role !== "number" ||
        cardno.toString().length > 10
      ) {
        throw new Error("Invalid input parameters");
      }

      // Allocate and initialize the buffer
      const commandBuffer = Buffer.alloc(72);

      // Fill the buffer with user data
      commandBuffer.writeUInt16LE(0, 0); // uid will be set in the device
      commandBuffer.writeUInt16LE(role, 2);
      commandBuffer.write(password.padEnd(8, "\0"), 3, 8); // Ensure password is 8 bytes
      commandBuffer.write(name.padEnd(24, "\0"), 11, 24); // Ensure name is 24 bytes
      commandBuffer.writeUInt16LE(cardno, 35);
      commandBuffer.writeUInt32LE(0, 40); // Placeholder or reserved field
      commandBuffer.write(user_id.padEnd(9, "\0"), 48, 9); // Ensure userid is 9 bytes

      // Send the command and return the result
      const created = await this._zkTcp.executeCmd(
        COMMANDS.CMD_USER_WRQ,
        commandBuffer,
      );
      return !!created;
    } catch (err) {
      // Log error details for debugging
      console.error("Error setting user:", err);

      // Re-throw error for upstream handling
      throw err;
    }
  }

  async DeleteUser(user_id: string) {
    try {
      const user = await this.getUserByUserId(user_id);
      // Allocate and initialize the buffer
      const commandBuffer = Buffer.alloc(72);

      // Write UID to the buffer
      commandBuffer.writeUInt16LE(user.uid, 0);

      // Send the delete command and return the result
      const deleted = await this._zkTcp.executeCmd(
        COMMANDS.CMD_DELETE_USER,
        commandBuffer,
      );
      return !!deleted;
    } catch (err) {
      // Log error details for debugging
      console.error("Error deleting user:", err);

      // Re-throw error for upstream handling
      throw err;
    }
  }

  async getTemplates(cb?: Function): Promise<Record<string, Finger[]>> {
    const templates = [] as Finger[];
    try {
      await this._zkTcp.disableDevice();
      if (this._zkTcp.socket) {
        await this._zkTcp.freeData();
      }
      if (!this._zkTcp.fp_count) {
        await this._zkTcp.getSizes();
      }
      if (this._zkTcp.fp_count == 0) return { data: [] };

      const resp = (await this._zkTcp.readWithBuffer(
        REQUEST_DATA.GET_TEMPLATES,
      )) as Record<string, Buffer>;

      let templateData = resp.data.subarray(4);
      let totalSize = resp.data.readUIntLE(0, 4);

      while (totalSize) {
        const buf = templateData.subarray(0, 6);
        const size = buf.readUIntLE(0, 2);
        const uid = buf.readUIntLE(2, 2);
        const fid = buf.readUIntLE(4, 1);
        const valid = buf.readUIntLE(5, 1);

        // Force-copy bytes so we don't retain the entire big backing buffer
        const tplBytes = Buffer.from(templateData.subarray(6, size));

        templates.push(new Finger(uid, fid, tplBytes, valid));

        templateData = templateData.subarray(size);
        totalSize -= size;
      }

      if (cb) cb(templates);
      return { data: templates };
    } catch (err) {
      this._zkTcp.verbose && console.log("Error getting templates", err);
      throw err;
    } finally {
      await this._zkTcp.freeData();
      await this._zkTcp.enableDevice();
    }
  }

  async DownloadFp(user_id: string, fid: number): Promise<Finger> {
    try {
      const user = (await this.getUserByUserId(String(user_id))) as User;
      if (0 > fid || fid > 9) throw new Error("fid must be between 0 and 9");
      // Allocate and initialize the buffer
      const data = Buffer.alloc(3);
      // Fill the buffer with user data
      data.writeUInt16LE(user.uid, 0);
      data.writeUIntLE(fid, 2, 1);

      this._zkTcp.replyId++;
      const packet = createTCPHeader(
        COMMANDS.CMD_USERTEMP_RRQ,
        this._zkTcp.sessionId,
        this._zkTcp.replyId,
        data,
      );
      let fingerSize: number = 0;
      let fingerTemplate = Buffer.from([]);
      const template: Buffer = await new Promise((resolve, reject) => {
        let timeout: NodeJS.Timeout;
        const cleanup = () => {
          if (this._zkTcp.socket) {
            this._zkTcp.socket.removeListener("data", receiveData);
          }
          if (timeout) clearTimeout(timeout);
        };
        let timer = () =>
          setTimeout(() => {
            cleanup();
            reject(new Error("Time Out, Could not retrieve data"));
          }, this._zkTcp.timeout);
        const receiveData = (data: Buffer) => {
          timeout = timer();
          if (data.length === 0) return;
          try {
            if (data.length === 0) return;
            const headers = decodeTCPHeader(data);
            switch (headers.commandId) {
              case DISCOVERED_CMD.FID_NOT_FOUND:
                throw new Error(
                  "Could not retrieve data. maybe finger id not exists?",
                );
              case COMMANDS.CMD_PREPARE_DATA:
                fingerSize = data.readUIntLE(16, 2);
                break;
              case COMMANDS.CMD_DATA:
                // A single 'data' event might contain multiple TCP packets combined by the OS
                // in this method, is possible to get CMD_DATA and CMD_ACK_OK in the same event,
                // so It's important to split data received for remove CMD_ACK_OK headers
                fingerTemplate = Buffer.concat([
                  fingerTemplate,
                  data.subarray(16, fingerSize + 10),
                ]);
                // @ts-ignore
                resolve(fingerTemplate);
                break;

              case COMMANDS.CMD_ACK_OK:
                cleanup();
                // @ts-ignore
                resolve(fingerTemplate);
                return;
              default:
                // If it's not a recognized command but has data, it might be raw template data
                if (headers.commandId > 2000 && headers.commandId < 3000) {
                  // Likely another ACK or system msg
                } else {
                  fingerTemplate = Buffer.concat([fingerTemplate, data]);
                }
                break;
            }
            clearTimeout(timeout);
          } catch (e) {
            cleanup();
            reject(e);
          }
        };

        if (this._zkTcp.socket) {
          this._zkTcp.socket.on("data", receiveData);
          this._zkTcp.socket.write(packet, undefined, (err) => {
            if (err) {
              cleanup();
              reject(err);
            }
          });
        } else {
          reject(new Error("Socket not initialized"));
        }
      });
      return new Finger(user.uid, fid, template);
    } catch (err) {
      throw err;
    } finally {
      await this._zkTcp.freeData();
    }
  }

  /**
   *
   * @param user_id {string} user
   * @param fingers {Finger[]} array of finger templates instances
   * */
  async saveTemplates(user_id: string, fingers: Finger[] = []) {
    if (fingers.length > 9 || fingers.length == 0)
      throw new Error("maximum finger length is 10 and can't be empty");
    try {
      await this._zkTcp.disableDevice();
      // check users exists
      const user = await this.getUserByUserId(user_id);

      let fpack = Buffer.alloc(0);
      let table = Buffer.alloc(0);
      const fnum = 0x10;
      let tstart = 0;

      for (const finger of fingers) {
        const tfp = finger.repackOnly();
        const tableEntry = Buffer.alloc(11); // b=1, H=2, b=1, I=4 => 1+2+1+4=8? Wait, bHbI is 1+2+1+4=8 bytes
        tableEntry.writeInt8(2, 0);
        tableEntry.writeUInt16LE(user.uid, 1);
        tableEntry.writeInt8(fnum + finger.fid, 3);
        tableEntry.writeUInt32LE(tstart, 4);

        table = Buffer.concat([table, tableEntry]);
        tstart += tfp.length;
        fpack = Buffer.concat([fpack, tfp]);
      }

      let upack;
      if (this._zkTcp.userPacketSize === 28) {
        upack = user.repack29();
      } else {
        upack = user.repack73();
      }

      const head = Buffer.alloc(12); // III = 3*4 bytes
      head.writeUInt32LE(upack.length, 0);
      head.writeUInt32LE(table.length, 4);
      head.writeUInt32LE(fpack.length, 8);

      const packet = Buffer.concat([head, upack, table, fpack]);
      await this._zkTcp.sendWithBuffer(packet);
      const command = 110;
      const commandString = Buffer.alloc(8); // <IHH = I(4) + H(2) + H(2) = 8 bytes
      commandString.writeUInt32LE(12, 0);
      commandString.writeUInt16LE(0, 4);
      commandString.writeUInt16LE(8, 6);

      await this._zkTcp.executeCmd(command, commandString);

      if (this._zkTcp.verbose)
        console.log(
          "finally bulk save user templates: \n",
          "templates saved successfully",
        );
    } catch (error) {
      throw error;
    } finally {
      await this._zkTcp.refreshData();
      await this._zkTcp.enableDevice();
    }
  }

  async deleteFinger(user_id?: string, fid?: number) {
    try {
      const user = (await this.getUserByUserId(user_id as string)) as User;

      const buf = Buffer.alloc(4);
      buf.writeUInt16LE(user_id ? user.uid : 0, 0);
      buf.writeUint16LE(fid ? fid : 0, 2);
      const reply = await this._zkTcp.executeCmd(
        COMMANDS.CMD_DELETE_USERTEMP,
        buf,
      );
      return !!reply;
    } catch (error) {
      throw new Error("Can't save utemp");
    } finally {
      await this._zkTcp.refreshData();
    }
  }

  async enrollInfo(user_id: string, tempId: number) {
    try {
      let timer: NodeJS.Timeout;
      const setTimeoutTimer = (cb: (reason?: any) => void) => {
        if (timer) clearTimeout(timer);
        return setTimeout(() => {
          cb(new Error("[ENROLL_INFO] time out"));
        }, 1000 * 20);
      };
      const cleanUp = () => {
        if (timer) clearTimeout(timer);
      };
      return await new Promise((resolve, reject) => {
        const handleRtEvent = (rtEvent: RealTimeLog) => {
          switch (rtEvent.event) {
            case RTEvent.EF_FPFTR:
              timer = setTimeoutTimer(reject);
              break;
            case RTEvent.EF_FINGER:
              console.log(rtEvent);
              break;
            case RTEvent.EF_ENROLLFINGER:
              cleanUp();
              resolve(rtEvent);
              break;
            default:
              console.log(rtEvent);
              break;
          }
        };
        // Start enroll process
        this.getUserByUserId(user_id)
          .then(async (user) => {
            /** First check if Finger index already exists, and if so, it must be deleted  */
            try {
              const exists = await this.DownloadFp(user_id, tempId);
              console.log("exists: ", exists);
              if (exists) {
                this._zkTcp.verbose &&
                  console.debug("Deleting Finger index before start enroll");
                await this.deleteFinger(user_id, tempId);
              }
            } catch (e) {
              this._zkTcp.verbose &&
                console.debug("Finger index is empty, skipping delete");
            }

            const userBuf = Buffer.alloc(24);
            userBuf.write(user_id, 0, 24, "ascii");
            const commandString = Buffer.concat([
              userBuf,
              Buffer.from([tempId, 1]),
            ]);
            await this._zkTcp.executeCmd(
              COMMANDS.CMD_STARTENROLL,
              commandString,
            ); // #5

            this._zkTcp.timeout = 60000; // 60 seconds timeout
            await this._zkTcp.executeCmd(COMMANDS.CMD_STARTVERIFY, ""); // #17

            timer = setTimeoutTimer(reject);
            void (await this._zkTcp.getRealTimeLogs(handleRtEvent)); // #9
          })
          .catch(reject);
      });
    } catch (error) {
      throw error;
    } finally {
      //await this._zkTcp.cancelCapture();
      //await this.verify(user_id);
    }
  }

  async verify(user_id: string) {
    try {
      const user = await this.getUserByUserId(user_id);
      const command_string = Buffer.alloc(4);
      command_string.writeUInt32LE(user.uid, 0);
      const reply = await this._zkTcp.executeCmd(
        COMMANDS.CMD_STARTVERIFY,
        command_string,
      );
      if (this._zkTcp.verbose) console.log(reply.readUInt16LE(0));
      return !!reply;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  /**
   * Upload a single fingerprint for a given user id
   * @param user_id {string} user id for customer
   * @param fingerTemplate {string} finger template in base64 string
   * @param fid {number} finger id is a number between 0 and 9
   * @param fp_valid {number} finger flag. e.g., valid=1, duress=3
   */
  async uploadFingerTemplate(
    user_id: string,
    fingerTemplate: string,
    fid: number,
    fp_valid: number,
  ) {
    try {
      const user = this._users.get(user_id);
      await this._zkTcp.disableDevice();
      const prep_struct = Buffer.alloc(4);
      const fingerBuffer = Buffer.from(fingerTemplate, "base64");
      const fp_size = fingerBuffer.length;

      prep_struct.writeUInt16LE(fp_size, 0);
      const initPacket = await this._zkTcp.executeCmd(
        COMMANDS.CMD_PREPARE_DATA,
        prep_struct,
      );
      if (initPacket.readUInt16LE(0) !== COMMANDS.CMD_ACK_OK) {
        throw new Error(
          `received unexpected command: ${initPacket.readUInt16LE(0)}`,
        );
      }

      const fpPacket = await this._zkTcp.executeCmd(
        COMMANDS.CMD_DATA,
        fingerBuffer,
      );
      if (fpPacket.readUInt16LE(0) !== COMMANDS.CMD_ACK_OK) {
        throw new Error(
          `received unexpected command: ${fpPacket.readUInt16LE(0)}`,
        );
      }

      const cheksumPacket = await this._zkTcp.executeCmd(
        COMMANDS.CMD_CHECKSUM_BUFFER,
        "",
      );
      if (cheksumPacket.readUInt16LE(0) !== COMMANDS.CMD_ACK_OK) {
        throw new Error(
          `received unexpected command: ${cheksumPacket.readUInt16LE(0)}`,
        );
      }

      const tmp_wreq = Buffer.alloc(6);
      tmp_wreq.writeUInt16LE(user.uid, 0);
      tmp_wreq.writeUIntLE(fid, 2, 1);
      tmp_wreq.writeUIntLE(fp_valid, 3, 1);

      tmp_wreq.writeUInt16LE(fp_size, 4);
      const tmp_wreqPacket = await this._zkTcp.executeCmd(
        COMMANDS.CMD_TMP_WRITE,
        tmp_wreq,
      );
      if (tmp_wreqPacket.readUInt16LE(0) !== COMMANDS.CMD_ACK_OK) {
        throw new Error(
          `received unexpected command: ${tmp_wreqPacket.readUInt16LE(0)}`,
        );
      }

      const freeData = await this._zkTcp.executeCmd(COMMANDS.CMD_FREE_DATA, "");
      if (freeData.readUInt16LE(0) !== COMMANDS.CMD_ACK_OK) {
        throw new Error(
          `received unexpected command: ${freeData.readUInt16LE(0)}`,
        );
      }
      return true;
    } catch (err) {
      throw err;
    } finally {
      await this._zkTcp.refreshData();
      await this._zkTcp.enableDevice();
    }
  }
}
