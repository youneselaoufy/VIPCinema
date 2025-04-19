const isLocalhost = location.hostname === 'localhost';
const BASE_API_URL = isLocalhost
  ? 'http://localhost:5000'
  : 'https://youneselaoufy.com/VIPCinema';

export default BASE_API_URL;
