import Head from 'next/head';
import styles from '../styles/Home.module.scss';
const Component = () => (
	<div className={styles.container}>
		<Head>
			<title>MSPFA</title>
			<link rel="icon" href="/favicon.ico" />
		</Head>
		<main className={styles.main}>
			main
		</main>
		<footer className={styles.footer}>
			footer
		</footer>
	</div>
);
const div = (
	<div className="test" style={{
		color: 'red'
	}}>
		{ Math.random() < 0.5
	&& 'hello' } test
		<div /> <div/>
	</div>
);
export default Component;