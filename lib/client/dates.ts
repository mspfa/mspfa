export const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
export const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export const weekDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const shortWeekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Outputs a string which is exactly two digits of the input. */
export const twoDigits = (value: any) => `0${value}`.slice(-2);

/**
 * Gets the time from a `Date`.
 *
 * Example outputs: `'02:49'`, `'18:03'`
 */
export const getTime = (date: Date) => [
	date.getHours(),
	date.getMinutes()
].map(twoDigits).join(':');

/**
 * Gets an absolute timestamp from a `Date`.
 *
 * Example outputs: `'February 4, 2021'`, `'July 15, 1999 at 04:53'`
 */
export const getAbsoluteTimestamp = (date: Date, withTime?: boolean) => {
	// This timestamp format is consistent with MSPA's news timestamps.
	let timestamp = `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;

	if (withTime) {
		timestamp += `, ${getTime(date)}`;
	}

	return timestamp;
};

/**
 * Gets a short timestamp from a `Date`.
 *
 * Example outputs: `'02/04/21'`, `'07/15/99 04:53'`
 */
export const getShortTimestamp = (date: Date, withTime?: boolean) => {
	let timestamp = [
		date.getMonth() + 1,
		date.getDate(),
		date.getFullYear()
	].map(twoDigits).join('/');

	if (withTime) {
		timestamp += ` ${getTime(date)}`;
	}

	return timestamp;
};

/** Prepends "in about" if the `timestamp` is `future`, or appends "ago" if it isn't. */
const preposeTimestamp = (timestamp: string, future: boolean) => (
	future
		? `in about ${timestamp}`
		: `${timestamp} ago`
);

/**
 * Gets a relative timestamp from a `Date`.
 *
 * Example outputs: `'14 minutes ago'`, `'3 years, 1 month ago'`, `'Just now!'`
 */
export const getRelativeTimestamp = (dateThen: Date) => {
	const then = +dateThen;
	const dateNow = new Date();
	const now = +dateNow;

	let future = false;

	let seconds = Math.floor((now - then) / 1000);

	if (seconds < 0) {
		seconds *= -1;
		future = true;
	} else if (seconds <= 5) {
		return 'Just now!';
	}

	if (seconds < 60) {
		return preposeTimestamp(`${seconds} second${seconds === 1 ? '' : 's'}`, future);
	}

	const minutes = Math.floor(seconds / 60);

	if (minutes < 60) {
		return preposeTimestamp(`${minutes} minute${minutes === 1 ? '' : 's'}`, future);
	}

	const hours = Math.floor(minutes / 60);

	if (hours < 24) {
		return preposeTimestamp(`${hours} hour${hours === 1 ? '' : 's'}`, future);
	}

	const days = Math.floor(hours / 24);

	if (days < 7) {
		return preposeTimestamp(`${days} day${days === 1 ? '' : 's'}`, future);
	}

	const fullYearNow = dateNow.getFullYear();
	const fullYearThen = dateThen.getFullYear();
	const monthNow = dateNow.getMonth();
	const monthThen = dateThen.getMonth();
	const fullMonthNow = 12 * fullYearNow + monthNow;
	const fullMonthThen = 12 * fullYearThen + monthThen;
	const months = fullMonthNow - fullMonthThen + (
		dateNow.getDate() < dateThen.getDate()
			// If the day of the month now is lower than the day of the month then, the difference in months is one too high.
			? -1
			: 0
	);

	if (months < 1) {
		const weeks = Math.floor(days / 7);

		return preposeTimestamp(`${weeks} week${weeks === 1 ? '' : 's'}`, future);
	}

	if (months < 12) {
		return preposeTimestamp(`${months} month${months === 1 ? '' : 's'}`, future);
	}

	let years = fullYearNow - fullYearThen;
	let moreMonths = months - 12 * years;
	if (moreMonths < 0) {
		// If `moreMonths < 0` (e.g. due to the present month being earlier in the year or the present day being earlier in the same month), the difference in years is one too high.
		years--;
		moreMonths += 12;
	}

	return preposeTimestamp(
		`${years} year${years === 1 ? '' : 's'}`
		+ (
			moreMonths
				? `, ${moreMonths} month${moreMonths === 1 ? '' : 's'}`
				: ''
		),
		future
	);
};