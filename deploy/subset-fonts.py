"""Optional design build: pip install fonttools brotli; use installed Noto CJK.

The committed WOFF2 subsets make landing typography independent of OS fonts.
Regenerate whenever the landing copy changes. No runtime dependency on Python.
"""
from pathlib import Path
from fontTools.ttLib import TTCollection
from fontTools import subset

root = Path(__file__).resolve().parents[1]
source = (root/'frontend/src/Landing.tsx').read_text() + (root/'frontend/src/components/Brand.tsx').read_text()
text = ''.join(chr(n) for n in range(32,127)) + ''.join(set(source))
fonts = Path('/fonts') if Path('/fonts').exists() else Path('/usr/share/fonts/opentype/noto')
target = root/'frontend/public/fonts'
target.mkdir(parents=True, exist_ok=True)
for original, name in [('NotoSerifCJK-Regular.ttc','qiudao-serif-regular'),('NotoSerifCJK-Bold.ttc','qiudao-serif-bold'),('NotoSansCJK-Regular.ttc','qiudao-sans-regular')]:
    collection = TTCollection(fonts/original)
    font = next(f for f in collection.fonts if any('SC' in n.toUnicode() for n in f['name'].names if n.nameID == 1))
    options = subset.Options()
    options.flavor = 'woff2'
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    font.flavor = 'woff2'
    font.save(target/(name+'.woff2'))
    print(name, (target/(name+'.woff2')).stat().st_size)
