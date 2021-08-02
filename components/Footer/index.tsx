import './styles.module.scss';
import useSWR from 'swr';
import Stick from 'components/Stick';
import Link from 'components/Link';
import WealthDungeon from 'components/WealthDungeon';

type FooterAPIResponse = NonNullable<typeof import('pages/api/images/footer').default['Response']>['body'];

const Footer = () => {
	const footer: FooterAPIResponse | undefined = useSWR('/api/images/footer').data;

	return (
		<>
			<footer>
				<div className="mspface-container">
					{footer && (
						<style jsx global>
							{`
								footer .mspface {
									background-image: url(/images/footers/${footer.name});
								}
							`}
						</style>
					)}
					<div className="mspface left" />
					<WealthDungeon />
					<div className="mspface right" />
				</div>
				<div id="legal" className="mid">
					<div id="copyright">
						{`MS Paint Fan Adventures © 2010-${new Date().getFullYear()}`}
					</div>
					<Stick />
					<div id="boring-important-stuff">
						<Link href="/privacy" target="_blank">Privacy Policy</Link>
						<Stick nix />
						<Link href="/terms" target="_blank">Terms of Service</Link>
						<Stick />
						<Link href="/rules" target="_blank">Rules</Link>
					</div>
				</div>
			</footer>
		</>
	);
};

export default Footer;