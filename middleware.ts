// This middleware implements rate limiting.

import type { DateNumber } from 'lib/types';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/** The number of milliseconds it takes for a client request time to be forgotten. */
const TIME_PERIOD = 1000 * 60;
/** The maximum number of requests to allow from each client per `TIME_PERIOD`. */
const MAX_REQUESTS_PER_TIME_PERIOD = 240;

/** A mapping from each client's IP to a sorted array of the date numbers at which requests were received from that client. */
const requestTimesByIP: Record<string, DateNumber[]> = {};

/** Deletes all request times from `requestTimesByIP` which occurred longer than `TIME_PERIOD` ago. */
const forgetOldRequestTimes = () => {
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

setInterval(forgetOldRequestTimes, 1000);

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

	// Get `clientRequestTimes`, but first create it if it doesn't exist.
	if (!(clientIP in requestTimesByIP)) {
		requestTimesByIP[clientIP] = [];
	}
	const clientRequestTimes = requestTimesByIP[clientIP];

	const now = Date.now();

	/** The number of requests received from this client within the last `TIME_PERIOD`. */
	const clientRequestCount = clientRequestTimes.push(now);
	if (clientRequestCount > MAX_REQUESTS_PER_TIME_PERIOD) {
		/** The `DateNumber` after which the client will no longer be rate limited. */
		// This is calculated by getting the time that the `MAX_REQUESTS_PER_TIME_PERIOD`th-last client request time will be forgotten, because after that request time is forgotten, the client would have one less than the `MAX_REQUESTS_PER_TIME_PERIOD`, which allows one more to be accepted without rate limiting.
		const retryAfter = clientRequestTimes[clientRequestCount - MAX_REQUESTS_PER_TIME_PERIOD] + TIME_PERIOD;

		if (/^\/api(?:\/|$)/.test(req.nextUrl.pathname)) {
			return NextResponse.rewrite(
				new URL(`/api/_error/429?retryAfter=${retryAfter}`, req.url)
			);
		}

		return NextResponse.rewrite(
			new URL(`/_error/429?retryAfter=${retryAfter}`, req.url)
		);
	}
};
