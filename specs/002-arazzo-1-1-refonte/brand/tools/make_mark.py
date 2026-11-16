"""Arazzo mark: 3 blue warp threads x 3 orange weft threads woven over/under on a slate tile."""
# Usage: python3 brand/tools/make_mark.py brand/arazzo-mark.svg
import sys
TILE, BLUE, BLUE_L, ORANGE, ORANGE_L = "#0f172a", "#2563eb", "#60a5fa", "#f97316", "#fdba74"
C = [16, 32, 48]   # thread centres
W = 8              # thread width
G = 1.6            # gap drawn in tile colour
LO, HI = 8, 56    # thread extent
h = W / 2
o = []
o.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-labelledby="t">')
o.append('  <title id="t">Arazzo mark — ConnEthics</title>')
o.append('  <!-- Motif de tapisserie : chaîne bleue ConnEthics (#2563eb) x trame orange (#f97316), tissage 1/1. -->')
o.append(f'  <rect width="64" height="64" rx="14" fill="{TILE}"/>')
# warp (vertical, blue)
for x in C:
    o.append(f'  <rect x="{x-h}" y="{LO}" width="{W}" height="{HI-LO}" rx="{h}" fill="{BLUE}"/>')
# weft (horizontal, orange)
for y in C:
    o.append(f'  <rect x="{LO}" y="{y-h}" width="{HI-LO}" height="{W}" rx="{h}" fill="{ORANGE}"/>')
# crossings
for i, y in enumerate(C):
    for j, x in enumerate(C):
        if (i + j) % 2 == 0:
            # weft over warp: cut gaps into the blue just outside the orange band
            o.append(f'  <rect x="{x-h}" y="{y-h-G}" width="{W}" height="{G}" fill="{TILE}"/>')
            o.append(f'  <rect x="{x-h}" y="{y+h}" width="{W}" height="{G}" fill="{TILE}"/>')
        else:
            # warp over weft: cut gaps into the orange, then redraw the blue on top
            o.append(f'  <rect x="{x-h-G}" y="{y-h}" width="{G}" height="{W}" fill="{TILE}"/>')
            o.append(f'  <rect x="{x+h}" y="{y-h}" width="{G}" height="{W}" fill="{TILE}"/>')
            o.append(f'  <rect x="{x-h}" y="{y-h}" width="{W}" height="{W}" fill="{BLUE}"/>')
o.append('</svg>')
open(sys.argv[1], "w").write("\n".join(o) + "\n")
