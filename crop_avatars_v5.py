from PIL import Image, ImageChops, ImageFilter
import os
import collections

base_path = r"C:\Users\ADM\Desktop\Apostas Pro"
artifact_path = r"C:\Users\ADM\.gemini\antigravity\brain\8b9a37ae-1759-440f-856e-7b4adf3ff75c"
output_dir = os.path.join(base_path, "public", "assets", "avatars")

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

def get_islands(filename, expected_cols, expected_rows):
    img = Image.open(os.path.join(artifact_path, filename)).convert("RGB")
    w, h = img.size
    bg_color = img.getpixel((0, 0))
    
    # Masking with higher threshold and a bit of "closing"
    mask = Image.new("L", (w, h), 0)
    for x in range(w):
        for y in range(h):
            p = img.getpixel((x, y))
            # Distance in RGB space
            dist = sum((p[i] - bg_color[i])**2 for i in range(3))**0.5
            if dist > 45: # Increased threshold
                mask.putpixel((x, y), 255)
    
    # Remove noise by dilating then eroding (actually let's just use grid logic)
    # The BFS approach is good if they are separated.
    # Let's ensure they are separated by ignoring thin lines.
    
    visited = set()
    islands = []
    
    for y in range(h):
        for x in range(w):
            if mask.getpixel((x, y)) == 255 and (x, y) not in visited:
                q = collections.deque([(x, y)])
                visited.add((x, y))
                min_x, min_y, max_x, max_y = x, y, x, y
                
                while q:
                    cx, cy = q.popleft()
                    min_x, min_y = min(min_x, cx), min(min_y, cy)
                    max_x, max_y = max(max_x, cx), max(max_y, cy)
                    
                    # 4-connectivity
                    for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h:
                                if mask.getpixel((nx, ny)) == 255 and (nx, ny) not in visited:
                                    visited.add((nx, ny))
                                    q.append((nx, ny))
                
                iw, ih = max_x - min_x, max_y - min_y
                # If it's too big, it might be multiple. Let's try to split or ignore.
                if 40 < iw < 300 and 40 < ih < 300:
                    islands.append((min_x, min_y, max_x, max_y))
                elif iw > 300 or ih > 300:
                    print(f"Warning: large island at {min_x},{min_y} size {iw}x{ih}")
    
    # Sort with a more robust row grouping (using the average height of an island)
    if islands:
        avg_h = sum(b[3]-b[1] for b in islands) / len(islands)
        row_step = avg_h * 1.2
        islands.sort(key=lambda b: (b[1] // row_step, b[0]))
    
    return img, islands

# Clear previous
for f in os.listdir(output_dir):
    if f.endswith(".png"):
        os.remove(os.path.join(output_dir, f))

curr = 1
# Sheets with expected grid (just for reference in prints)
sheets = [
    ("media__1774729582812.jpg", 5, 3), 
    ("media__1774729590862.jpg", 8, 4), 
    ("media__1774729599483.jpg", 8, 4)
]

for sheet, cols, rows in sheets:
    print(f"Processando {sheet}...")
    img, bboxes = get_islands(sheet, cols, rows)
    print(f"Encontrados {len(bboxes)} ícones.")
    for bx1, by1, bx2, by2 in bboxes:
        crop = img.crop((max(0, bx1-2), max(0, by1-2), min(img.size[0], bx2+2), min(img.size[1], by2+2)))
        final = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
        cw, ch = crop.size
        ratio = min(190/cw, 190/ch)
        new_size = (int(cw * ratio), int(ch * ratio))
        crop_resized = crop.resize(new_size, Image.Resampling.LANCZOS)
        final.paste(crop_resized, ((200 - new_size[0]) // 2, (200 - new_size[1]) // 2))
        final.save(os.path.join(output_dir, f"suggested_{curr}.png"))
        curr += 1

# Single ones
for f in ["media__1774729608080.jpg", "media__1774729615771.jpg"]:
    img = Image.open(os.path.join(artifact_path, f)).convert("RGBA")
    final = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    cw, ch = img.size
    ratio = min(190/cw, 190/ch)
    new_size = (int(cw * ratio), int(ch * ratio))
    img_resized = img.resize(new_size, Image.Resampling.LANCZOS)
    final.paste(img_resized, ((200 - new_size[0]) // 2, (200 - new_size[1]) // 2))
    final.save(os.path.join(output_dir, f"suggested_{curr}.png"))
    curr += 1

print(f"Sucesso! {curr-1} avatares extraídos e centralizados via V5.")
