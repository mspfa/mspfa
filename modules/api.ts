import axios from 'axios';
import { Dialog } from './dialogs';

const api = axios.create({
	baseURL: '/api'
});

/** This function works as if it is automatically plugged into every API call's `.catch`. */
const onReject = (error: any) => {
	console.error(error);
	
	new Dialog({
		title: 'Error',
		content: error.response?.data.message || error.message
	});
	
	return Promise.reject(error);
};
api.interceptors.request.use(
	undefined,
	onReject
);
api.interceptors.response.use(
	undefined,
	onReject
);

export default api;