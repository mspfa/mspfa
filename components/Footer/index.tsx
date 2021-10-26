import HorizontalWealthDungeon from 'components/HorizontalWealthDungeon';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import { useEffect, useState } from 'react';

type FooterAPI = APIClient<typeof import('pages/api/images/footer').default>;

const Footer = () => {
	// Default to `'template.png'` so the template footer image displays in archived versions of the site where API calls don't work.
	const [footerName, setFooterName] = useState('template.png');

	useEffect(() => {
		(api as FooterAPI).get('/images/footer').then(({ data: footer }) => {
			setFooterName(footer.name);
		});
	}, []);

	return (
		<footer>
			<div className="mspface-container">
				{footerName && (
					<style jsx global>
						{`
							footer .mspface {
								background-image: url(/images/footers/${footerName});
							}
						`}
					</style>
				)}
				<div className="mspface left" />
				<HorizontalWealthDungeon />
				<div className="mspface right" />
			</div>
		</footer>
	);
};

export default Footer;