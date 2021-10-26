import HorizontalWealthDungeon from 'components/HorizontalWealthDungeon';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import { useEffect, useState } from 'react';

type FooterAPI = APIClient<typeof import('pages/api/images/footer').default>;

const Footer = () => {
	const [footerName, setFooterName] = useState<string>();

	useEffect(() => {
		(api as FooterAPI)
			.get('/images/footer')
			.then(({ data: footer }) => footer.name)
			.catch(() => 'template.png')
			.then(setFooterName);
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