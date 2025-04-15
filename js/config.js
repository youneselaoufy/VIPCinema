const isLocalhost = location.hostname === 'localhost';
const BASE_API_URL = isLocalhost
  ? 'http://localhost:5000'
  : 'https://youneselaoufy.com/VIPcinema';

export default BASE_API_URL;
