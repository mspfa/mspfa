// This middleware implements rate limiting.

import type { ErrorResponseBody } from 'lib/server/api';
import type { DateNumber } from 'lib/types';
import type { NextRequest } from 'next/server';

const TIME_PERIOD = 1000 * 60;
/** The maximum number of requests that should be allowed from each client per `TIME_PERIOD`. */
const MAX_REQUESTS_PER_TIME_PERIOD = 240;

const RATE_LIMIT_ERROR: ErrorResponseBody = {
	message: 'You\'re sending data to MSPFA too quickly. Please wait before continuing.'
};
const STRINGIFIED_RATE_LIMIT_ERROR = JSON.stringify(RATE_LIMIT_ERROR);

/** A mapping from each client's IP to a sorted array of the date numbers at which requests were received from that client. */
const requestTimesByIP: Record<string, DateNumber[]> = {};

/** Deletes all request times from `requestTimesByIP` which occurred longer than `TIME_PERIOD` ago. */
const purgeOldRequestTimes = () => {
	const timePeriodAgo = Date.now() - TIME_PERIOD;

	for (const ip of Object.keys(requestTimesByIP)) {
		const requestTimes = requestTimesByIP[ip];

		while (requestTimes[0] < timePeriodAgo) {
			requestTimes.shift();
		}

		if (requestTimes.length === 0) {
			delete requestTimesByIP[ip];
		}
	}
};

setInterval(purgeOldRequestTimes, 1000);

export const middleware = async (req: NextRequest) => {
	let clientIP = req.headers.get('X-Forwarded-For');
	if (clientIP) {
		const commaIndex = clientIP.indexOf(',');
		if (commaIndex !== -1) {
			clientIP = clientIP.slice(0, commaIndex);
		}
	} else {
		clientIP = '127.0.0.1';
	}

	if (!(clientIP in requestTimesByIP)) {
		requestTimesByIP[clientIP] = [];
	}
	const clientRequestTimes = requestTimesByIP[clientIP];

	/** The number of requests received from this client within the last `TIME_PERIOD`. */
	const clientRequestCount = clientRequestTimes.push(Date.now());
	if (clientRequestCount > MAX_REQUESTS_PER_TIME_PERIOD) {
		return (
			req.nextUrl.pathname.startsWith('/api/') || req.nextUrl.pathname === '/api'
				? new Response(STRINGIFIED_RATE_LIMIT_ERROR, {
					status: 429,
					headers: {
						'Content-Type': 'application/json'
					}
				})
				: new Response(RATE_LIMIT_ERROR.message, {
					status: 429,
					headers: {
						'Content-Type': 'text/plain'
					}
				})
		);
	}
};