import './styles.module.scss';
import type { HTMLAttributes } from 'react';
import { useRef } from 'react';
import classes from 'lib/client/classes';
import Button from 'components/Button';
import useSticky from 'lib/client/reactHooks/useSticky';

export type TopActionsProps = HTMLAttributes<HTMLDivElement>;

/** A sticky area at the top of the page containing various actions. */
const TopActions = ({ className, children, ...props }: TopActionsProps) => {
	const elementRef = useRef<HTMLDivElement>(null as never);
	useSticky(elementRef);

	return (
		<div
			className={classes('top-actions mid', className)}
			{...props}
			ref={elementRef}
		>
			<Button className="link-to-top" href="#">
				Back to Top
			</Button>
			{children}
		</div>
	);
};

export default TopActions;
