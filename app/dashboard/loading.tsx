export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full border-2 border-core-green/20 border-t-core-green animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-core-green animate-pulse" />
          </div>
        </div>
        <p className="text-[11px] text-core-text-muted font-mono tracking-wider">LOADING</p>
      </div>
    </div>
  )
}
