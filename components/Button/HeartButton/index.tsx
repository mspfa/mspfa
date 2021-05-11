import './styles.module.scss';
import Button from 'components/Button';
import type { ButtonProps } from 'components/Button';
import { useCallback } from 'react';

export type HeartButtonProps = Omit<ButtonProps, 'onClick' | 'title'>;

const HeartButton = ({ className, ...props }: HeartButtonProps) => (
	<Button
		className={`icon labeled heart${className ? ` ${className}` : ''}`}
		title="Favorite"
		onClick={
			useCallback(() => {
				// TODO
			}, [])
		}
		{...props}
	/>
);

export default HeartButton;