import './styles.module.scss';
import Button from 'components/Button';
import type { ButtonProps } from 'components/Button';
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { Dialog } from 'modules/client/dialogs';

export type HelpButtonProps = Omit<ButtonProps, 'children' | 'onClick' | 'title'> & {
	children: ReactNode
};

const HelpButton = ({ className, children, ...props }: HelpButtonProps) => (
	<Button
		className={`icon help${className ? ` ${className}` : ''}`}
		title="Help"
		onClick={
			useCallback(() => {
				new Dialog({
					id: 'help',
					title: 'Help',
					content: children
				});
			}, [children])
		}
		{...props}
	/>
);

export default HelpButton;