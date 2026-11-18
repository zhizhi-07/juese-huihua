pal({ g: '#a9b7ba', b: '#d8dfde', h: '#e5e9e5', s: '#c6d0d0' })
sprite('_单砖', { w: 8, h: 8 },
  rect(0, 0, 8, 8, 'b'),
  hline(0, 0, 8, 'g'), vline(0, 1, 7, 'g'),
  hline(1, 1, 6, 'h'), vline(1, 2, 4, 'h'),
  hline(1, 7, 7, 's'), vline(7, 1, 6, 's'))
sprite('浅灰石砖_四块拼接_16x16', { w: 16, h: 16 },
  stamp('_单砖', 0, 0), stamp('_单砖', 8, 0),
  stamp('_单砖', 0, 8), stamp('_单砖', 8, 8))
