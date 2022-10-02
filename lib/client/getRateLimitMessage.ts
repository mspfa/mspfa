import type { DateNumber } from 'lib/types';

const getRateLimitMessage = (retryAfter: DateNumber) => {
	const retryAfterSeconds = Math.ceil((retryAfter - Date.now()) / 1000);

	return `You're sending data to MSPFA too quickly. Please wait ~${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'} before retrying.` as const;
};

export default getRateLimitMessage;
