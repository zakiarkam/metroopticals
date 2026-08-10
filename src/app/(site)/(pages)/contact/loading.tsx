const Loading = () => {
  return (
    <main className="min-h-screen bg-gray-2">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
        <div className="h-10 w-64 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-4 w-2/3 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-72 w-full rounded-3xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-48 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-48 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>
    </main>
  );
};

export default Loading;
