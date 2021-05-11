import './styles.module.scss';
import Button from 'components/Button';
import type { ButtonProps } from 'components/Button';
import { useCallback } from 'react';

export type FavButtonProps = Omit<ButtonProps, 'onClick' | 'title'>;

const FavButton = ({ className, ...props }: FavButtonProps) => (
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

export default FavButton;