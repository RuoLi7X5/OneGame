import sys
from PIL import Image, ImageFilter

def clamp(v, lo, hi):
    return lo if v < lo else hi if v > hi else v

def remove_bg(inp, outp):
    img = Image.open(inp).convert('RGBA')
    w, h = img.size
    px = img.load()
    mask = Image.new('L', (w, h), 0)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                mp[x, y] = 255
                continue
            rf = r / 255.0
            gf = g / 255.0
            bf = b / 255.0
            v = max(rf, gf, bf)
            m = min(rf, gf, bf)
            s = 0.0 if v == 0.0 else (v - m) / v
            vscore = clamp((v - 0.95) / 0.05, 0.0, 1.0)
            sscore = clamp((0.10 - s) / 0.10, 0.0, 1.0)
            wscore = vscore * sscore
            mp[x, y] = int(255 * wscore)
    mask = mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.BoxBlur(1))
    alpha = Image.new('L', (w, h), 255)
    ap = alpha.load()
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            ap[x, y] = 255 - mp[x, y]
    out = img.copy()
    out.putalpha(alpha)
    out.save(outp, format='PNG')

def main():
    if len(sys.argv) < 3:
        print('usage: python scripts/remove_white_bg.py <input.png> <output.png>')
        sys.exit(2)
    remove_bg(sys.argv[1], sys.argv[2])

if __name__ == '__main__':
    main()

