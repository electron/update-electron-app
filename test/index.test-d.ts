import { expectType } from 'tsd'
import updater = require('../')

expectType<void>(updater())

interface ICustomLogger {
  log(message: string, ...args: string[]): void;
}

const customLogger: ICustomLogger = {
  log: (): void => {
    return
  }
}

updater<ICustomLogger>({
  logger: customLogger,
  host: "https://github.com",
  notifyUser: true,
  repo: "HashimotoYT/hab",
  updateInterval: "10 minutes",
});

updater()

updater({
  logger: console,
})
