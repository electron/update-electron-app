import { expectType } from 'tsd';
import { updateElectron, UpdateSourceType } from '../';

expectType<void>(updateElectron.setup());

const customLogger = {
  log: (): void => {
    return;
  },
  info: (): void => {
    return;
  },
  error: (): void => {
    return;
  },
  warn: (): void => {
    return;
  },
};

updateElectron.setup({
  logger: customLogger,
  host: 'https://github.com',
  notifyUser: true,
  repo: 'HashimotoYT/hab',
  updateInterval: '10 minutes',
});

updateElectron.setup();

updateElectron.setup({
  logger: console,
});

updateElectron.setup({
  updateSource: {
    type: UpdateSourceType.ElectronPublicUpdateService,
  },
});

updateElectron.setup({
  updateSource: {
    type: UpdateSourceType.ElectronPublicUpdateService,
    repo: 'a/b',
    host: 'https://bar',
  },
});

updateElectron.setup({
  updateSource: {
    type: UpdateSourceType.StaticStorage,
    baseUrl: 'https://foo',
  },
});
