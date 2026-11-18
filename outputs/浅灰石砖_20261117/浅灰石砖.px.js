pal({ g: '#a9b7ba', b: '#d8dfde', h: '#e5e9e5', s: '#c6d0d0' })

// Only the top and left carry grout, so repetition never doubles the seam.
sprite('浅灰石砖_16x16', { w: 16, h: 16 },
  rect(0, 0, 16, 16, 'b'),
  hline(0, 0, 16, 'g'), vline(0, 1, 15, 'g'),
  hline(1, 1, 14, 'h'), vline(1, 2, 12, 'h'),
  hline(1, 15, 15, 's'), vline(15, 1, 14, 's'))
