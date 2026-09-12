import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '0n Ecosystem Map — Interactive Architecture',
  description: 'Interactive system-wide architecture and module visualization of the 0ncore / 0nMCP platform.',
}

export default function EcosystemPage() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0a0a0f] relative">
      <iframe
        src="/ecosystem-map.html"
        className="w-full h-full border-0 block"
        title="0n Ecosystem Map"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}
