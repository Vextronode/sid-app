import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#A8D5A2] flex items-center justify-center font-sans p-4">
      <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl w-full max-w-sm text-center">
        {/* headear */}
        <div className="mb-8">
          <div className="text-sm font-bold mb-4">logo</div>
          <h2 className="text-xl font-bold mb-1 text-gray-800">
            Masuk ke CID Cibenda
          </h2>
          <p className="text-xs text-gray-500 m-0">
            Masukan NIK dan password anda
          </p>
        </div>

        {/* render komopnen form */}
        <LoginForm />

        <div className="mt-6 text-xs text-gray-500">
          <p>
            belum punya akun?{" "}
            <a
              href="/register"
              className="text-[#4CAF4F] font-bold no-underline hover:underline"
            >
              daftar
            </a>
          </p>
          <p className="mt-2">
            <a href="/" className="text-[#4CAF4F] no-underline hover:underline">
              Kembali ke halaman Publik
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
