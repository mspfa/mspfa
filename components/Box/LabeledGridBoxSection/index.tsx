import BoxSection from 'components/Box/BoxSection';
import type { BoxSectionProps } from 'components/Box/BoxSection';
import LabeledGrid from 'components/LabeledGrid';

export type LabeledGridBoxSectionProps = BoxSectionProps;

/** A `BoxSection` with a `LabeledGrid` as its content. */
const LabeledGridBoxSection = ({ children, ...props }: LabeledGridBoxSectionProps) => (
	<BoxSection customContent {...props}>
		<LabeledGrid className="box-section-content front">
			{children}
		</LabeledGrid>
	</BoxSection>
);

export default LabeledGridBoxSection;