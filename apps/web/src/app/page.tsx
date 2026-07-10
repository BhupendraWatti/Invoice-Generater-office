import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <h1 className="text-display-sm font-bold text-primary">DocFlow Workspace Studio</h1>
      <p className="text-body-md text-secondary">A Utility-Minimalism Document Flow Ecosystem</p>
      <div className="flex gap-4 mt-4">
        <Link
          href="/login"
          className="bg-primary text-on-primary font-medium px-4 py-2 rounded-md hover:bg-primary-fixed-variant transition-colors"
        >
          Login to Workspace
        </Link>
      </div>
    </div>
  );
}
