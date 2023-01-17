import './styles.module.scss';
import Link from 'components/Link';
import classes from 'lib/client/classes';

export type ForgotPasswordProps = {
	className?: string
};

/** A "Forgot Password?" link to be placed in a `LabeledGrid`. */
const ForgotPassword = ({ className }: ForgotPasswordProps) => (
	<div
		className={classes('forgot-password-link-container', className)}
	>
		<Link className="translucent">Forgot Password?</Link>
	</div>
);

export default ForgotPassword;
