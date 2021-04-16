import type { HTMLAttributes } from 'react';

const dayNames = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday'
];

const monthNames = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

type TimestampProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
	children: Date | number
};

const Timestamp = ({ className, children, ...props }: TimestampProps) => {
	const dateNow = new Date();
	const now = +dateNow;
	const dateThen = children instanceof Date ? children : new Date(children);
	const then = +children;

	const preciseDate = `${dayNames[dateThen.getDay()]}, ${dateThen.getDate()} ${monthNames[dateThen.getMonth()]} ${dateThen.getFullYear()} ${dateThen.getHours()}:${`0${dateThen.getMinutes()}`.slice(-2)}`;

	let relativeDate = 'Just now!';

	const secondsAgo = Math.floor((now - then) / 1000);
	if (secondsAgo > 1) {
		if (secondsAgo < 60) {
			relativeDate = `${secondsAgo} seconds ago`;
		} else {
			const minutesAgo = Math.floor(secondsAgo / 60);

			if (minutesAgo < 60) {
				relativeDate = `${minutesAgo} minute${minutesAgo === 1 ? '' : 's'} ago`;
			} else {
				const hoursAgo = Math.floor(minutesAgo / 60);

				if (hoursAgo < 24) {
					relativeDate = `${hoursAgo} hour${hoursAgo === 1 ? '' : 's'} ago`;
				} else {
					const daysAgo = Math.floor(hoursAgo / 24);

					if (daysAgo < 7) {
						relativeDate = `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`;
					} else {
						const fullYearNow = dateNow.getFullYear();
						const fullYearThen = dateThen.getFullYear();
						const monthNow = dateNow.getMonth();
						const monthThen = dateThen.getMonth();
						const fullMonthNow = 12 * fullYearNow + monthNow;
						const fullMonthThen = 12 * fullYearThen + monthThen;
						const monthsAgo = fullMonthNow - fullMonthThen + (
							dateNow.getDate() < dateThen.getDate()
								// If the day of the month now is lower than the day of the month then, the difference in months is one too high.
								? -1
								: 0
						);

						if (monthsAgo < 1) {
							const weeksAgo = Math.floor(daysAgo / 7);

							relativeDate = `${weeksAgo} week${weeksAgo === 1 ? '' : 's'} ago`;
						} else if (monthsAgo < 12) {
							relativeDate = `${monthsAgo} month${monthsAgo === 1 ? '' : 's'} ago`;
						} else {
							const yearsAgo = fullYearNow - fullYearThen + (
								monthNow < monthThen
									// If the month of the year now is lower than the month of the year then, the difference in years is one too high.
									? -1
									: 0
							);
							const moreMonthsAgo = monthsAgo - 12 * yearsAgo;

							relativeDate = `${yearsAgo} year${yearsAgo === 1 ? '' : 's'}${moreMonthsAgo ? `, ${moreMonthsAgo} month${moreMonthsAgo === 1 ? '' : 's'}` : ''} ago`;
						}
					}
				}
			}
		}
	}

	return (
		<span
			className={`timestamp${className ? ` ${className}` : ''}`}
			title={preciseDate}
			{...props}
			suppressHydrationWarning
		>
			{relativeDate}
		</span>
	);
};

export default Timestamp;