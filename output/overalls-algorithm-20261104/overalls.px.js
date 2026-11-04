pal({ b: '#7295BE', d: '#526B95', l: '#9CB6D6', y: '#ECCF8D' });
// Only the three idle first-frame views are drawn; the other cels are generated.
sprite('down', { w: 19, h: 19 }, grid(7, 12, 'b...b\nybbby\nbblbb\nbbdbb\ndd.dd'));
sprite('up', { w: 19, h: 19 }, grid(7, 12, 'b...b\n.b.b.\nbbbbb\nbbdbb\ndd.dd'));
sprite('side', { w: 19, h: 19 }, grid(7, 12, '.b...\nybb..\nbbbbd\nbbbdd\nbb.dd'));
