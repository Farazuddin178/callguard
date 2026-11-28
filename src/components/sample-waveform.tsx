// Peak envelope decoded from public/samples/en-bank.mp3 in 79 equal PCM windows.
const heights = [
  73, 77, 53, 14, 10, 48, 84, 62, 86, 41, 74, 62, 67, 59, 59, 75,
  67, 30, 66, 52, 34, 3, 41, 72, 66, 62, 84, 53, 82, 67, 71, 87,
  3, 3, 3, 19, 64, 75, 60, 67, 55, 34, 62, 58, 62, 54, 55, 63,
  64, 67, 3, 3, 3, 76, 78, 30, 3, 34, 98, 67, 100, 76, 65, 82,
  18, 3, 99, 68, 64, 67, 69, 41, 84, 62, 62, 73, 67, 64, 3,
]

const waveform = heights.map((height, index) => {
  const x = index * 4 + 2
  return `M${x} ${50 - height / 2}v${height}`
}).join(' ')

export function SampleWaveform() {
  return <svg className="sample-waveform" viewBox="0 -2 316 104" aria-hidden="true" focusable="false">
    <path d={waveform} stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
  </svg>
}
