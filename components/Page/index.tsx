import Header from '../Header';
import type { HeaderProps } from '../Header';
import Footer from '../Footer';
import './styles.module.scss';

export type PageProps = React.PropsWithChildren<HeaderProps>;

const Page = (props: PageProps) => (
	<div id="page">
		<Header noFlashyTitle={props.noFlashyTitle} />
		<main>
			{props.children}
		</main>
		<Footer />
	</div>
);

export default Page;