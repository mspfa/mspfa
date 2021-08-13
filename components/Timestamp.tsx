import { getRelativeTimestamp, getAbsoluteTimestamp, getShortTimestamp } from 'lib/client/dates';
import type { DateNumber } from 'lib/types';
import type { HTMLAttributes } from 'react';
import { useEffect, useState } from 'react';

export type TimestampProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
	children: Date | DateNumber,
	/** Whether the timestamp should only display a numeric date. */
	short?: boolean,
	/** Whether the timestamp should display the date relative to the current date rather than as an absolute date (or have it in the `title` attribute if the timestamp is `short`). */
	relative?: boolean,
	/**
	 * Whether the timestamp should display the time of day (or have it in the `title` attribute if the timestamp is `short` or `relative` (but not both)).
	 */
	withTime?: boolean,
	/** Displays an asterisk after the timestamp with the  */
	edited?: Date | DateNumber
};

const Timestamp = ({ short, relative, withTime, edited, className, children, ...props }: TimestampProps) => {
	const [, update] = useState(false);

	const date = new Date(children);
	const dateEdited = (
		edited === undefined
			? undefined
			: new Date(edited)
	);

	useEffect(() => {
		// Update this component every 60 seconds.
		const updateInterval = setInterval(() => {
			update(value => !value);
		}, 1000 * 60);

		return () => {
			clearInterval(updateInterval);
		};
	}, []);

	return (
		<>
			<span
				className={`timestamp${className ? ` ${className}` : ''}`}
				{...props}
			>
				<span
					className="timestamp-content"
					title={(
						short
							? relative
								? getRelativeTimestamp(date)
								: getAbsoluteTimestamp(date, withTime)
							: relative
								? getAbsoluteTimestamp(date, withTime)
								: getRelativeTimestamp(date)
					)}
					suppressHydrationWarning
				>
					{(
						short
							? getShortTimestamp(date, withTime)
							: relative
								? getRelativeTimestamp(date)
								: getAbsoluteTimestamp(date, withTime)
					)}
				</span>
				{dateEdited && (
					<span
						className="timestamp-edited"
						title={
							`Edited: ${relative
								? getRelativeTimestamp(dateEdited)
								: getAbsoluteTimestamp(dateEdited, withTime)
							} (${relative
								? getAbsoluteTimestamp(dateEdited, withTime)
								: getRelativeTimestamp(dateEdited)
							})`
						}
						suppressHydrationWarning
					>
						*
					</span>
				)}
			</span>
		</>
	);
};

export default Timestamp;