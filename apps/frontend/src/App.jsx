import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <div className="p-10 text-center">
              <h1>dummy route buat guest mode</h1>
              <a href="/login" className="text-blue-500 underline">
                Ke Halaman Login
              </a>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
