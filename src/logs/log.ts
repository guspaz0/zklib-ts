import { appendFile } from 'fs';

interface ParsedTime {
    year: number;
    month: number;
    day: number;
    hour: number;
    second: number;
}

const parseCurrentTime = (): ParsedTime => {
    const currentTime = new Date();
    return {
        year: currentTime.getFullYear(),
        month: currentTime.getMonth() + 1,
        day: currentTime.getDate(),
        hour: currentTime.getHours(),
        second: currentTime.getSeconds()
    };
};

export const log = (text: string): void => {
    const currentTime = parseCurrentTime();
    const fileName = `${currentTime.day}`.padStart(2, '0') +
        `${currentTime.month}`.padStart(2, '0') +
        `${currentTime.year}.err.log`;
    const logMessage = `\n [${currentTime.hour}:${currentTime.second}] ${text}`;

    appendFile(fileName, logMessage, () => {});
};