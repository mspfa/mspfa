import axios from 'axios';
import { Dialog } from './dialogs';

/** This function works as if it is automatically plugged into every API call's `.catch`. */
const handleReject = (error: any) => {
	console.error(error);
	
	new Dialog({
		title: 'Error',
		content: String(error.message)
	});
	
	return Promise.reject(error);
};

const api = axios.create();

api.interceptors.request.use(
	undefined,
	handleReject
);
api.interceptors.response.use(
	undefined,
	handleReject
);

export default api;