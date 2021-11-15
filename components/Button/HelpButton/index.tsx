import './styles.module.scss';
import Button from 'components/Button';
import type { ButtonProps } from 'components/Button';
import type { ReactNode } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import Dialog from 'lib/client/Dialog';

export type HelpButtonProps = Omit<ButtonProps, 'children' | 'onClick' | 'title'> & {
	subject: ReactNode,
	children: ReactNode
};

const HelpButton = ({ className, subject, children, ...props }: HelpButtonProps) => (
	<Button
		icon
		className={`help-button${className ? ` ${className}` : ''}`}
		title="Help"
		onClick={
			useFunction(() => {
				new Dialog({
					id: 'help',
					title: <>Help: {subject}</>,
					content: children
				});
			})
		}
		{...props}
	/>
);

export default HelpButton;