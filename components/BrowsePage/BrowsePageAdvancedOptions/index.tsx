import './styles.module.scss';
import Link from 'components/Link';
import Row from 'components/Row';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { ReactNode } from 'react';
import { useState } from 'react';

export type BrowsePageAdvancedOptionsProps = {
	children: ReactNode
};

const BrowsePageAdvancedOptions = ({ children }: BrowsePageAdvancedOptionsProps) => {
	const [advancedShown, setAdvancedShown] = useState(false);

	return (
		<>
			<Row className="browse-page-toggle-advanced-link-container">
				<Link
					className="browse-page-toggle-advanced-link translucent"
					onClick={
						useFunction(() => {
							setAdvancedShown(advancedShown => !advancedShown);
						})
					}
				>
					{advancedShown ? 'Hide Advanced Options' : 'Show Advanced Options'}
				</Link>
			</Row>
			{advancedShown && children}
		</>
	);
};

export default BrowsePageAdvancedOptions;