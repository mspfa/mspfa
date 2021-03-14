import Header from 'components/Header';
import type { ReactNode } from 'react';
import Footer from 'components/Footer';
import Dialogs from 'components/Dialog/Dialogs';
import './styles.module.scss';

export type PageProps = { children: ReactNode };

const Page = ({ children }: PageProps) => (
	<>
		<div id="page">
			<Header />
			<main>
				{children}
			</main>
			<Footer />
		</div>
		<Dialogs />
	</>
);

export default Page;