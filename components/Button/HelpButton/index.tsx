import './styles.module.scss';
import Button from 'components/Button';
import type { ButtonProps } from 'components/Button';
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import Dialog from 'modules/client/Dialog';

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
			useCallback(() => {
				new Dialog({
					id: 'help',
					title: <>Help: {subject}</>,
					content: children
				});
			}, [children, subject])
		}
		{...props}
	/>
);

export default HelpButton;