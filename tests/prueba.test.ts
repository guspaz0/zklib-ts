import Zklib from "../src";
import fs from 'fs'

jest.setTimeout(15000); // 15 seconds timeout for device operations

describe('probando templates', () => {

    test('', async ()=> {
        let zkInstance;
        try {
            zkInstance = new Zklib("192.168.1.13", 4370, 10000, 10000, 5814, true);
            await zkInstance.createSocket();
            const templates = await zkInstance.getTemplates();
            //let groupby = Object.groupBy(templates.sort((a,b)=> a.uid - b.uid), (finger)=> finger.uid)
            //console.log(groupby[86][0])
            //fs.writeFileSync(__dirname+'./test.json', JSON.stringify(),)
            // let countFinger = Object.entries(groupby).map(([key, template]) => ({uid: key, fingerCount: template.length}))
            // console.log(countFinger)
            expect(templates).toBeInstanceOf(Array)
        } catch (e) {
            console.error(e)
        } finally {
            if(zkInstance) {
                await zkInstance.disconnect();
            }
        }
    })
})
