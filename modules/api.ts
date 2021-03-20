import axios from 'axios';
import { Dialog } from './dialogs';

const api = Object.assign(
	axios.create({
		baseURL: '/api'
	}),
	{
		/** Use this config object in API requests to not reject the request's promise on HTTP 4xx errors. */
		ignoreClientErrors: { validateStatus: (status: number) => status < 500 }
	}
);

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