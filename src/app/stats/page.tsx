import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
            <Image
              src="/icons/android-chrome-192x192.png"
              alt="Jagadoku"
              width={48}
              height={48}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">Jagadoku</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Asisten Finansial AI
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300">
          Kelola keuanganmu dengan lebih pintar
        </p>

        <div className="flex flex-col gap-3">
          <Link 
            href="/login"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-8 rounded-xl transition-all"
          >
            Masuk dengan Google
          </Link>
        </div>
      </div>
    </div>
  );
}