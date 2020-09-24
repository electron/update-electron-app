import { expectType } from 'tsd'
import updater = require('../')

expectType<void>(updater())

updater({
  logger: console,
  host: "https://github.com",
  notifyUser: true,
  repo: "HashimotoYT/hab",
  updateInterval: "10 minutes",
});
