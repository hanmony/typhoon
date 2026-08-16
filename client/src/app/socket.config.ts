import { environment as baseConfig } from '../environments/environment';
const config = {
  url: baseConfig.socketUrl, // 替换为您的后端服务器地址
  options: {
    transports: ['websocket'],
    upgrade: false,
  },
};

export default config;
