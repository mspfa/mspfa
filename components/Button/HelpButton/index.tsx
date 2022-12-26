import './styles.module.scss';
import Button from 'components/Button';
import type { ButtonProps } from 'components/Button';
import type { ReactNode } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import Dialog from 'components/Dialog';
import classNames from 'classnames';

export type HelpButtonProps = Omit<ButtonProps, 'children' | 'onClick' | 'title'> & {
	subject: ReactNode,
	children: ReactNode
};

const HelpButton = ({ className, subject, children, ...props }: HelpButtonProps) => (
	<Button
		icon
		className={classNames('help-button', className)}
		title="Help"
		onClick={
			useFunction(() => {
				Dialog.create(
					<Dialog
						id="help"
						title={<>Help: {subject}</>}
					>
						{children}
					</Dialog>
				);
			})
		}
		{...props}
	/>
);

export default HelpButton;
