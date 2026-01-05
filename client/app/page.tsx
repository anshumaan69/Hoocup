import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
      <main className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
          Hoocup
        </h1>
        <p className="max-w-md text-xl text-zinc-400">
          Connect, Share, and Engage. Join existing communities or build your own.
        </p>
        
        <div className="flex gap-4 mt-8">
          <Link 
            href="/login" 
            className="rounded-full bg-blue-600 px-8 py-3 text-lg font-semibold text-white transition hover:bg-blue-700"
          >
            Login
          </Link>
          <Link 
            href="/signup" 
            className="rounded-full border border-zinc-700 bg-zinc-900 px-8 py-3 text-lg font-semibold text-white transition hover:bg-zinc-800 hover:border-zinc-600"
          >
            Sign Up
          </Link>
        </div>
      </main>
    </div>
  );
}
