import { getRelativeTimestamp, getAbsoluteTimestamp, getShortTimestamp } from 'modules/client/dates';
import type { HTMLAttributes } from 'react';

export type TimestampProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
	children: Date | number,
	/** Whether the timestamp should only display a numeric date. */
	short?: boolean,
	/** Whether the timestamp should display the date relative to the current date rather than as an absolute date (or have it in the `title` attribute if the timestamp is `short`). */
	relative?: boolean,
	/**
	 * Whether the timestamp should display the time of day (or have it in the `title` attribute if the timestamp is `short` or `relative` (but not both)).
	 */
	withTime?: boolean,
	/** Displays an asterisk after the timestamp with the  */
	edited?: Date | number
};

const Timestamp = ({ short, relative, withTime, edited, className, children, ...props }: TimestampProps) => {
	const date = children instanceof Date ? children : new Date(children);
	const dateEdited = (
		edited === undefined
			? undefined
			: edited instanceof Date
				? edited
				: new Date(edited)
	);

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
							? getShortTimestamp(date)
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