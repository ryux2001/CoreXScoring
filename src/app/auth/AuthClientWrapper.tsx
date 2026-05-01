"use client";

import { useState } from "react";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";

export default function AuthClientWrapper() {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <>
      {/* Botones superiores de cambio (Como en image_8.png) */}
      <div className="flex border border-white/10 rounded-xl overflow-hidden mb-8">
        <button
          onClick={() => setShowLogin(true)}
          className={`flex-1 text-center py-4 text-sm font-semibold transition-colors border-t-4 ${
            showLogin
              ? "border-white bg-zinc-900 text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Iniciar Sesion
        </button>
        <div className="w-px bg-white/10"></div>
        <button
          onClick={() => setShowLogin(false)}
          className={`flex-1 text-center py-4 text-sm font-semibold transition-colors border-t-4 ${
            !showLogin
              ? "border-white bg-zinc-900 text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Registrarse
        </button>
      </div>

      {/* Contenedor de formulario con animación */}
      <div className="relative">
        <div
          className={`transition-all duration-300 ${
            showLogin ? "opacity-100 translate-y-0" : "absolute inset-0 opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          <LoginForm />
        </div>
        <div
          className={`transition-all duration-300 ${
            !showLogin ? "opacity-100 translate-y-0" : "absolute inset-0 opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          <RegisterForm />
        </div>
      </div>
    </>
  );
}