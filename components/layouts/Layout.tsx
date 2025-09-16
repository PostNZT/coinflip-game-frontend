import ShaderBackground from "../ShaderBackground";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ShaderBackground>
      <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="relative rounded-2xl p-5 sm:p-6 md:p-8 backdrop-blur-lg bg-white/10 border border-white/40 w-full max-w-md">
          <div className="bg-white rounded-lg p-6 sm:p-8 w-full text-center">
            <div className="space-y-4">{children}</div>
          </div>
        </div>
      </main>
    </ShaderBackground>
  );
}
