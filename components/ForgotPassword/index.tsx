import './styles.module.scss';
import Link from 'components/Link';
import classNames from 'classnames';

export type ForgotPasswordProps = {
	className?: string
};

/** A "Forgot Password?" link to be placed in a `LabeledGrid`. */
const ForgotPassword = ({ className }: ForgotPasswordProps) => (
	<div
		className={classNames('forgot-password-link-container', className)}
	>
		<Link className="translucent">Forgot Password?</Link>
	</div>
);

export default ForgotPassword;
