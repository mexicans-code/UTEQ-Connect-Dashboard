
const useRemoteApi = false;

let API_URL = '';

if (useRemoteApi) {
    API_URL = 'https://uteq-connect-server-production.up.railway.app/api';
} else {
    API_URL = 'http://10.13.45.28:3000/api';
} 

export { API_URL };
