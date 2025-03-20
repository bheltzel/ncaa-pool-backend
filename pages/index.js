import Head from 'next/head'
import SquarePool from "../components/SquarePool";

export default function Home() {
  return (
    <>
      <Head>
          <title>March Madness Blocks 2025</title>
      </Head>
      <div>
        <h1 className="text-3xl font-bold text-center my-4">March Madness Blocks 2025</h1>
        <SquarePool />
      </div>
    </>
  );
}