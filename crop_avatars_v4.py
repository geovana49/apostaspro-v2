from PIL import Image, ImageChops, ImageFilter
import os
import collections

base_path = r"C:\Users\ADM\Desktop\Apostas Pro"
artifact_path = r"C:\Users\ADM\.gemini\antigravity\brain\8b9a37ae-1759-440f-856e-7b4adf3ff75c"
output_dir = os.path.join(base_path, "public", "assets", "avatars")

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

def get_islands(filename):
    img = Image.open(os.path.join(artifact_path, filename)).convert("RGB")
    w, h = img.size
    bg_color = img.getpixel((0, 0))
    
    # Create mask: 255 if different from BG, 0 otherwise
    mask = Image.new("L", (w, h), 0)
    for x in range(w):
        for y in range(h):
            p = img.getpixel((x, y))
            dist = sum((p[i] - bg_color[i])**2 for i in range(3))**0.5
            if dist > 30: # Threshold
                mask.putpixel((x, y), 255)
    
    # Simple BFS to find islands
    visited = set()
    islands = []
    
    for y in range(h):
        for x in range(w):
            if mask.getpixel((x, y)) == 255 and (x, y) not in visited:
                # Found a new island, start BFS
                q = collections.deque([(x, y)])
                visited.add((x, y))
                min_x, min_y, max_x, max_y = x, y, x, y
                
                while q:
                    cx, cy = q.popleft()
                    min_x, min_y = min(min_x, cx), min(min_y, cy)
                    max_x, max_y = max(max_x, cx), max(max_y, cy)
                    
                    for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            if mask.getpixel((nx, ny)) == 255 and (nx, ny) not in visited:
                                visited.add((nx, ny))
                                q.append((nx, ny))
                
                # Check if island size is reasonable (e.g., > 40px)
                iw, ih = max_x - min_x, max_y - min_y
                if iw > 40 and ih > 40:
                    islands.append((min_x, min_y, max_x, max_y))
    
    # Sort islands: top-to-bottom, then left-to-right
    # Using a small threshold for Y to group rows
    islands.sort(key=lambda b: (b[1] // 50, b[0]))
    return img, islands

# Clear previous
for f in os.listdir(output_dir):
    if f.endswith(".png"):
        os.remove(os.path.join(output_dir, f))

curr = 1
for sheet in ["media__1774729582812.jpg", "media__1774729590862.jpg", "media__1774729599483.jpg"]:
    print(f"Processando {sheet}...")
    img, bboxes = get_islands(sheet)
    for bx1, by1, bx2, by2 in bboxes:
        # Crop the island
        # Add a tiny padding to capture the whole square cleanly
        pad = 2
        crop = img.crop((max(0, bx1-pad), max(0, by1-pad), min(img.size[0], bx2+pad), min(img.size[1], by2+pad)))
        
        # Consistent 200x200 square with transparency
        # Actually, let's make it a solid centered square to avoid "floating"
        final = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
        
        # Resize the crop while maintaining aspect ratio, or just fill center
        # Since the source is roughly square, we can just center it.
        cw, ch = crop.size
        ratio = min(180/cw, 180/ch) # Max 180px inside 200px
        new_size = (int(cw * ratio), int(ch * ratio))
        crop_resized = crop.resize(new_size, Image.Resampling.LANCZOS)
        
        # Paste in center
        final.paste(crop_resized, ((200 - new_size[0]) // 2, (200 - new_size[1]) // 2))
        final.save(os.path.join(output_dir, f"suggested_{curr}.png"))
        curr += 1

# Single ones
for f in ["media__1774729608080.jpg", "media__1774729615771.jpg"]:
    img = Image.open(os.path.join(artifact_path, f)).convert("RGBA")
    # Just fit it in 200x200
    final = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    cw, ch = img.size
    ratio = min(180/cw, 180/ch)
    new_size = (int(cw * ratio), int(ch * ratio))
    img_resized = img.resize(new_size, Image.Resampling.LANCZOS)
    final.paste(img_resized, ((200 - new_size[0]) // 2, (200 - new_size[1]) // 2))
    final.save(os.path.join(output_dir, f"suggested_{curr}.png"))
    curr += 1

print(f"Sucesso! {curr-1} avatares extraídos e centralizados via V4.")
