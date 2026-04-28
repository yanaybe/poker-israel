export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-poker-bg felt-bg flex flex-col items-center justify-center px-4 py-12">
      {/* Decorative suits */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <span className="absolute top-10 right-[5%] text-9xl opacity-5 suit-black rotate-12">♠</span>
        <span className="absolute top-20 left-[8%] text-8xl opacity-5 suit-red -rotate-6">♥</span>
        <span className="absolute bottom-10 right-[10%] text-7xl opacity-5 suit-red rotate-6">♦</span>
        <span className="absolute bottom-20 left-[5%] text-9xl opacity-5 suit-black -rotate-12">♣</span>
      </div>
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  )
}
