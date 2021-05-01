import './styles.module.scss';
import BoxSection from 'components/Box/BoxSection';
import type { BoxSectionProps } from 'components/Box/BoxSection';

export type BoxRowSectionProps = BoxSectionProps;

/** A `BoxSection`, by default with two columns, to put `BoxRow`s (of any variant) in. */
const BoxRowSection = ({ className, ...props }: BoxRowSectionProps) => (
	<BoxSection
		className={`box-row-section${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default BoxRowSection;