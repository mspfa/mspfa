import HorizontalWealthDungeon from 'components/HorizontalWealthDungeon';
import createGlobalState from 'global-react-state';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import { useEffect } from 'react';

type FooterAPI = APIClient<typeof import('pages/api/images/footer').default>;

const [useFooterName, setFooterName] = createGlobalState<string | undefined>(undefined);

const Footer = () => {
	const [footerName] = useFooterName();

	useEffect(() => {
		if (footerName) {
			// Don't fetch a new footer if the client already has one.
			return;
		}

		(api as FooterAPI)
			.get('/images/footer')
			.then(({ data: footer }) => footer.name)
			.catch(() => 'template.png')
			.then(setFooterName);
	}, [footerName]);

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