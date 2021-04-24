import Link from 'components/Link';
import './styles.module.scss';

export type ForgotPasswordProps = {
	className?: string
};

/** A "Forgot Password?" link to be placed in a `LabeledDialogGrid`. */
const ForgotPassword = ({ className }: ForgotPasswordProps) => (
	<div
		className={`forgot-password-link-container${className ? ` ${className}` : ''}`}
	>
		<Link className="translucent-text">Forgot Password?</Link>
	</div>
);

export default ForgotPassword;