'use strict';

import httpServer from './httpServer';
import bridgeServer from './bridgeServer';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
module.exports = {
  ...httpServer,
  ...bridgeServer,
};
