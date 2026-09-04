# Scratch. Checks whether a font actually covers the statement's characters.
import string
from fontTools.ttLib import TTFont

SENTENCE = 'Anyone can write this sentence. Look what happens when I set it.'

FONTS = [
    'public/Fonts/monare/monare.woff2',
    'public/Fonts/ark-es/ark-es-solidregular.woff',
    'public/Fonts/ark-es/ark-es-solidbold.woff',
    'public/Fonts/ark-es/ark-es-solidlight.woff',
    'public/Fonts/ark-es/ark-es-denseregular.woff',
    'public/Fonts/ark-es/ark-es-densebold.woff',
]

for path in FONTS:
    try:
        font = TTFont(path, fontNumber=0)
    except Exception as exc:
        print('ERROR', path, exc)
        continue

    codes = set()
    for table in font['cmap'].tables:
        codes.update(table.cmap.keys())
    chars = {chr(c) for c in codes}

    lower = sum(1 for c in string.ascii_lowercase if c in chars)
    upper = sum(1 for c in string.ascii_uppercase if c in chars)
    missing = sorted(set(SENTENCE) - chars)

    print(path)
    print('   glyphs=%d  lowercase=%d/26  uppercase=%d/26' % (len(codes), lower, upper))
    print('   missing from sentence: %r' % (missing,))
