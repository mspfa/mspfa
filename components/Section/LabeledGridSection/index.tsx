import Section from 'components/Section';
import type { SectionProps } from 'components/Section';
import LabeledGrid from 'components/LabeledGrid';

export type LabeledGridSectionProps = SectionProps;

/** A `Section` with a `LabeledGrid` as its content. */
const LabeledGridSection = ({ children, ...props }: LabeledGridSectionProps) => (
	<Section customContent {...props}>
		<LabeledGrid className="section-content front">
			{children}
		</LabeledGrid>
	</Section>
);

export default LabeledGridSection;